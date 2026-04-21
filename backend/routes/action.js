const express = require('express');
const { nanoid } = require('nanoid');
const { get, run } = require('../db/sqlite');
const { chooseEventTypeByStatus, eventFallback } = require('../services/fallbackService');
const { progressTask, unlockAchievement } = require('../services/progressService');

const router = express.Router();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

    const delta = { mood: 0, health: 0, stress: 0, money: 0, charm: 0, intelligence: 0 };
    if (item.item_code === 'med_001') {
      delta.health = 12;
      delta.stress = -6;
    } else if (item.item_code === 'book_001') {
      delta.intelligence = 3;
      delta.stress = 2;
    } else {
      delta.mood = 5;
    }

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
