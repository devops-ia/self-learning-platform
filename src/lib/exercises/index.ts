import { Exercise } from "./types";
import { getExerciseFromDB, getModuleExercisesFromDB } from "./db-loader";

// Re-export DB loader functions for direct use
export {
  getModulesFromDB,
  getModuleExerciseList,
  getExerciseMetadata,
  getModuleFromDB,
  invalidateExerciseCache,
} from "./db-loader";

export function getExercise(id: string): Exercise | undefined {
  return getExerciseFromDB(id);
}

export function getModuleExercises(module: string): Exercise[] {
  return getModuleExercisesFromDB(module);
}

// Legacy exports — kept for backward compatibility with engine.ts / simulator.ts
// These are now proxies that look up from DB
export const exercises: Record<string, Exercise> = new Proxy(
  {} as Record<string, Exercise>,
  {
    get(_target, prop: string) {
      return getExerciseFromDB(prop);
    },
    has(_target, prop: string) {
      return getExerciseFromDB(prop) !== undefined;
    },
  }
);
