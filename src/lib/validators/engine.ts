import { getExercise } from "../exercises";
import { ValidationResult } from "../exercises/types";
import { es } from "../i18n/locales/es";
import { en } from "../i18n/locales/en";

const locales: Record<string, typeof es> = { es, en };

export interface ValidationResponse {
  passed: boolean;
  results: {
    type: string;
    passed: boolean;
    errorMessage?: string;
  }[];
  summary: string;
  hintsUsed: number;
  nextHint?: string;
}

export function validateExercise(
  exerciseId: string,
  code: string,
  failureCount: number = 0,
  lang: string = "es"
): ValidationResponse {
  const t = locales[lang] || es;
  const exercise = getExercise(exerciseId);
  if (!exercise) {
    return {
      passed: false,
      results: [],
      summary: `${t.exercise.notFound}.`,
      hintsUsed: 0,
    };
  }

  const results: ValidationResponse["results"] = [];
  let allPassed = true;

  for (const rule of exercise.validations) {
    let result: ValidationResult;
    try {
      result = rule.check(code);
    } catch {
      result = {
        passed: false,
        errorMessage: `Error interno al validar: ${rule.errorMessage}`,
      };
    }

    results.push({
      type: rule.type,
      passed: result.passed,
      errorMessage: result.errorMessage,
    });

    if (!result.passed) {
      allPassed = false;
    }
  }

  const failedResults = results.filter((r) => !r.passed);
  let summary: string;

  if (allPassed) {
    summary = exercise.successMessage;
  } else {
    const firstError = failedResults[0];
    summary = firstError.errorMessage || "Hay errores en el código.";
    if (failedResults.length > 1) {
      summary += `\n\n(${failedResults.length - 1} error(es) más)`;
    }
  }

  // Progressive hints: unlock one hint per 2 failures
  const hintIndex = Math.min(
    Math.floor(failureCount / 2),
    exercise.hints.length - 1
  );
  const nextHint = !allPassed && failureCount >= 2 ? exercise.hints[hintIndex] : undefined;

  return {
    passed: allPassed,
    results,
    summary,
    hintsUsed: nextHint ? hintIndex + 1 : 0,
    nextHint,
  };
}
