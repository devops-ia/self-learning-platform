import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateExercise } from "../engine";
import type { Exercise } from "@/lib/exercises/types";

// Mock the exercise loader so tests don't depend on the DB
vi.mock("@/lib/exercises", () => ({
  getExercise: vi.fn(),
}));

import { getExercise } from "@/lib/exercises";
const mockGetExercise = vi.mocked(getExercise);

// ---------------------------------------------------------------------------
// Helper: build a mock Exercise
// ---------------------------------------------------------------------------
function makeMockExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "test-01",
    module: "test",
    title: "Test Exercise",
    briefing: "Do the thing.",
    initialCode: "",
    language: "hcl",
    terminalCommands: {},
    validations: [],
    prerequisites: [],
    hints: ["Hint 1", "Hint 2", "Hint 3"],
    successMessage: "Great job!",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("validateExercise", () => {
  beforeEach(() => {
    mockGetExercise.mockReset();
  });

  // 1. Returns "not found" for unknown exercise ID
  it("returns not-found result for an unknown exercise ID", () => {
    mockGetExercise.mockReturnValue(undefined);

    const result = validateExercise("non-existent", "some code");

    expect(result.passed).toBe(false);
    expect(result.results).toHaveLength(0);
    expect(result.summary).toContain("no encontrado");
    expect(result.hintsUsed).toBe(0);
  });

  // 1b. Not-found message respects the lang parameter
  it("returns English not-found message when lang is 'en'", () => {
    mockGetExercise.mockReturnValue(undefined);

    const result = validateExercise("non-existent", "code", 0, "en");

    expect(result.passed).toBe(false);
    expect(result.summary).toContain("not found");
  });

  // 2. Returns passed=true when all validations pass
  it("returns passed=true when all validations pass", () => {
    const exercise = makeMockExercise({
      validations: [
        {
          type: "syntax",
          errorMessage: "Must contain provider",
          check: (code: string) => ({
            passed: code.includes("provider"),
          }),
        },
        {
          type: "semantic",
          errorMessage: "Must contain resource",
          check: (code: string) => ({
            passed: code.includes("resource"),
          }),
        },
      ],
    });
    mockGetExercise.mockReturnValue(exercise);

    const result = validateExercise(
      "test-01",
      'provider "aws" {}\nresource "ec2" {}'
    );

    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.passed)).toBe(true);
    expect(result.summary).toBe("Great job!");
  });

  // 3. Returns passed=false when a validation fails
  it("returns passed=false when a validation fails", () => {
    const exercise = makeMockExercise({
      validations: [
        {
          type: "syntax",
          errorMessage: "Must contain provider",
          check: (code: string) => ({
            passed: code.includes("provider"),
          }),
        },
        {
          type: "semantic",
          errorMessage: "Must contain resource",
          check: (code: string) => ({
            passed: code.includes("resource"),
            errorMessage: "Missing resource block",
          }),
        },
      ],
    });
    mockGetExercise.mockReturnValue(exercise);

    const result = validateExercise("test-01", 'provider "aws" {}');

    expect(result.passed).toBe(false);
    expect(result.results[0].passed).toBe(true);
    expect(result.results[1].passed).toBe(false);
  });

  // 4. Shows first error message when multiple validations fail
  it("shows first error message in summary when multiple validations fail", () => {
    const exercise = makeMockExercise({
      validations: [
        {
          type: "syntax",
          errorMessage: "Missing provider",
          check: () => ({
            passed: false,
            errorMessage: "You need a provider block",
          }),
        },
        {
          type: "semantic",
          errorMessage: "Missing resource",
          check: () => ({
            passed: false,
            errorMessage: "You need a resource block",
          }),
        },
        {
          type: "intention",
          errorMessage: "Missing output",
          check: () => ({
            passed: false,
            errorMessage: "You need an output block",
          }),
        },
      ],
    });
    mockGetExercise.mockReturnValue(exercise);

    const result = validateExercise("test-01", "");

    expect(result.passed).toBe(false);
    // Summary starts with the first error message
    expect(result.summary).toContain("You need a provider block");
    // And appends the extra-errors count
    expect(result.summary).toContain("2 error(es)");
  });

  // 5. Shows hint after 2+ failures (failureCount >= 2)
  it("shows a hint when failureCount >= 2", () => {
    const exercise = makeMockExercise({
      hints: ["Hint A", "Hint B", "Hint C"],
      validations: [
        {
          type: "syntax",
          errorMessage: "Fail",
          check: () => ({ passed: false, errorMessage: "wrong" }),
        },
      ],
    });
    mockGetExercise.mockReturnValue(exercise);

    const result = validateExercise("test-01", "", 2);

    // hintIndex = min(floor(2/2), 2) = 1 => hints[1] = "Hint B"
    expect(result.nextHint).toBe("Hint B");
    expect(result.hintsUsed).toBe(2);
  });

  // 6. Does not show hint when failureCount < 2
  it("does not show a hint when failureCount < 2", () => {
    const exercise = makeMockExercise({
      hints: ["Hint A"],
      validations: [
        {
          type: "syntax",
          errorMessage: "Fail",
          check: () => ({ passed: false, errorMessage: "wrong" }),
        },
      ],
    });
    mockGetExercise.mockReturnValue(exercise);

    const result0 = validateExercise("test-01", "", 0);
    expect(result0.nextHint).toBeUndefined();
    expect(result0.hintsUsed).toBe(0);

    const result1 = validateExercise("test-01", "", 1);
    expect(result1.nextHint).toBeUndefined();
    expect(result1.hintsUsed).toBe(0);
  });

  // 7. Shows progressive hints (hint index = floor(failureCount/2))
  it("unlocks progressive hints based on failureCount", () => {
    const exercise = makeMockExercise({
      hints: ["Hint 0", "Hint 1", "Hint 2"],
      validations: [
        {
          type: "syntax",
          errorMessage: "Fail",
          check: () => ({ passed: false, errorMessage: "wrong" }),
        },
      ],
    });
    mockGetExercise.mockReturnValue(exercise);

    // failureCount=2 -> index floor(2/2)=1 -> Hint 1 (but capped: min(1, 2)=1)
    // Actually: hintIndex = min(floor(failureCount/2), hints.length-1)
    // fc=2 -> floor(2/2)=1, min(1,2)=1 -> hints[1]="Hint 1"
    const r2 = validateExercise("test-01", "", 2);
    expect(r2.nextHint).toBe("Hint 1");
    expect(r2.hintsUsed).toBe(2);

    // fc=3 -> floor(3/2)=1, hints[1]="Hint 1"
    const r3 = validateExercise("test-01", "", 3);
    expect(r3.nextHint).toBe("Hint 1");
    expect(r3.hintsUsed).toBe(2);

    // fc=4 -> floor(4/2)=2, hints[2]="Hint 2"
    const r4 = validateExercise("test-01", "", 4);
    expect(r4.nextHint).toBe("Hint 2");
    expect(r4.hintsUsed).toBe(3);

    // fc=100 -> floor(100/2)=50, min(50,2)=2 -> hints[2]="Hint 2" (capped)
    const rBig = validateExercise("test-01", "", 100);
    expect(rBig.nextHint).toBe("Hint 2");
    expect(rBig.hintsUsed).toBe(3);
  });

  // 8. Does not show hint when exercise passes (even if failureCount >= 2)
  it("does not show a hint when the exercise passes", () => {
    const exercise = makeMockExercise({
      hints: ["Hint A"],
      validations: [
        {
          type: "syntax",
          errorMessage: "Check",
          check: () => ({ passed: true }),
        },
      ],
    });
    mockGetExercise.mockReturnValue(exercise);

    const result = validateExercise("test-01", "good code", 5);
    expect(result.passed).toBe(true);
    expect(result.nextHint).toBeUndefined();
  });

  // 9. Catches exceptions thrown by a check function
  it("catches exceptions thrown by a check function", () => {
    const exercise = makeMockExercise({
      validations: [
        {
          type: "syntax",
          errorMessage: "Explosive check",
          check: () => {
            throw new Error("boom");
          },
        },
      ],
    });
    mockGetExercise.mockReturnValue(exercise);

    const result = validateExercise("test-01", "code");

    expect(result.passed).toBe(false);
    expect(result.results[0].passed).toBe(false);
    expect(result.results[0].errorMessage).toContain("Explosive check");
  });
});
