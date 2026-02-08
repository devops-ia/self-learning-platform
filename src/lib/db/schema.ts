import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().default("anonymous"),
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
