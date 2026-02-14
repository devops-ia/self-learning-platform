import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync } from "fs";
import { randomUUID, createHash, createCipheriv, createHmac, randomBytes } from "crypto";
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

  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Settings table
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
sqlite.exec(`INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('registration_enabled', 'true', datetime('now'))`);
sqlite.exec(`INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('demo_mode', 'false', datetime('now'))`);
sqlite.exec(`INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('anonymous_access', 'false', datetime('now'))`);
sqlite.exec(`INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('platform_title', 'Self-Learning Platform', datetime('now'))`);

// Add new columns to existing tables (idempotent)
try { sqlite.exec("ALTER TABLE exercises ADD COLUMN difficulty TEXT"); } catch { /* already exists */ }
try { sqlite.exec("ALTER TABLE modules ADD COLUMN show_difficulty INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
try { sqlite.exec("ALTER TABLE modules ADD COLUMN image TEXT"); } catch { /* already exists */ }
try { sqlite.exec("ALTER TABLE users ADD COLUMN preferences TEXT"); } catch { /* already exists */ }
try { sqlite.exec("ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
try { sqlite.exec("ALTER TABLE users ADD COLUMN email_hash TEXT"); } catch { /* already exists */ }
try { sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash)"); } catch { /* already exists */ }

// Encryption helpers (duplicated here since seed runs standalone via tsx)
function seedEncrypt(plaintext: string): string {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me-in-production-32chars!!";
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function seedHmacHash(value: string): string {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me-in-production-32chars!!";
  return createHmac("sha256", secret).update(value.toLowerCase().trim()).digest("hex");
}

// Backfill: encrypt existing plaintext emails and populate email_hash
const usersToMigrate = sqlite.prepare("SELECT id, email FROM users WHERE email_hash IS NULL AND email IS NOT NULL").all() as { id: string; email: string }[];
for (const u of usersToMigrate) {
  // Only encrypt if email doesn't look already encrypted
  const isPlaintext = !(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/.test(u.email));
  const encryptedEmail = isPlaintext ? seedEncrypt(u.email) : u.email;
  const emailHash = seedHmacHash(u.email);
  sqlite.prepare("UPDATE users SET email = ?, email_hash = ? WHERE id = ?").run(encryptedEmail, emailHash, u.id);
}
if (usersToMigrate.length > 0) {
  console.log(`Encrypted ${usersToMigrate.length} user email(s).`);
}

console.log("Database tables created successfully.");
console.log(`Database path: ${dbPath}`);

// Create default admin user if not exists
async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@devopslab.local";
  const adminEmailHash = seedHmacHash(adminEmail);
  // Look up by email_hash first, fall back to plaintext email for legacy DBs
  const existing = sqlite
    .prepare("SELECT id FROM users WHERE email_hash = ? OR email = ?")
    .get(adminEmailHash, adminEmail);

  if (!existing) {
    const adminId = randomUUID();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";

    const hash = await argon2.hash(adminPassword, {
      type: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const encryptedEmail = seedEncrypt(adminEmail);
    sqlite
      .prepare(
        "INSERT INTO users (id, email, email_hash, password_hash, username, display_name, role, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)"
      )
      .run(adminId, encryptedEmail, adminEmailHash, hash, "admin", "Administrator", "admin");
    console.log(`Default admin user created: ${adminEmail}`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  sqlite.close();
}

seedAdmin();
