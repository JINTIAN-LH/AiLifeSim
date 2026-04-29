const express = require('express');
const { nanoid } = require('nanoid');
const { get, run } = require('../db/sqlite');
const { chooseEventTypeByStatus, eventFallback } = require('../services/fallbackService');
const { progressTask, unlockAchievement } = require('../services/progressService');
const { ITEM_EFFECTS } = require('../services/eventContentService');

const router = express.Router();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Apply item effect based on item_code
function applyItemEffect(itemCode) {
  const delta = { mood: 0, health: 0, stress: 0, money: 0, charm: 0, intelligence: 0 };
  const effect = ITEM_EFFECTS[itemCode];
  if (effect) {
    Object.assign(delta, effect);
  } else {
    // Default: small mood boost
    delta.mood = 5;
  }
  return delta;
}

// Random item drop after work/social/leisure actions
const WORK_DROPS = [
  { item_code: 'med_001', item_name: '基础药品', item_type: 'consumable', chance: 0.20 },
  { item_code: 'food_001', item_name: '美食券', item_type: 'consumable', chance: 0.18 },
  { item_code: 'book_001', item_name: '入门手册', item_type: 'skill', chance: 0.12 },
  { item_code: 'stress_relief_001', item_name: '减压香薰', item_type: 'consumable', chance: 0.15 },
];

const SOCIAL_DROPS = [
  { item_code: 'gift_001', item_name: '小礼物', item_type: 'social', chance: 0.28 },
  { item_code: 'charm_item_001', item_name: '魅力配饰', item_type: 'social', chance: 0.12 },
  { item_code: 'food_002', item_name: '精致餐券', item_type: 'consumable', chance: 0.18 },
  { item_code: 'stress_relief_001', item_name: '减压香薰', item_type: 'consumable', chance: 0.10 },
];

async function maybeDropItem(characterId, drops) {
  const now = new Date().toISOString();
  for (const drop of drops) {
    if (Math.random() < drop.chance) {
      const existing = await get(`SELECT id, qty FROM inventory_items WHERE character_id = ? AND item_code = ?`, [characterId, drop.item_code]);
      if (existing) {
        await run(`UPDATE inventory_items SET qty = qty + 1, updated_at = ? WHERE id = ?`, [now, existing.id]);
      } else {
        await run(
          `INSERT INTO inventory_items (id, character_id, item_code, item_name, item_type, qty, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [nanoid(), characterId, drop.item_code, drop.item_name, drop.item_type, 1, now, now]
        );
      }
      return drop;
    }
  }
  return null;
}

function applyAction(row, actionType) {
  const next = { ...row };
  switch (actionType) {
    case 'work':
      next.money += 120;
      next.stress = clamp(next.stress + 8, 0, 100);
      break;
    case 'social':
      next.mood = clamp(next.mood + 8, 0, 100);
      next.stress = clamp(next.stress - 5, 0, 100);
      break;
    case 'leisure':
      next.mood = clamp(next.mood + 10, 0, 100);
      next.stress = clamp(next.stress - 8, 0, 100);
      break;
    case 'study':
      next.intelligence += 2;
      next.stress = clamp(next.stress + 4, 0, 100);
      break;
    case 'free':
      next.mood = clamp(next.mood + 3, 0, 100);
      break;
    default:
      break;
  }
  return next;
}

router.post('/do', (req, res) => {
  const { characterId, actionType } = req.body || {};
  if (!characterId || !actionType) {
    return res.status(400).json({ code: 400, message: 'characterId and actionType required', data: null });
  }

  (async () => {
    try {
      const row = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
      if (!row) {
        return res.status(400).json({ code: 400, message: 'character not found', data: null });
      }

      const next = applyAction(row, actionType);
      const now = new Date().toISOString();

      await run(
        `UPDATE characters SET mood = ?, health = ?, stress = ?, money = ?, charm = ?, intelligence = ?, updated_at = ? WHERE id = ?`,
        [next.mood, next.health, next.stress, next.money, next.charm, next.intelligence, now, characterId]
      );

      const taskMap = {
        work: 'work_once',
        social: 'chat_once',
      };
      const taskCode = taskMap[actionType];
      if (taskCode) {
        await progressTask(characterId, taskCode, 1);
      }

      if (actionType === 'work') {
        await unlockAchievement(characterId, 'first_job');
      }

      // Random item drop based on action type
      const drops = actionType === 'work' ? WORK_DROPS : actionType === 'social' ? SOCIAL_DROPS : null;
      const droppedItem = drops ? await maybeDropItem(characterId, drops) : null;

      let triggeredEvent = null;
      if (Math.random() < 0.35 || next.stress >= 70 || next.health <= 35) {
        const type = chooseEventTypeByStatus(next);
        const payload = eventFallback(type);
        const eventId = nanoid();
        await run(
          `INSERT INTO events (id, character_id, event_type, event_text, options_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [eventId, characterId, type, payload.event, JSON.stringify(payload.options), now]
        );
        triggeredEvent = {
          eventId,
          event: payload.event,
          options: payload.options,
        };
      }

      return res.json({
        code: 200,
        message: 'ok',
        data: {
          actionResult: `action ${actionType} done`,
          statusDelta: {
            mood: next.mood - row.mood,
            health: next.health - row.health,
            stress: next.stress - row.stress,
            money: next.money - row.money,
            intelligence: next.intelligence - row.intelligence,
          },
          triggeredEvent,
          droppedItem,
        },
      });
    } catch (err) {
      return res.status(500).json({ code: 500, message: 'db error', data: null });
    }
  })();
});

router.post('/use-item', async (req, res) => {
  const { characterId, itemId } = req.body || {};
  if (!characterId || !itemId) {
    return res.status(400).json({ code: 400, message: 'characterId and itemId required', data: null });
  }

  try {
    const character = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!character) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    const item = await get(`SELECT * FROM inventory_items WHERE id = ? AND character_id = ?`, [itemId, characterId]);
    if (!item || Number(item.qty || 0) <= 0) {
      return res.status(400).json({ code: 400, message: 'item not available', data: null });
    }

    const delta = applyItemEffect(item.item_code);

    const next = {
      mood: clamp(character.mood + delta.mood, 0, 100),
      health: clamp(character.health + delta.health, 0, 100),
      stress: clamp(character.stress + delta.stress, 0, 100),
      money: character.money + delta.money,
      charm: character.charm + delta.charm,
      intelligence: character.intelligence + delta.intelligence,
    };
    const now = new Date().toISOString();

    await run(`UPDATE inventory_items SET qty = ?, updated_at = ? WHERE id = ?`, [Number(item.qty) - 1, now, itemId]);
    await run(
      `UPDATE characters SET mood = ?, health = ?, stress = ?, money = ?, charm = ?, intelligence = ?, updated_at = ? WHERE id = ?`,
      [next.mood, next.health, next.stress, next.money, next.charm, next.intelligence, now, characterId]
    );

    await progressTask(characterId, 'use_item_once', 1);

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        itemId,
        itemName: item.item_name,
        statusDelta: delta,
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

module.exports = router;
