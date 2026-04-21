const express = require('express');
const { nanoid } = require('nanoid');
const { all, get, run } = require('../db/sqlite');
const { npcFallback, favorabilityDeltaByMessage, stageFromFavorability } = require('../services/fallbackService');
const { progressTask, unlockAchievement } = require('../services/progressService');

const router = express.Router();

router.get('/list', async (req, res) => {
  const { characterId } = req.query;
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const rows = await all(
      `SELECT n.id, n.name, n.role_type, n.personality, r.favorability, r.relationship_stage
       FROM npcs n
       LEFT JOIN npc_relations r ON r.npc_id = n.id AND r.character_id = ?
       WHERE n.unlocked = 1
       ORDER BY n.role_type, n.name`,
      [characterId]
    );
    return res.json({ code: 200, message: 'ok', data: rows });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

router.post('/chat', async (req, res) => {
  const { characterId, npcId, message } = req.body || {};
  if (!characterId || !npcId || !message) {
    return res.status(400).json({ code: 400, message: 'characterId npcId message required', data: null });
  }
  try {
    const row = await get(`SELECT * FROM npc_relations WHERE character_id = ? AND npc_id = ?`, [characterId, npcId]);
    const base = row || {
      id: nanoid(),
      character_id: characterId,
      npc_id: npcId,
      favorability: 0,
      relationship_stage: 'stranger',
    };

    const delta = favorabilityDeltaByMessage(message);
    const nextFavorability = Math.max(-100, Math.min(100, Number(base.favorability || 0) + delta));
    const nextStage = stageFromFavorability(nextFavorability);
    const now = new Date().toISOString();
    const fallback = npcFallback(nextStage);

    if (row) {
      await run(`UPDATE npc_relations SET favorability = ?, relationship_stage = ?, updated_at = ? WHERE id = ?`, [
        nextFavorability,
        nextStage,
        now,
        base.id,
      ]);
    } else {
      await run(
        `INSERT INTO npc_relations (id, character_id, npc_id, favorability, relationship_stage, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [base.id, characterId, npcId, nextFavorability, nextStage, now]
      );
    }

    const expireAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await run(
      `INSERT INTO npc_memories (id, character_id, npc_id, memory_text, weight, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nanoid(), characterId, npcId, String(message).slice(0, 120), 1, expireAt, now]
    );

    await progressTask(characterId, 'chat_once', 1);
    if (nextFavorability >= 80) {
      await unlockAchievement(characterId, 'best_friend');
      await unlockAchievement(characterId, 'social_star');
    }

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        npcResponse: fallback.npc_response,
        favorabilityChange: delta,
        relationStage: nextStage,
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'save relation error', data: null });
  }
});

router.post('/gift', async (req, res) => {
  const { characterId, npcId, itemId } = req.body || {};
  if (!characterId || !npcId || !itemId) {
    return res.status(400).json({ code: 400, message: 'characterId npcId itemId required', data: null });
  }
  try {
    const item = await get(`SELECT * FROM inventory_items WHERE id = ? AND character_id = ?`, [itemId, characterId]);
    if (!item || Number(item.qty || 0) <= 0) {
      return res.status(400).json({ code: 400, message: 'item not available', data: null });
    }

    const relation = await get(`SELECT * FROM npc_relations WHERE character_id = ? AND npc_id = ?`, [characterId, npcId]);
    const baseFavor = Number(relation?.favorability || 0);
    const nextFavorability = Math.max(-100, Math.min(100, baseFavor + 5));
    const nextStage = stageFromFavorability(nextFavorability);
    const now = new Date().toISOString();

    await run(`UPDATE inventory_items SET qty = ?, updated_at = ? WHERE id = ?`, [Number(item.qty) - 1, now, itemId]);
    if (relation) {
      await run(`UPDATE npc_relations SET favorability = ?, relationship_stage = ?, updated_at = ? WHERE id = ?`, [
        nextFavorability,
        nextStage,
        now,
        relation.id,
      ]);
    } else {
      await run(
        `INSERT INTO npc_relations (id, character_id, npc_id, favorability, relationship_stage, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [nanoid(), characterId, npcId, nextFavorability, nextStage, now]
      );
    }

    if (nextFavorability >= 80) {
      await unlockAchievement(characterId, 'best_friend');
    }

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        favorabilityChange: 5,
        npcFeedback: '谢谢你，这份礼物我很喜欢。',
        relationStage: nextStage,
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

router.post('/repair', async (req, res) => {
  const { characterId, npcId, method } = req.body || {};
  if (!characterId || !npcId || !method) {
    return res.status(400).json({ code: 400, message: 'characterId npcId method required', data: null });
  }
  try {
    const relation = await get(`SELECT * FROM npc_relations WHERE character_id = ? AND npc_id = ?`, [characterId, npcId]);
    if (!relation) {
      return res.status(400).json({ code: 400, message: 'relation not found', data: null });
    }

    const methodDelta = {
      apology: 6,
      help: 8,
      talk: 4,
    };
    const delta = methodDelta[method] || 3;
    const nextFavorability = Math.max(-100, Math.min(100, Number(relation.favorability || 0) + delta));
    const nextStage = stageFromFavorability(nextFavorability);
    await run(`UPDATE npc_relations SET favorability = ?, relationship_stage = ?, updated_at = ? WHERE id = ?`, [
      nextFavorability,
      nextStage,
      new Date().toISOString(),
      relation.id,
    ]);

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        method,
        favorabilityChange: delta,
        relationStage: nextStage,
        feedback: '关系修复有进展，对方愿意重新沟通。',
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

module.exports = router;
