const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(process.cwd(), process.env.SQLITE_PATH || './data/lifesim.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows);
    });
  });
}

function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT,
      avatar TEXT,
      personality TEXT,
      mood INTEGER DEFAULT 70,
      health INTEGER DEFAULT 80,
      stress INTEGER DEFAULT 20,
      money INTEGER DEFAULT 1000,
      charm INTEGER DEFAULT 60,
      intelligence INTEGER DEFAULT 60,
      job TEXT DEFAULT 'unemployed',
      job_level TEXT DEFAULT 'entry',
      age INTEGER DEFAULT 18,
      created_at TEXT,
      updated_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS npc_relations (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      npc_id TEXT NOT NULL,
      favorability INTEGER DEFAULT 0,
      relationship_stage TEXT DEFAULT 'stranger',
      updated_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS npcs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role_type TEXT NOT NULL,
      personality TEXT NOT NULL,
      mood_state TEXT DEFAULT 'calm',
      unlocked INTEGER DEFAULT 1,
      created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS npc_memories (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      npc_id TEXT NOT NULL,
      memory_text TEXT NOT NULL,
      weight INTEGER DEFAULT 1,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      item_code TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_type TEXT NOT NULL,
      qty INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS daily_tasks (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      task_code TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      target INTEGER DEFAULT 1,
      status TEXT DEFAULT 'todo',
      date_key TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      code TEXT NOT NULL,
      unlocked_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS character_logins (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      streak_count INTEGER DEFAULT 1,
      reward_money INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS endings (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      ending_type TEXT NOT NULL,
      ending_text TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      event_type TEXT,
      event_text TEXT,
      options_json TEXT,
      chosen_option INTEGER,
      result_json TEXT,
      created_at TEXT
    )`);

    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_relation_unique ON npc_relations(character_id, npc_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_memories_expire ON npc_memories(expires_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_char ON inventory_items(character_id)`);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_unique ON achievements(character_id, code)`);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_logins_unique ON character_logins(character_id, date_key)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_endings_char ON endings(character_id)`);

    const now = new Date().toISOString();
    db.run(
      `INSERT OR IGNORE INTO npcs (id, name, role_type, personality, mood_state, unlocked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['coworker_01', '阿泽', '同事', '社牛、爱八卦', 'energetic', 1, now]
    );
    db.run(
      `INSERT OR IGNORE INTO npcs (id, name, role_type, personality, mood_state, unlocked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['friend_01', '小鱼', '挚友', '细腻、温柔', 'calm', 1, now]
    );
    db.run(
      `INSERT OR IGNORE INTO npcs (id, name, role_type, personality, mood_state, unlocked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['neighbor_01', '林叔', '邻居', '稳重、健谈', 'calm', 1, now]
    );
  });
}

module.exports = { db, initDb, run, get, all };
