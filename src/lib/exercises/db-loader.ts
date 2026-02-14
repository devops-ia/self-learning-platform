/**
 * Exercise DB Loader + Runtime Check Interpreter
 *
 * Loads exercises from the database and hydrates them into the Exercise interface
 * expected by engine.ts and simulator.ts. Declarative Check DSL stored as JSON
 * is interpreted at runtime instead of being compiled to TypeScript at build time.
 */

import { db } from "../db";
import {
  modules as modulesTable,
  exercises as exercisesTable,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { Exercise, ValidationResult, TerminalResponse } from "./types";
import * as yaml from "js-yaml";
import { safeEval } from "./safe-eval";
import { _get } from "./helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Check DSL — declarative validation rules stored in DB as JSON */
interface Check {
  contains?: string;
  not_contains?: string;
  match?: string;
  not_match?: string;
  yaml_valid?: true;
  yaml_has?: string;
  yaml_not_has?: string;
  yaml_is_array?: string;
  yaml_equals?: { path: string; value: unknown };
  yaml_items_have?: { path: string; fields: string[] };
  custom?: string;
  all?: Check[];
  any?: Check[];
  not?: Check;
}

interface StoredValidation {
  type: "syntax" | "semantic" | "intention";
  errorMessage: string;
  check: Check;
  failMessage: string;
}

interface StoredTerminalResponse {
  when?: Check;
  output: string;
  exitCode: number;
}

export interface ModuleData {
  id: string;
  title: string;
  description: Record<string, string>;
  icon: string;
  prefix: string;
  language: string;
  showDifficulty: boolean;
  image?: string;
  sortOrder: number;
}

export interface ExerciseListItem {
  id: string;
  title: string;
  prerequisites: string[];
  difficulty?: string;
  i18n?: Record<string, { title?: string; briefing?: string }>;
}

export interface ExerciseMetadata {
  title: string;
  briefing: string;
  initialCode: string;
  language: string;
  i18n?: Record<string, { title?: string; briefing?: string }>;
}

// ─── Runtime Check Interpreter ────────────────────────────────────────────────

/**
 * Evaluates a Check DSL object against code, returns boolean.
 * Interprets a Check DSL object against code at runtime.
 */
export function evaluateCheck(check: Check, code: string): boolean {
  // Each field is an AND condition — all must pass
  if (check.contains !== undefined) {
    if (!code.includes(check.contains)) return false;
  }
  if (check.not_contains !== undefined) {
    if (code.includes(check.not_contains)) return false;
  }
  if (check.match !== undefined) {
    if (!new RegExp(check.match).test(code)) return false;
  }
  if (check.not_match !== undefined) {
    if (new RegExp(check.not_match).test(code)) return false;
  }
  if (check.yaml_valid === true) {
    try {
      yaml.load(code);
    } catch {
      return false;
    }
  }
  if (check.yaml_has !== undefined) {
    try {
      const parsed = yaml.load(code) as Record<string, unknown>;
      if (_get(parsed, check.yaml_has) === undefined) return false;
    } catch {
      return false;
    }
  }
  if (check.yaml_not_has !== undefined) {
    try {
      const parsed = yaml.load(code) as Record<string, unknown>;
      if (_get(parsed, check.yaml_not_has) !== undefined) return false;
    } catch {
      // If YAML is invalid, field effectively doesn't exist
    }
  }
  if (check.yaml_is_array !== undefined) {
    try {
      const parsed = yaml.load(code) as Record<string, unknown>;
      if (!Array.isArray(_get(parsed, check.yaml_is_array))) return false;
    } catch {
      return false;
    }
  }
  if (check.yaml_equals !== undefined) {
    try {
      const parsed = yaml.load(code) as Record<string, unknown>;
      if (_get(parsed, check.yaml_equals.path) !== check.yaml_equals.value) return false;
    } catch {
      return false;
    }
  }
  if (check.yaml_items_have !== undefined) {
    try {
      const parsed = yaml.load(code) as Record<string, unknown>;
      const arr = _get(parsed, check.yaml_items_have.path);
      if (!Array.isArray(arr)) return false;
      const fields = check.yaml_items_have.fields;
      if (!arr.every((item: Record<string, unknown>) => fields.every((f: string) => item[f] !== undefined))) return false;
    } catch {
      return false;
    }
  }
  if (check.all) {
    if (!check.all.every((c) => evaluateCheck(c, code))) return false;
  }
  if (check.any) {
    if (!check.any.some((c) => evaluateCheck(c, code))) return false;
  }
  if (check.not) {
    if (evaluateCheck(check.not, code)) return false;
  }
  if (check.custom !== undefined) {
    try {
      // Execute custom code with safe evaluation
      // SECURITY: Only admin-created content runs here
      const result = safeEval(check.custom, code);
      // Custom code can return: boolean, or {passed: boolean, ...}
      if (typeof result === "boolean") return result;
      if (result && typeof result === "object" && "passed" in result) return result.passed;
      return !!result;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Execute custom validation code that returns a full ValidationResult.
 * Used when custom code needs to provide specific error messages.
 */
function executeCustomValidation(customCode: string, code: string): ValidationResult {
  try {
    // Execute with safe evaluation
    const result = safeEval(customCode, code);
    if (result && typeof result === "object" && "passed" in result) {
      return result as ValidationResult;
    }
    return { passed: !!result };
  } catch (e) {
    return {
      passed: false,
      errorMessage: `Validation error: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
}

// ─── Hydration ────────────────────────────────────────────────────────────────

/** Convert a stored validation rule (JSON DSL) into a function-based ValidationRule */
function hydrateValidation(stored: StoredValidation) {
  return {
    type: stored.type,
    errorMessage: stored.errorMessage,
    check: (code: string): ValidationResult => {
      // If the check is purely custom code that returns ValidationResult directly
      if (stored.check.custom !== undefined && Object.keys(stored.check).length === 1) {
        return executeCustomValidation(stored.check.custom, code);
      }
      // Otherwise, evaluate the DSL and use failMessage on failure
      if (!evaluateCheck(stored.check, code)) {
        return { passed: false, errorMessage: stored.failMessage };
      }
      return { passed: true };
    },
  };
}

/** Convert stored terminal command responses into a TerminalCommandHandler */
function hydrateTerminalCommand(responses: StoredTerminalResponse[]) {
  return (code: string): TerminalResponse => {
    for (const resp of responses) {
      if (resp.when) {
        // If when has only custom code, execute it
        if (resp.when.custom !== undefined && Object.keys(resp.when).length === 1) {
          try {
            const result = safeEval(resp.when.custom, code);
            if (result) {
              return { output: resp.output, exitCode: resp.exitCode };
            }
            continue;
          } catch {
            continue;
          }
        }
        if (evaluateCheck(resp.when, code)) {
          return { output: resp.output, exitCode: resp.exitCode };
        }
      } else {
        // No when condition = default response
        return { output: resp.output, exitCode: resp.exitCode };
      }
    }
    // Fallback — shouldn't happen if terminal commands are well-defined
    return { output: "", exitCode: 0 };
  };
}

/** Convert a DB exercise row into the full Exercise interface */
function hydrateExercise(row: {
  id: string;
  moduleId: string;
  title: string;
  briefing: string;
  language: string;
  initialCode: string;
  prerequisites: string;
  hints: string;
  successMessage: string;
  validations: string;
  terminalCommands: string;
  i18n: string | null;
  difficulty: string | null;
}): Exercise {
  const storedValidations: StoredValidation[] = JSON.parse(row.validations);
  const storedCommands: Record<string, StoredTerminalResponse[]> = JSON.parse(row.terminalCommands);

  const terminalCommands: Record<string, (code: string) => TerminalResponse> = {};
  for (const [cmd, responses] of Object.entries(storedCommands)) {
    terminalCommands[cmd] = hydrateTerminalCommand(responses);
  }

  return {
    id: row.id,
    module: row.moduleId,
    title: row.title,
    briefing: row.briefing,
    language: row.language,
    initialCode: row.initialCode,
    prerequisites: JSON.parse(row.prerequisites),
    hints: JSON.parse(row.hints),
    successMessage: row.successMessage,
    validations: storedValidations.map(hydrateValidation),
    terminalCommands,
    ...(row.difficulty ? { difficulty: row.difficulty as "easy" | "medium" | "hard" } : {}),
  };
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 60_000; // 60 seconds
const exerciseCache = new Map<string, CacheEntry<Exercise>>();
const moduleExercisesCache = new Map<string, CacheEntry<Exercise[]>>();
const modulesCache: { entry: CacheEntry<ModuleData[]> | null } = { entry: null };
const exerciseListCache = new Map<string, CacheEntry<ExerciseListItem[]>>();
const exerciseMetadataCache = new Map<string, CacheEntry<ExerciseMetadata | null>>();

function isFresh<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.timestamp < CACHE_TTL;
}

/** Clear all caches — call after admin writes */
export function invalidateExerciseCache() {
  exerciseCache.clear();
  moduleExercisesCache.clear();
  modulesCache.entry = null;
  exerciseListCache.clear();
  exerciseMetadataCache.clear();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Get a single exercise by ID (hydrated with functions) */
export function getExerciseFromDB(id: string): Exercise | undefined {
  const cached = exerciseCache.get(id);
  if (isFresh(cached)) return cached.data;

  const row = db.select().from(exercisesTable).where(eq(exercisesTable.id, id)).get();
  if (!row) return undefined;

  const exercise = hydrateExercise(row);
  exerciseCache.set(id, { data: exercise, timestamp: Date.now() });
  return exercise;
}

/** Get all exercises for a module (hydrated) */
export function getModuleExercisesFromDB(moduleId: string): Exercise[] {
  const cached = moduleExercisesCache.get(moduleId);
  if (isFresh(cached)) return cached.data;

  const rows = db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.moduleId, moduleId))
    .orderBy(exercisesTable.sortOrder)
    .all();

  const exercises = rows.map(hydrateExercise);
  moduleExercisesCache.set(moduleId, { data: exercises, timestamp: Date.now() });
  return exercises;
}

/** Get all modules */
export function getModulesFromDB(): ModuleData[] {
  if (isFresh(modulesCache.entry)) return modulesCache.entry.data;

  const rows = db.select().from(modulesTable).orderBy(modulesTable.sortOrder).all();
  const modules: ModuleData[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: JSON.parse(r.description),
    icon: r.icon,
    prefix: r.prefix,
    language: r.language,
    showDifficulty: r.showDifficulty,
    image: r.image || undefined,
    sortOrder: r.sortOrder,
  }));

  modulesCache.entry = { data: modules, timestamp: Date.now() };
  return modules;
}

/** Get exercise list for a module (lightweight, for module pages) */
export function getModuleExerciseList(moduleId: string): ExerciseListItem[] {
  const cached = exerciseListCache.get(moduleId);
  if (isFresh(cached)) return cached.data;

  const rows = db
    .select({
      id: exercisesTable.id,
      title: exercisesTable.title,
      prerequisites: exercisesTable.prerequisites,
      difficulty: exercisesTable.difficulty,
      i18n: exercisesTable.i18n,
    })
    .from(exercisesTable)
    .where(eq(exercisesTable.moduleId, moduleId))
    .orderBy(exercisesTable.sortOrder)
    .all();

  const items: ExerciseListItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    prerequisites: JSON.parse(r.prerequisites),
    ...(r.difficulty ? { difficulty: r.difficulty } : {}),
    ...(r.i18n ? { i18n: JSON.parse(r.i18n) } : {}),
  }));

  exerciseListCache.set(moduleId, { data: items, timestamp: Date.now() });
  return items;
}

/** Get exercise metadata (for LabLayout — no functions) */
export function getExerciseMetadata(id: string): ExerciseMetadata | null {
  const cached = exerciseMetadataCache.get(id);
  if (isFresh(cached)) return cached.data;

  const row = db
    .select({
      title: exercisesTable.title,
      briefing: exercisesTable.briefing,
      initialCode: exercisesTable.initialCode,
      language: exercisesTable.language,
      i18n: exercisesTable.i18n,
    })
    .from(exercisesTable)
    .where(eq(exercisesTable.id, id))
    .get();

  if (!row) {
    exerciseMetadataCache.set(id, { data: null, timestamp: Date.now() });
    return null;
  }

  const metadata: ExerciseMetadata = {
    title: row.title,
    briefing: row.briefing,
    initialCode: row.initialCode,
    language: row.language,
    ...(row.i18n ? { i18n: JSON.parse(row.i18n) } : {}),
  };

  exerciseMetadataCache.set(id, { data: metadata, timestamp: Date.now() });
  return metadata;
}

/** Get a single module by ID */
export function getModuleFromDB(id: string): ModuleData | undefined {
  const modules = getModulesFromDB();
  return modules.find((m) => m.id === id);
}
