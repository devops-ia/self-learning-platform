/**
 * Exercise Importer
 *
 * Reads YAML exercise definitions from exercises/ and inserts them into
 * the database. Also reads _modules.yaml for module configuration.
 *
 * Usage: npm run exercises:import
 *
 * Idempotent — uses INSERT OR REPLACE so re-running is safe.
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { z } from "zod";
import Database from "better-sqlite3";
import { mkdirSync } from "fs";

// ─── Paths ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const EXERCISES_DIR = path.join(ROOT, "exercises");
const MODULES_FILE = path.join(EXERCISES_DIR, "_modules.yaml");

// ─── Database ─────────────────────────────────────────────────────────────────

const dbUrl = process.env.DB_URL || "data/learning-platform.db";
const dataDir = dbUrl.startsWith("/")
  ? path.join(dbUrl, "..")
  : path.join(process.cwd(), dbUrl, "..");
mkdirSync(dataDir, { recursive: true });
const dbPath = dbUrl.startsWith("/") ? dbUrl : path.join(process.cwd(), dbUrl);
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const checkSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    contains: z.string().optional(),
    not_contains: z.string().optional(),
    match: z.string().optional(),
    not_match: z.string().optional(),
    yaml_valid: z.literal(true).optional(),
    yaml_has: z.string().optional(),
    yaml_not_has: z.string().optional(),
    yaml_is_array: z.string().optional(),
    yaml_equals: z.object({ path: z.string(), value: z.unknown() }).optional(),
    yaml_items_have: z
      .object({ path: z.string(), fields: z.array(z.string()) })
      .optional(),
    custom: z.string().optional(),
    all: z.array(checkSchema).optional(),
    any: z.array(checkSchema).optional(),
    not: checkSchema.optional(),
  })
);

const terminalResponseSchema = z.object({
  when: checkSchema.optional(),
  output: z.string(),
  exitCode: z.number(),
});

const validationRuleSchema = z.object({
  type: z.enum(["syntax", "semantic", "intention"]),
  errorMessage: z.string(),
  check: checkSchema,
  failMessage: z.string(),
});

const i18nOverrideSchema = z.object({
  title: z.string().optional(),
  briefing: z.string().optional(),
  hints: z.array(z.string()).optional(),
  successMessage: z.string().optional(),
});

const exerciseYamlSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  briefing: z.string().min(1),
  language: z.string().optional(),
  prerequisites: z.array(z.string()).default([]),
  initialCode: z.string().min(1),
  hints: z.array(z.string()).min(1),
  successMessage: z.string().min(1),
  validations: z.array(validationRuleSchema).min(1),
  terminalCommands: z.record(z.string(), z.array(terminalResponseSchema)),
  i18n: z.record(z.string(), i18nOverrideSchema).optional(),
});

const modulesConfigSchema = z.object({
  modules: z.record(
    z.string(),
    z.object({
      title: z.string(),
      description: z.union([z.string(), z.record(z.string(), z.string())]),
      icon: z.string(),
      prefix: z.string(),
      language: z.string(),
    })
  ),
});

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log("Importing exercises from YAML into database...\n");

  // 1. Read modules config
  if (!fs.existsSync(MODULES_FILE)) {
    console.error(`Error: ${MODULES_FILE} not found`);
    process.exit(1);
  }

  const modulesRaw = yaml.load(fs.readFileSync(MODULES_FILE, "utf-8"));
  const modulesResult = modulesConfigSchema.safeParse(modulesRaw);
  if (!modulesResult.success) {
    console.error("Error validating _modules.yaml:");
    console.error(modulesResult.error.format());
    process.exit(1);
  }
  const modulesConfig = modulesResult.data;

  // 2. Upsert modules
  const upsertModule = sqlite.prepare(`
    INSERT OR REPLACE INTO modules (id, title, description, icon, prefix, language, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let sortOrder = 0;
  for (const [id, config] of Object.entries(modulesConfig.modules)) {
    const description =
      typeof config.description === "string"
        ? JSON.stringify({ es: config.description })
        : JSON.stringify(config.description);

    upsertModule.run(id, config.title, description, config.icon, config.prefix, config.language, sortOrder);
    console.log(`  Module: ${id} (${config.title})`);
    sortOrder++;
  }

  // 3. Scan for exercise YAML files
  let exerciseCount = 0;
  let errors = 0;

  const upsertExercise = sqlite.prepare(`
    INSERT OR REPLACE INTO exercises (id, module_id, title, briefing, language, initial_code, prerequisites, hints, success_message, validations, terminal_commands, i18n, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const moduleName of Object.keys(modulesConfig.modules)) {
    const moduleDir = path.join(EXERCISES_DIR, moduleName);
    if (!fs.existsSync(moduleDir)) {
      console.log(`  Skipping ${moduleName}/ (directory not found)`);
      continue;
    }

    const yamlFiles = fs
      .readdirSync(moduleDir)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .sort();

    let exSortOrder = 0;
    for (const file of yamlFiles) {
      const filePath = path.join(moduleDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      let raw: unknown;
      try {
        raw = yaml.load(content);
      } catch (e) {
        console.error(`  Error parsing ${moduleName}/${file}:`);
        console.error(`    ${e instanceof Error ? e.message : e}`);
        errors++;
        continue;
      }

      const result = exerciseYamlSchema.safeParse(raw);
      if (!result.success) {
        console.error(`  Error validating ${moduleName}/${file}:`);
        for (const issue of result.error.issues) {
          console.error(`    ${issue.path.join(".")}: ${issue.message}`);
        }
        errors++;
        continue;
      }

      const exercise = result.data;
      const moduleConfig = modulesConfig.modules[moduleName];
      const language = exercise.language || moduleConfig.language;

      upsertExercise.run(
        exercise.id,
        moduleName,
        exercise.title,
        exercise.briefing,
        language,
        exercise.initialCode,
        JSON.stringify(exercise.prerequisites),
        JSON.stringify(exercise.hints),
        exercise.successMessage,
        JSON.stringify(exercise.validations),
        JSON.stringify(exercise.terminalCommands),
        exercise.i18n ? JSON.stringify(exercise.i18n) : null,
        exSortOrder
      );
      console.log(`  ${moduleName}/${file} -> ${exercise.id}`);
      exerciseCount++;
      exSortOrder++;
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} error(s) found. Some exercises were not imported.`);
  }

  console.log(`\nImported ${exerciseCount} exercise(s) into database.`);
  console.log(`Database: ${dbPath}`);

  sqlite.close();
  console.log("Done!\n");
}

main();
