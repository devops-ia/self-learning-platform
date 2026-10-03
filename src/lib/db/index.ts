import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { join } from "path";

const dbUrl = process.env.DB_URL || "data/learning-platform.db";
const dbPath = dbUrl.startsWith("/") ? dbUrl : join(/*turbopackIgnore: true*/ process.cwd(), dbUrl);
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance.
// ponytail: WAL persists in the file; parallel build workers race on a fresh DB, the winner sets it.
try {
  sqlite.pragma("journal_mode = WAL");
} catch (e) {
  if ((e as { code?: string }).code !== "SQLITE_BUSY") throw e;
}

export const db = drizzle(sqlite, { schema });
