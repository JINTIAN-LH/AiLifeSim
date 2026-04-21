const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDb } = require('./db/sqlite');

dotenv.config();
initDb();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  })
);

app.get('/health', (req, res) => {
  res.json({ code: 200, message: 'ok', data: { status: 'up' } });
});

app.use('/api/character', require('./routes/character'));
app.use('/api/action', require('./routes/action'));
app.use('/api/npc', require('./routes/npc'));
app.use('/api/event', require('./routes/event'));
app.use('/api/character', require('./routes/achievement'));
app.use('/api/career', require('./routes/career'));

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      code: 400,
      message: 'invalid json body',
      data: {
        hint: 'Use valid JSON body without escaped wrapper. Example: {"characterId":"xxx"}',
      },
    });
  }

  console.error(err);
  res.status(500).json({ code: 500, message: 'server error', data: null });
});

module.exports = app;
