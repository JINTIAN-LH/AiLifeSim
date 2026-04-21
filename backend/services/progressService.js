const { all, get, run } = require('../db/sqlite');
const { nanoid } = require('nanoid');

const DAILY_TASKS = [
  { task_code: 'chat_once', target: 1 },
  { task_code: 'work_once', target: 1 },
  { task_code: 'use_item_once', target: 1 },
];

async function ensureDailyTasks(characterId) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await all(`SELECT id, task_code FROM daily_tasks WHERE character_id = ? AND date_key = ?`, [characterId, today]);
  const has = new Set(rows.map((x) => x.task_code));
  for (const task of DAILY_TASKS) {
    if (!has.has(task.task_code)) {
      await run(
        `INSERT INTO daily_tasks (id, character_id, task_code, progress, target, status, date_key) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nanoid(), characterId, task.task_code, 0, task.target, 'todo', today]
      );
    }
  }
}

async function progressTask(characterId, taskCode, value = 1) {
  const today = new Date().toISOString().slice(0, 10);
  let task = await get(
    `SELECT * FROM daily_tasks WHERE character_id = ? AND task_code = ? AND date_key = ? ORDER BY rowid DESC LIMIT 1`,
    [characterId, taskCode, today]
  );
  if (!task) {
    await ensureDailyTasks(characterId);
    task = await get(
      `SELECT * FROM daily_tasks WHERE character_id = ? AND task_code = ? AND date_key = ? ORDER BY rowid DESC LIMIT 1`,
      [characterId, taskCode, today]
    );
  }
  if (!task || task.status === 'done') return;

  const progress = Math.min(Number(task.target || 1), Number(task.progress || 0) + value);
  const status = progress >= Number(task.target || 1) ? 'done' : 'todo';
  await run(`UPDATE daily_tasks SET progress = ?, status = ? WHERE id = ?`, [progress, status, task.id]);
}

async function unlockAchievement(characterId, code) {
  const now = new Date().toISOString();
  await run(`INSERT OR IGNORE INTO achievements (id, character_id, code, unlocked_at) VALUES (?, ?, ?, ?)`, [
    nanoid(),
    characterId,
    code,
    now,
  ]);
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function previousDateKey(todayKey) {
  const d = new Date(`${todayKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return dateKey(d);
}

function rewardByStreak(streak) {
  if (streak >= 7) return 500;
  if (streak >= 3) return 200;
  return 80;
}

async function processDailyLogin(characterId) {
  const now = new Date();
  const today = dateKey(now);

  const todayLogin = await get(`SELECT * FROM character_logins WHERE character_id = ? AND date_key = ?`, [characterId, today]);
  if (todayLogin) {
    return {
      claimed: false,
      streakCount: Number(todayLogin.streak_count || 1),
      rewardMoney: 0,
      dateKey: today,
    };
  }

  const prevKey = previousDateKey(today);
  const prevLogin = await get(`SELECT * FROM character_logins WHERE character_id = ? AND date_key = ?`, [characterId, prevKey]);
  const streakCount = prevLogin ? Number(prevLogin.streak_count || 1) + 1 : 1;
  const rewardMoney = rewardByStreak(streakCount);

  await run(`INSERT INTO character_logins (id, character_id, date_key, streak_count, reward_money, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [
    nanoid(),
    characterId,
    today,
    streakCount,
    rewardMoney,
    now.toISOString(),
  ]);

  await run(`UPDATE characters SET money = money + ?, updated_at = ? WHERE id = ?`, [rewardMoney, now.toISOString(), characterId]);

  if (streakCount >= 3) {
    await unlockAchievement(characterId, 'login_3days');
  }

  return {
    claimed: true,
    streakCount,
    rewardMoney,
    dateKey: today,
  };
}

module.exports = {
  ensureDailyTasks,
  progressTask,
  unlockAchievement,
  processDailyLogin,
};
