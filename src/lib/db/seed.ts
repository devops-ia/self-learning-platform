import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync } from "fs";
import { randomUUID } from "crypto";
import argon2 from "argon2";

const dbUrl = process.env.DB_URL || "data/learning-platform.db";
const dataDir = dbUrl.startsWith("/")
  ? join(dbUrl, "..")
  : join(process.cwd(), dbUrl, "..");
mkdirSync(dataDir, { recursive: true });

const dbPath = dbUrl.startsWith("/") ? dbUrl : join(process.cwd(), dbUrl);
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    username TEXT NOT NULL DEFAULT 'anonymous',
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'anonymous')),
    totp_secret TEXT,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    email_verified INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS oauth_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_account_id)
  );

  CREATE TABLE IF NOT EXISTS passkeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    device_type TEXT,
    backed_up INTEGER DEFAULT 0,
    transports TEXT,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    details TEXT,
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

  CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Terminal',
    prefix TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'yaml',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL REFERENCES modules(id),
    title TEXT NOT NULL,
    briefing TEXT NOT NULL,
    language TEXT NOT NULL,
    initial_code TEXT NOT NULL,
    prerequisites TEXT NOT NULL DEFAULT '[]',
    hints TEXT NOT NULL DEFAULT '[]',
    success_message TEXT NOT NULL,
    validations TEXT NOT NULL,
    terminal_commands TEXT NOT NULL,
    i18n TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_start TEXT NOT NULL
  );
`);

console.log("Database tables created successfully.");
console.log(`Database path: ${dbPath}`);

// Create default admin user if not exists
async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@devopslab.local";
  const existing = sqlite
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(adminEmail);

  if (!existing) {
    const adminId = randomUUID();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";

    const hash = await argon2.hash(adminPassword, {
      type: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    sqlite
      .prepare(
        "INSERT INTO users (id, email, password_hash, username, display_name, role, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)"
      )
      .run(adminId, adminEmail, hash, "admin", "Administrator", "admin");
    console.log(`Default admin user created: ${adminEmail}`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  sqlite.close();
}

seedAdmin();
