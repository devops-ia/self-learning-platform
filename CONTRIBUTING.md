# Contributing: Adding New Exercises

This guide explains how to add new exercises to the DevOps Learning Platform.

## Exercise Architecture

Each exercise is a self-contained TypeScript file that defines:

1. **The broken code** the student starts with
2. **Validation rules** that check the student's fix
3. **Simulated terminal commands** that produce realistic output based on the current code state
4. **Progressive hints** revealed after repeated failures
5. **A success message** explaining what was learned

## Step-by-Step: Add a New Exercise

### 1. Create the Exercise File

Create a new `.ts` file in the appropriate module directory:

```
src/lib/exercises/
├── terraform/
│   ├── 01-broken-provider.ts
│   ├── 02-variables-outputs.ts
│   └── 03-your-new-exercise.ts    <-- new file
└── kubernetes/
    ├── 01-invalid-pod.ts
    ├── 02-crashloop-debug.ts
    └── 03-your-new-exercise.ts    <-- new file
```

### 2. Define the Exercise

Every exercise implements the `Exercise` interface from `src/lib/exercises/types.ts`:

```typescript
import { Exercise } from "../types";

export const yourExercise: Exercise = {
  // Unique ID. Convention: "tf-NN-slug" for Terraform, "k8s-NN-slug" for Kubernetes
  id: "tf-03-your-exercise",

  // Which module this belongs to
  module: "terraform",

  // Short title shown in the exercise list
  title: "Tu título aquí",

  // 1-2 sentences. What's broken and why it matters. Spanish (Spain).
  briefing: "Este código tiene X problema. Terraform va a fallar. Corrige el error.",

  // Starting code the student sees in the editor (intentionally broken)
  initialCode: `your broken code here`,

  // "hcl" for Terraform, "yaml" for Kubernetes
  language: "hcl",

  // Simulated terminal commands (see section below)
  terminalCommands: { /* ... */ },

  // Validation rules run in order (see section below)
  validations: [ /* ... */ ],

  // Exercise IDs that must be completed first. Empty array = unlocked by default.
  prerequisites: ["tf-02-variables-outputs"],

  // Progressive hints. Hint N is shown after 2*N failed attempts.
  hints: [
    "First gentle nudge",
    "More specific guidance",
    "Almost the full solution",
  ],

  // Shown when all validations pass. Explain what was learned.
  successMessage: "¡Correcto! Lo que aprendiste:\n- Point 1\n- Point 2",
};
```

### 3. Define Terminal Commands

Terminal commands are functions that receive the student's current code and return simulated output:

```typescript
import { TerminalResponse } from "../types";

terminalCommands: {
  "terraform plan": (code: string): TerminalResponse => {
    // Parse/check the code and return appropriate output
    if (codeHasBug(code)) {
      return {
        output: "Error: realistic error message here",
        exitCode: 1,
      };
    }
    return {
      output: "Success: realistic success output",
      exitCode: 0,
    };
  },
  "terraform init": (code: string): TerminalResponse => {
    // ...
  },
}
```

**Tips:**
- Match real CLI output format as closely as possible
- The output updates dynamically — when the student changes their code and re-runs the command, the output reflects the current state
- For complex logic, extract handler functions (see `02-crashloop-debug.ts` for an example)

### 4. Define Validation Rules

Validations run in order. Each has a type, an error message, and a check function:

```typescript
import { ValidationResult } from "../types";

validations: [
  {
    // "syntax" = basic structural check
    // "semantic" = logical correctness
    // "intention" = matches the intended solution
    type: "syntax",
    errorMessage: "Short description of the rule",
    check: (code: string): ValidationResult => {
      if (/* code fails this check */) {
        return {
          passed: false,
          errorMessage: "Detailed explanation of what's wrong and how to fix it",
        };
      }
      return { passed: true };
    },
  },
  // Add more rules...
]
```

**Tips:**
- Order validations from basic (syntax) to advanced (intention)
- Error messages should explain *why* something is wrong, not just *what* is wrong
- For Kubernetes exercises, use `js-yaml` to parse YAML — it's already a dependency
- For Terraform exercises, use regex-based checks against the HCL text

### 5. Register the Exercise

Add your exercise to the registry in `src/lib/exercises/index.ts`:

```typescript
import { yourExercise } from "./terraform/03-your-exercise";

export const exercises: Record<string, Exercise> = {
  // ... existing exercises
  "tf-03-your-exercise": yourExercise,
};

export const terraformExercises = [brokenProvider, variablesOutputs, yourExercise];
```

### 6. Add the Exercise Page Data

Add the client-side exercise metadata to the exercise page component. For Terraform exercises, edit `src/app/modules/terraform/[exerciseId]/page.tsx`:

```typescript
const exerciseData = {
  // ... existing exercises
  "tf-03-your-exercise": {
    title: "Tu título aquí",
    briefing: "Tu briefing aquí.",
    language: "hcl" as const,
    initialCode: `same initial code as in the exercise definition`,
  },
};
```

### 7. Add to the Module Overview

Add the exercise to the list in the module page. For Terraform, edit `src/app/modules/terraform/page.tsx`:

```typescript
const exercises = [
  // ... existing exercises
  {
    id: "tf-03-your-exercise",
    title: "Tu título aquí",
    status: "locked" as const,
    prerequisites: ["tf-02-variables-outputs"],
  },
];
```

### 8. Test

```bash
npm run dev
```

1. Navigate to the module overview — verify the exercise appears (locked/available)
2. Open the exercise — verify the editor loads with the broken code
3. Type terminal commands — verify simulated output is correct
4. Submit the broken code — verify error feedback is helpful
5. Fix the code — verify all validations pass
6. Check that completing this exercise unlocks the next one

## Language Guidelines

All student-facing text must be in **Spanish (Spain)**:

- Use **tú** form, not voseo: "corrige" not "corregí", "revisa" not "revisá"
- Use "añade" instead of "agregá"
- Keep briefings to 1-2 sentences
- Error messages should mimic real CLI output, then explain in Spanish
- Success messages should list 3-5 specific things the student learned

## File Naming Convention

```
NN-slug.ts
```

- `NN` = two-digit sequential number (01, 02, 03...)
- `slug` = lowercase, hyphen-separated description

## Checklist

- [ ] Exercise file created in `src/lib/exercises/<module>/`
- [ ] Registered in `src/lib/exercises/index.ts`
- [ ] Client-side data added to `src/app/modules/<module>/[exerciseId]/page.tsx`
- [ ] Listed in `src/app/modules/<module>/page.tsx`
- [ ] Prerequisites set correctly
- [ ] Terminal commands produce realistic output for both broken and fixed code
- [ ] Validation error messages explain *why*, not just *what*
- [ ] Hints are progressive (vague → specific)
- [ ] Success message lists what was learned
- [ ] All text in Spanish (Spain, tú form)
- [ ] `npm run build` passes
