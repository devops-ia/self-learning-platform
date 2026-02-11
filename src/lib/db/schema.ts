import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  username: text("username").notNull().default("anonymous"),
  displayName: text("display_name"),
  role: text("role", { enum: ["admin", "user", "anonymous"] })
    .notNull()
    .default("user"),
  totpSecret: text("totp_secret"),
  totpEnabled: integer("totp_enabled", { mode: "boolean" }).notNull().default(false),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const oauthAccounts = sqliteTable("oauth_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  provider: text("provider").notNull(), // google, github, azure
  providerAccountId: text("provider_account_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const passkeys = sqliteTable("passkeys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type"),
  backedUp: integer("backed_up", { mode: "boolean" }).default(false),
  transports: text("transports"), // JSON array
  name: text("name"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  lastUsedAt: text("last_used_at"),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id"),
  action: text("action").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  details: text("details"), // JSON
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const progress = sqliteTable("progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  exerciseId: text("exercise_id").notNull(),
  status: text("status", { enum: ["locked", "available", "completed"] })
    .notNull()
    .default("locked"),
  completedAt: text("completed_at"),
});

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  exerciseId: text("exercise_id").notNull(),
  code: text("code").notNull(),
  result: text("result", { enum: ["pass", "fail"] }).notNull(),
  feedback: text("feedback").notNull(),
  submittedAt: text("submitted_at").notNull().default(new Date().toISOString()),
});

// Exercise modules (technology categories)
export const modules = sqliteTable("modules", {
  id: text("id").primaryKey(), // e.g. "terraform", "kubernetes"
  title: text("title").notNull(),
  description: text("description").notNull(), // JSON: {"es":"...","en":"..."}
  icon: text("icon").notNull().default("Terminal"),
  prefix: text("prefix").notNull(), // e.g. "tf", "k8s"
  language: text("language").notNull().default("yaml"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// Exercise definitions (stored as declarative JSON)
export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(), // e.g. "tf-01-broken-provider"
  moduleId: text("module_id")
    .notNull()
    .references(() => modules.id),
  title: text("title").notNull(),
  briefing: text("briefing").notNull(),
  language: text("language").notNull(),
  initialCode: text("initial_code").notNull(),
  prerequisites: text("prerequisites").notNull().default("[]"), // JSON array
  hints: text("hints").notNull().default("[]"), // JSON array
  successMessage: text("success_message").notNull(),
  validations: text("validations").notNull(), // JSON array of Check DSL
  terminalCommands: text("terminal_commands").notNull(), // JSON object
  i18n: text("i18n"), // JSON: {en: {title?, briefing?, hints?, successMessage?}}
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at"),
});

// Rate limiting table
export const rateLimits = sqliteTable("rate_limits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(), // e.g. "login:192.168.1.1"
  attempts: integer("attempts").notNull().default(0),
  windowStart: text("window_start").notNull(),
});
