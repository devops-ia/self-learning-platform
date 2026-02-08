const Database = require('better-sqlite3');
const { join } = require('path');
const { mkdirSync } = require('fs');

const dataDir = join(process.cwd(), 'data');
try {
  mkdirSync(dataDir, { recursive: true });
} catch (e) {}

const dbPath = join(dataDir, 'learning-platform.db');
const sqlite = new Database(dbPath);
try {
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL DEFAULT 'anonymous',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      exercise_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'locked' CHECK(status IN ('locked', 'available', 'completed')),
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      exercise_id TEXT NOT NULL,
      code TEXT NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('pass', 'fail')),
      feedback TEXT NOT NULL,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
} catch (err) {
  // ignore
} finally {
  try { sqlite.close(); } catch (e) {}
}
