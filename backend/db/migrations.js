const { nanoid } = require('nanoid');

async function addColumnIfMissing(db, table, column, definition) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) return reject(err);
      const exists = rows.some(col => col.name === column);
      if (!exists) {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err2) => {
          if (err2) return reject(err2);
          console.log(`[migration] Added column ${table}.${column}`);
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

function runPromise(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function runMigrations(db) {
  // ── characters table new columns ──
  const charColumns = [
    ['quarters_lived', 'INTEGER DEFAULT 0'],
    ['life_stage', "TEXT DEFAULT '青年期'"],
    ['is_alive', 'INTEGER DEFAULT 1'],
    ['death_age', 'INTEGER DEFAULT NULL'],
    ['death_cause', 'TEXT DEFAULT NULL'],
    ['peak_mood', 'INTEGER DEFAULT 70'],
    ['peak_health', 'INTEGER DEFAULT 80'],
    ['peak_money', 'INTEGER DEFAULT 1000'],
    ['peak_intelligence', 'INTEGER DEFAULT 60'],
    ['peak_charm', 'INTEGER DEFAULT 60'],
    ['birth_season', "TEXT DEFAULT 'spring'"],
    ['generation', 'INTEGER DEFAULT 1'],
  ];

  for (const [col, def] of charColumns) {
    await addColumnIfMissing(db, 'characters', col, def);
  }

  // ── quarter_logs table ──
  await runPromise(db, `CREATE TABLE IF NOT EXISTS quarter_logs (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    quarter_number INTEGER NOT NULL,
    age_years REAL NOT NULL,
    life_stage TEXT NOT NULL,
    mood INTEGER, health INTEGER, stress INTEGER,
    money INTEGER, charm INTEGER, intelligence INTEGER,
    job TEXT, job_level TEXT,
    event_text TEXT,
    player_choice TEXT,
    result_text TEXT,
    created_at TEXT NOT NULL
  )`);
  await runPromise(db, `CREATE INDEX IF NOT EXISTS idx_quarter_logs_char ON quarter_logs(character_id, quarter_number)`);
  await addColumnIfMissing(db, 'quarter_logs', 'event_code', 'TEXT DEFAULT NULL');
  await addColumnIfMissing(db, 'quarter_logs', 'milestone_key', 'TEXT DEFAULT NULL');

  // ── milestone_flags table ──
  await runPromise(db, `CREATE TABLE IF NOT EXISTS milestone_flags (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    milestone_key TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
  await runPromise(db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_milestone_unique ON milestone_flags(character_id, milestone_key)`);

  // ── life_events_pool table ──
  await runPromise(db, `CREATE TABLE IF NOT EXISTS life_events_pool (
    id TEXT PRIMARY KEY,
    event_code TEXT UNIQUE NOT NULL,
    life_stage TEXT NOT NULL,
    category TEXT NOT NULL,
    event_text TEXT NOT NULL,
    options_json TEXT NOT NULL,
    min_age_years REAL DEFAULT 0,
    max_age_years REAL DEFAULT 120,
    trigger_weight INTEGER DEFAULT 10,
    repeatable INTEGER DEFAULT 0,
    requires_job TEXT DEFAULT NULL,
    requires_min_money INTEGER DEFAULT NULL,
    created_at TEXT NOT NULL
  )`);

  // ── life_reviews table ──
  await runPromise(db, `CREATE TABLE IF NOT EXISTS life_reviews (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    character_name TEXT NOT NULL,
    total_quarters INTEGER,
    death_age_years REAL,
    death_cause TEXT,
    peak_stats_json TEXT,
    career_summary_json TEXT,
    relationship_summary_json TEXT,
    achievements_unlocked INTEGER DEFAULT 0,
    events_experienced INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    tier TEXT,
    title TEXT,
    review_text TEXT,
    generated_at TEXT NOT NULL
  )`);
  await runPromise(db, `CREATE INDEX IF NOT EXISTS idx_life_reviews_char ON life_reviews(character_id)`);

  // ── relationships_history table ──
  await runPromise(db, `CREATE TABLE IF NOT EXISTS relationships_history (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    npc_id TEXT NOT NULL,
    quarter_number INTEGER NOT NULL,
    favorability_at_time INTEGER DEFAULT 0,
    stage_at_time TEXT DEFAULT 'stranger',
    interaction_type TEXT,
    created_at TEXT NOT NULL
  )`);
  await runPromise(db, `CREATE INDEX IF NOT EXISTS idx_rel_history_char ON relationships_history(character_id, quarter_number)`);

  console.log('[migration] All migrations completed successfully');
}

module.exports = { runMigrations };
