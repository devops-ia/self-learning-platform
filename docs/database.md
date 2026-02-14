# Database Guide

The platform uses SQLite by default via [Drizzle ORM](https://orm.drizzle.team/) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3). This guide covers database management and how to switch to other databases.

## Current Setup (SQLite)

```
src/lib/db/
  index.ts    — Connection setup (reads DB_URL env var)
  schema.ts   — Drizzle table definitions
  seed.ts     — Table creation + admin user seeding

drizzle.config.ts — Drizzle Kit config (migrations, dialect)
data/             — SQLite database file (gitignored)
```

### Database path

Controlled by `DB_URL` env var (default: `data/learning-platform.db`):

```bash
# Relative path (from project root)
DB_URL=data/learning-platform.db

# Absolute path
DB_URL=/var/lib/myapp/database.db
```

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, password hash, role, TOTP, avatar) |
| `oauth_accounts` | OAuth provider links (Google, GitHub, Azure) |
| `passkeys` | WebAuthn credentials |
| `audit_log` | Security audit trail |
| `progress` | User exercise progress (locked/available/completed) |
| `submissions` | Code submissions with pass/fail results |
| `modules` | Technology modules (terraform, kubernetes, ansible) |
| `exercises` | Exercise definitions (code, validations, terminal commands) |
| `rate_limits` | Login rate limiting |

### Common operations

```bash
# Create/reset tables + seed admin user
npm run db:seed

# Import exercises from YAML
npm run exercises:import

# Open database with sqlite3 CLI
sqlite3 data/learning-platform.db

# Useful queries
.schema                              -- Show all tables
SELECT * FROM modules;               -- List modules
SELECT id, title FROM exercises;     -- List exercises
SELECT id, email, role FROM users;   -- List users
SELECT COUNT(*) FROM submissions;    -- Count submissions
```

### Backup

```bash
# Simple file copy (SQLite is a single file)
cp data/learning-platform.db data/backup-$(date +%Y%m%d).db

# With Docker
docker cp learning-platform:/app/data/learning-platform.db ./backup.db
```

## Switching to PostgreSQL

Drizzle ORM supports PostgreSQL natively. Here's how to migrate:

### 1. Install the PostgreSQL driver

```bash
# Remove SQLite driver
npm uninstall better-sqlite3 @types/better-sqlite3

# Install PostgreSQL driver
npm install drizzle-orm/pg @neondatabase/serverless
# OR for node-postgres:
npm install pg
npm install -D @types/pg
```

### 2. Update the schema (`src/lib/db/schema.ts`)

Replace SQLite-specific imports with PostgreSQL:

```typescript
// Before (SQLite)
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// After (PostgreSQL)
import { pgTable, text, integer, serial, boolean, timestamp } from "drizzle-orm/pg-core";
```

Update table definitions:

```typescript
// Before (SQLite)
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  role: text("role", { enum: ["admin", "user", "anonymous"] }).notNull().default("user"),
  totpEnabled: integer("totp_enabled", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// After (PostgreSQL)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  role: text("role").notNull().default("user"), // or use pgEnum
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

Key differences:

- `sqliteTable` → `pgTable`
- `integer("col", { mode: "boolean" })` → `boolean("col")`
- `text("col").default(new Date().toISOString())` → `timestamp("col").defaultNow()`
- `integer("id").primaryKey({ autoIncrement: true })` → `serial("id").primaryKey()`

### 3. Update the connection (`src/lib/db/index.ts`)

```typescript
// Before (SQLite)
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(process.env.DB_URL || "data/learning-platform.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzle(sqlite, { schema });

// After (PostgreSQL with node-postgres)
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/learning_platform",
});
export const db = drizzle(pool, { schema });

// After (PostgreSQL with Neon serverless)
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### 4. Update Drizzle Kit config (`drizzle.config.ts`)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",  // Changed from "sqlite"
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/learning_platform",
  },
});
```

### 5. Update the seed script (`src/lib/db/seed.ts`)

Replace `better-sqlite3` with `pg`:

```typescript
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/learning_platform",
});

// Replace sqlite.exec() with pool.query()
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    username TEXT NOT NULL DEFAULT 'anonymous',
    role TEXT NOT NULL DEFAULT 'user',
    totp_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ...
  );
  ...
`);
```

### 6. Update the import script (`scripts/import-exercises.ts`)

Replace `better-sqlite3` prepared statements with `pg` queries:

```typescript
// Before
const sqlite = new Database(dbPath);
const upsertModule = sqlite.prepare(`INSERT OR REPLACE INTO modules ...`);
upsertModule.run(id, title, ...);

// After
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(
  `INSERT INTO modules (id, title, ...) VALUES ($1, $2, ...)
   ON CONFLICT (id) DO UPDATE SET title = $2, ...`,
  [id, title, ...]
);
```

Note: PostgreSQL uses `ON CONFLICT ... DO UPDATE` instead of SQLite's `INSERT OR REPLACE`.

### 7. Update environment

```bash
# .env.local
DATABASE_URL=postgresql://user:password@localhost:5432/learning_platform
```

### 8. Run migrations

```bash
# Generate migration from schema
npm run db:generate

# Apply migration
npm run db:migrate

# Or push schema directly (dev only)
npm run db:push
```

## Switching to MySQL/MariaDB

Similar process to PostgreSQL:

```typescript
// schema.ts
import { mysqlTable, text, int, boolean, timestamp } from "drizzle-orm/mysql-core";

// index.ts
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const pool = mysql.createPool(process.env.DATABASE_URL || "mysql://localhost:3306/learning_platform");
export const db = drizzle(pool, { schema });

// drizzle.config.ts
export default defineConfig({
  dialect: "mysql",
  dbCredentials: { url: process.env.DATABASE_URL },
});
```

## Switching to Turso (LibSQL)

[Turso](https://turso.tech/) is a SQLite-compatible edge database:

```bash
npm uninstall better-sqlite3 @types/better-sqlite3
npm install @libsql/client
```

```typescript
// index.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_URL || "file:data/learning-platform.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
export const db = drizzle(client, { schema });
```

The schema stays the same (SQLite dialect) — only the driver changes.

## Schema Reference

Full schema is in `src/lib/db/schema.ts`. Key relationships:

```
modules 1──N exercises     (module_id → modules.id)
users   1──N progress      (user_id → users.id)
users   1──N submissions   (user_id → users.id)
users   1──N oauth_accounts(user_id → users.id)
users   1──N passkeys      (user_id → users.id)
```

Exercise data is stored as JSON strings in TEXT columns:

- `prerequisites` — `["tf-01-broken-provider"]`
- `hints` — `["Hint 1", "Hint 2"]`
- `validations` — `[{"type":"syntax","check":{"contains":"x"},...}]`
- `terminal_commands` — `{"cmd":[{"when":{},"output":"...","exitCode":0}]}`
- `i18n` — `{"en":{"title":"...","briefing":"..."}}`
