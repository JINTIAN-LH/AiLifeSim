const express = require('express');
const { get, run } = require('../db/sqlite');
const { unlockAchievement } = require('../services/progressService');

const router = express.Router();

const LEVELS = ['entry', 'junior', 'mid', 'senior', 'expert'];
const JOBS = ['office', 'creator', 'shopkeeper', 'freelancer', 'developer'];

function nextLevel(current) {
  const idx = LEVELS.indexOf(current || 'entry');
  if (idx < 0 || idx >= LEVELS.length - 1) return current || 'entry';
  return LEVELS[idx + 1];
}

router.get('/info', async (req, res) => {
  const { characterId } = req.query;
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const row = await get(`SELECT id, job, job_level, intelligence, charm, mood, stress FROM characters WHERE id = ?`, [characterId]);
    if (!row) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }
    return res.json({ code: 200, message: 'ok', data: row });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

router.post('/switch', async (req, res) => {
  const { characterId, job } = req.body || {};
  if (!characterId || !job) {
    return res.status(400).json({ code: 400, message: 'characterId and job required', data: null });
  }
  if (!JOBS.includes(job)) {
    return res.status(400).json({ code: 400, message: 'invalid job', data: null });
  }
  try {
    const row = await get(`SELECT id FROM characters WHERE id = ?`, [characterId]);
    if (!row) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    await run(`UPDATE characters SET job = ?, job_level = ?, updated_at = ? WHERE id = ?`, [
      job,
      'entry',
      new Date().toISOString(),
      characterId,
    ]);

    return res.json({
      code: 200,
      message: 'ok',
      data: { job, jobLevel: 'entry' },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

router.post('/exam', async (req, res) => {
  const { characterId } = req.body || {};
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const row = await get(
      `SELECT id, job, job_level, intelligence, charm, mood, stress FROM characters WHERE id = ?`,
      [characterId]
    );
    if (!row) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    const score = Number(row.intelligence || 0) + Number(row.charm || 0) + Number(row.mood || 0) - Number(row.stress || 0);
    const pass = score >= 120;
    if (!pass) {
      return res.json({
        code: 200,
        message: 'ok',
        data: {
          passed: false,
          score,
          currentLevel: row.job_level,
          tip: '本次考核未通过，建议先学习和休闲提升状态。',
        },
      });
    }

    const promoted = nextLevel(row.job_level);
    await run(`UPDATE characters SET job_level = ?, updated_at = ? WHERE id = ?`, [promoted, new Date().toISOString(), characterId]);
    if (promoted !== row.job_level) {
      await unlockAchievement(characterId, 'career_up');
    }

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        passed: true,
        score,
        previousLevel: row.job_level,
        currentLevel: promoted,
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

module.exports = router;
