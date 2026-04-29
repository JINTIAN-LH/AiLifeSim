const express = require('express');
const { nanoid } = require('nanoid');
const { get, all, run } = require('../db/sqlite');
const { ensureDailyTasks, processDailyLogin } = require('../services/progressService');
const { BABY_STATS, applyFamilyBackground, FAMILY_BACKGROUNDS } = require('../services/lifeStageService');

const router = express.Router();

const STARTER_ITEMS = [
  { item_code: 'med_001', item_name: '基础药品', item_type: 'consumable', qty: 1 },
  { item_code: 'gift_001', item_name: '小礼物', item_type: 'social', qty: 1 },
  { item_code: 'book_001', item_name: '入门手册', item_type: 'skill', qty: 1 },
];

const DAILY_TASKS = [
  { task_code: 'chat_once', target: 1 },
  { task_code: 'work_once', target: 1 },
  { task_code: 'use_item_once', target: 1 },
];

const BASE_NPCS = ['coworker_01', 'friend_01', 'neighbor_01'];

async function bootstrapCharacter(id, now) {
  for (const item of STARTER_ITEMS) {
    await run(
      `INSERT INTO inventory_items (id, character_id, item_code, item_name, item_type, qty, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nanoid(), id, item.item_code, item.item_name, item.item_type, item.qty, now, now]
    );
  }

  const dateKey = now.slice(0, 10);
  for (const task of DAILY_TASKS) {
    await run(
      `INSERT INTO daily_tasks (id, character_id, task_code, progress, target, status, date_key) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nanoid(), id, task.task_code, 0, task.target, 'todo', dateKey]
    );
  }

  for (const npcId of BASE_NPCS) {
    await run(
      `INSERT INTO npc_relations (id, character_id, npc_id, favorability, relationship_stage, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [nanoid(), id, npcId, 0, 'stranger', now]
    );
  }
}

function calcEndingType(stats) {
  const score = Number(stats.money || 0) + Number(stats.mood || 0) * 30 + Number(stats.health || 0) * 30;
  if (score >= 9000) return { type: '圆满结局', score };
  if (score >= 5000) return { type: '普通结局', score };
  return { type: '遗憾结局', score };
}

function endingTextByType(type, name) {
  if (type === '圆满结局') return `${name}在事业和关系中都收获了稳定与满足，晚年平和而丰盛。`;
  if (type === '普通结局') return `${name}的一生有起有落，虽有遗憾，但也留下了值得回味的瞬间。`;
  return `${name}经历了许多波折，留下未竟心愿，等待下一次人生重启。`;
}

router.post('/create', async (req, res) => {
  const { name, gender, avatar, personality, familyBackground } = req.body || {};
  if (!name) {
    return res.status(400).json({ code: 400, message: 'name required', data: null });
  }
  try {
    const id = nanoid();
    const now = new Date().toISOString();
    const bgKey = familyBackground || 'ordinary';
    const birthSeason = ['spring', 'summer', 'autumn', 'winter'][Math.floor(Math.random() * 4)];

    let stats = applyFamilyBackground(BABY_STATS, bgKey);

    await run(
      `INSERT INTO characters (id, name, gender, avatar, personality,
        mood, health, stress, money, charm, intelligence,
        job, job_level, age, quarters_lived, life_stage, is_alive,
        birth_season, generation,
        peak_mood, peak_health, peak_money, peak_intelligence, peak_charm,
        created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, gender || '', avatar || '', personality || '',
        stats.mood, stats.health, stats.stress, stats.money, stats.charm, stats.intelligence,
        'unemployed', 'entry', 0, 0, '婴幼儿期', 1,
        birthSeason, 1,
        stats.mood, stats.health, stats.money, stats.intelligence, stats.charm,
        now, now,
      ]
    );

    await bootstrapCharacter(id, now);

    // Create initial quarter log (birth)
    await run(
      `INSERT INTO quarter_logs (id, character_id, quarter_number, age_years, life_stage, mood, health, stress, money, charm, intelligence, job, job_level, event_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nanoid(), id, 0, 0, '婴幼儿期', stats.mood, stats.health, stats.stress, stats.money, stats.charm, stats.intelligence,
        'unemployed', 'entry', `${name}诞生了，一个崭新的生命来到了这个世界。`, now]
    );

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        characterId: id,
        initialStatus: stats,
        familyBackground: FAMILY_BACKGROUNDS[bgKey] ? FAMILY_BACKGROUNDS[bgKey].name : '普通家庭',
        birthSeason,
        age: 0,
      },
    });
  } catch (err) {
    console.error('[character/create]', err);
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

router.get('/status', async (req, res) => {
  const { characterId } = req.query;
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const character = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!character) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    await ensureDailyTasks(characterId);
    const loginInfo = await processDailyLogin(characterId);

    const refreshedCharacter = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);

    const inventory = await all(`SELECT id, item_code, item_name, item_type, qty FROM inventory_items WHERE character_id = ?`, [characterId]);
    const tasks = await all(
      `SELECT id, task_code, progress, target, status, date_key FROM daily_tasks WHERE character_id = ? AND date_key = ? ORDER BY task_code`,
      [characterId, new Date().toISOString().slice(0, 10)]
    );
    const relations = await all(
      `SELECT r.npc_id, r.favorability, r.relationship_stage, n.name, n.role_type
       FROM npc_relations r
       LEFT JOIN npcs n ON n.id = r.npc_id
       WHERE r.character_id = ?
       ORDER BY r.favorability DESC`,
      [characterId]
    );

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        character: refreshedCharacter || character,
        inventory,
        tasks,
        relations,
        loginInfo,
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

router.post('/ending', async (req, res) => {
  const { characterId } = req.body || {};
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const character = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!character) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    const result = calcEndingType(character);
    const text = endingTextByType(result.type, character.name || '你');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO endings (id, character_id, ending_type, ending_text, score, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [nanoid(), characterId, result.type, text, result.score, now]
    );

    await run(`UPDATE characters SET age = 60, updated_at = ? WHERE id = ?`, [now, characterId]);

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        endingType: result.type,
        score: result.score,
        endingText: text,
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

router.post('/restart', async (req, res) => {
  const { characterId, inheritKey } = req.body || {};
  if (!characterId || !inheritKey) {
    return res.status(400).json({ code: 400, message: 'characterId and inheritKey required', data: null });
  }
  try {
    const old = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!old) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    const allowed = ['mood', 'health', 'money', 'charm', 'intelligence'];
    if (!allowed.includes(inheritKey)) {
      return res.status(400).json({ code: 400, message: 'invalid inheritKey', data: null });
    }

    const now = new Date().toISOString();
    const newId = nanoid();
    const bonusMap = {
      mood: 10,
      health: 10,
      money: 500,
      charm: 8,
      intelligence: 8,
    };
    const bonus = bonusMap[inheritKey] || 0;

    const base = {
      mood: 70,
      health: 80,
      stress: 20,
      money: 1000,
      charm: 60,
      intelligence: 60,
    };
    base[inheritKey] = Number(base[inheritKey]) + bonus;

    await run(
      `INSERT INTO characters (id, name, gender, avatar, personality, mood, health, stress, money, charm, intelligence, job, job_level, age, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        `${old.name || '玩家'}·新生`,
        old.gender || '',
        old.avatar || '',
        old.personality || '',
        base.mood,
        base.health,
        base.stress,
        base.money,
        base.charm,
        base.intelligence,
        'unemployed',
        'entry',
        18,
        now,
        now,
      ]
    );

    await bootstrapCharacter(newId, now);

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        newCharacterId: newId,
        inheritKey,
        bonus,
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

router.get('/endings', async (req, res) => {
  const { characterId } = req.query;
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const rows = await all(
      `SELECT ending_type, ending_text, score, created_at FROM endings WHERE character_id = ? ORDER BY created_at DESC LIMIT 20`,
      [characterId]
    );
    return res.json({ code: 200, message: 'ok', data: rows });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

module.exports = router;
