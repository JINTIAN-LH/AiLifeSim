const express = require('express');
const { all } = require('../db/sqlite');

const router = express.Router();

router.get('/achievement', async (req, res) => {
  const { characterId } = req.query;
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const rows = await all(`SELECT code, unlocked_at FROM achievements WHERE character_id = ? ORDER BY unlocked_at DESC`, [characterId]);
    const unlockedCodes = rows.map((x) => x.code);
    const base = ['first_job', 'best_friend', 'happy_ending', 'career_up', 'social_star', 'login_3days'];
    const locked = base.filter((code) => !unlockedCodes.includes(code));
    return res.json({
      code: 200,
      message: 'ok',
      data: {
        unlocked: rows,
        locked,
      },
    });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

module.exports = router;
