const express = require('express');
const { nanoid } = require('nanoid');
const { get, run } = require('../db/sqlite');
const { eventFallback, chooseEventTypeByStatus, clampStatus } = require('../services/fallbackService');

const router = express.Router();

router.get('/random', async (req, res) => {
  const { characterId } = req.query;
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const character = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!character) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }
    const type = chooseEventTypeByStatus(character);
    const payload = eventFallback(type);
    const eventId = nanoid();

    await run(
      `INSERT INTO events (id, character_id, event_type, event_text, options_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [eventId, characterId, type, payload.event, JSON.stringify(payload.options), new Date().toISOString()]
    );
    return res.json({
      code: 200,
      message: 'ok',
      data: {
        eventId,
        event: payload.event,
        options: payload.options,
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

router.post('/choose', async (req, res) => {
  const { characterId, eventId, optionIndex } = req.body || {};
  if (!characterId || !eventId || optionIndex === undefined) {
    return res.status(400).json({ code: 400, message: 'characterId eventId optionIndex required', data: null });
  }
  try {
    const row = await get(`SELECT * FROM events WHERE id = ? AND character_id = ?`, [eventId, characterId]);
    if (!row) {
      return res.status(400).json({ code: 400, message: 'event not found', data: null });
    }
    const character = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!character) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    const options = JSON.parse(row.options_json || '[]');
    const selected = options[optionIndex];
    if (!selected) {
      return res.status(400).json({ code: 400, message: 'invalid optionIndex', data: null });
    }

    await run(`UPDATE events SET chosen_option = ?, result_json = ? WHERE id = ?`, [optionIndex, JSON.stringify(selected), eventId]);

    const delta = selected.status_change || {};
    const next = clampStatus(character, delta);
    await run(
      `UPDATE characters SET mood = ?, health = ?, stress = ?, money = ?, charm = ?, intelligence = ?, updated_at = ? WHERE id = ?`,
      [
        next.mood,
        next.health,
        next.stress,
        next.money,
        next.charm,
        next.intelligence,
        new Date().toISOString(),
        characterId,
      ]
    );

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        finalResult: selected.result,
        statusDelta: delta,
        relationDelta: {},
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

module.exports = router;
