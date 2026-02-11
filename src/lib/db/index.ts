import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { join } from "path";

const dbUrl = process.env.DB_URL || "data/learning-platform.db";
const dbPath = dbUrl.startsWith("/") ? dbUrl : join(process.cwd(), dbUrl);
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
