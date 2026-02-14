# Contributing

## Development Setup

### Prerequisites

- Node.js 22 or higher
- npm (included with Node.js)
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/devops-ia/self-learning-platform.git
   cd self-learning-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create and seed the database:
   ```bash
   npm run db:seed
   ```

4. Import exercise definitions:
   ```bash
   npm run exercises:import
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at http://localhost:3000

## Available Commands

### npm Scripts

- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run db:seed` - Create or reset SQLite database tables
- `npm run exercises:import` - Import YAML exercises into database

### Makefile Targets

For convenience, the project includes a Makefile with common tasks:

- `make install` - Install npm dependencies
- `make dev` - Start development server
- `make build` - Full production build (seed + import + build)
- `make lint` - Run ESLint
- `make seed` - Create or reset database tables
- `make import` - Import YAML exercises into database
- `make test` - Run tests

See `make help` for the complete list of available commands.

## Coding Standards

- **TypeScript**: All code must use TypeScript in strict mode
- **Styling**: Use Tailwind CSS 4 for all styles. Do not use custom CSS unless absolutely necessary
- **Database**: Use Drizzle ORM for all database operations
- **Validation**: Use Zod schemas for input validation
- **Internationalization**: Use the `useT()` hook for all UI strings. Add translations to `src/lib/i18n/locales/`
- **Code formatting**: No emojis in code, comments, or commit messages
- **File organization**: Follow the existing directory structure. Prefer editing existing files over creating new ones

## Pull Request Workflow

1. Create a new branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes following the coding standards

3. Verify your changes:
   ```bash
   npm run lint
   npm run build
   ```

4. Commit your changes using conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `refactor:` for code refactoring
   - `test:` for test additions or changes
   - `chore:` for maintenance tasks

   Example:
   ```bash
   git add .
   git commit -m "feat: add Ansible module support"
   ```

5. Push your branch and open a pull request:
   ```bash
   git push origin feat/your-feature-name
   ```

6. CI will run automatically to verify linting and build. Address any issues before requesting review.

## Adding New Exercises

Exercises are stored in the database and loaded at runtime. There are two ways to add them: **YAML import** (recommended) or **admin panel**.

## Quick Start: Add an Exercise via YAML

1. Copy the template:
   ```bash
   cp exercises/_template.yaml exercises/<module>/NN-slug.yaml
   ```

2. Edit the YAML file (see [YAML Format](#yaml-exercise-format) below)

3. Import into the database:
   ```bash
   npm run exercises:import
   ```

4. Test:
   ```bash
   npm run dev
   ```

That's it. The import script reads the YAML, validates it, and inserts/updates the exercise in the database. The app loads it at runtime.

## Quick Start: Add an Exercise via Admin Panel

1. Log in as admin (default: `admin@devopslab.local` / `admin1234`)
2. Go to `/admin/exercises` and click "Create exercise"
3. Fill in the fields (ID, module, title, briefing, initial code, validations, terminal commands)
4. Save — the exercise is immediately available

## Adding a New Technology Module

### Via YAML

1. Add the module to `exercises/_modules.yaml`:
   ```yaml
   modules:
     ansible:
       title: "Ansible"
       description:
         es: "Aprende a escribir playbooks de Ansible corrigiendo errores comunes."
         en: "Learn to write Ansible playbooks by fixing common errors."
       icon: "Cog"          # lucide-react icon name
       prefix: "ans"        # ID prefix for exercises
       language: "yaml"     # default language for the module
   ```

2. Create exercises in `exercises/ansible/`:
   ```bash
   mkdir exercises/ansible
   cp exercises/_template.yaml exercises/ansible/01-broken-playbook.yaml
   ```

3. Import and test:
   ```bash
   npm run exercises:import
   npm run dev
   # Navigate to /modules/ansible
   ```

### Via Admin Panel

1. Go to `/admin/modules` and click "Create module"
2. Fill in the module details (ID, title, prefix, icon, language, descriptions)
3. Create exercises under the new module at `/admin/exercises`

Available icons: Terminal, Box, Cog, Settings, Server, Cloud, Database, Shield.

## YAML Exercise Format

Each exercise is a YAML file in `exercises/<module>/NN-slug.yaml`.

```yaml
id: tf-13-no-tags
title: "Recursos sin tags"
briefing: "Estos recursos no tienen tags. Anade los tags necesarios."

prerequisites: []  # optional, empty = no prerequisites
# language: "hcl"  # optional, defaults to module's language

initialCode: |
  resource "aws_instance" "web" {
    ami = "ami-0c55b159cbfafe1f0"
  }

hints:
  - "Primera pista general."
  - "Segunda pista mas especifica."
  - "Tercera pista: casi la solucion."

successMessage: |
  Correcto!

  Lo que aprendiste:
  - Punto 1
  - Punto 2

validations:
  - type: syntax
    errorMessage: "Descripcion corta."
    check:
      contains: "tags"
    failMessage: |
      Error: no tags found
      Explicacion detallada.

terminalCommands:
  "terraform plan":
    - when:
        not_contains: "tags"
      output: "Error: missing tags"
      exitCode: 1
    - output: "Plan: 1 to add"
      exitCode: 0
```

### Declarative Check Reference

Checks define conditions on the student's code. Used in both `validations[].check` and `terminalCommands[].when`.

| Check | Description | Example |
|-------|-------------|---------|
| `contains: "str"` | Code includes string | `contains: "required_providers"` |
| `not_contains: "str"` | Code does NOT include string | `not_contains: "zones"` |
| `match: "regex"` | Code matches regex | `match: "region\\s*="` |
| `not_match: "regex"` | Code does NOT match regex | `not_match: "zones\\s*="` |
| `yaml_valid: true` | YAML parses without errors | `yaml_valid: true` |
| `yaml_has: "path"` | Nested field exists | `yaml_has: "spec.containers"` |
| `yaml_not_has: "path"` | Nested field does NOT exist | `yaml_not_has: "spec.container"` |
| `yaml_is_array: "path"` | Field is an array | `yaml_is_array: "spec.containers"` |
| `yaml_equals: {path, value}` | Field equals value | `yaml_equals: {path: "kind", value: "Pod"}` |
| `yaml_items_have: {path, fields}` | Array items have fields | `yaml_items_have: {path: "spec.containers", fields: ["name","image"]}` |

Paths support array indices: `spec.containers.0.resources.limits.cpu`

### Combinators

```yaml
# AND — all must be true
check:
  all:
    - contains: "Name"
    - contains: "Environment"

# OR — at least one must be true
check:
  any:
    - contains: "Always"
    - contains: "IfNotPresent"

# NOT — negate a check
check:
  not: { yaml_valid: true }
```

### Custom JavaScript (Escape Hatch)

For validations that can't be expressed declaratively:

```yaml
validations:
  - type: semantic
    errorMessage: "Custom check."
    check:
      custom: |
        const match = code.match(/resource\s+"aws_instance"/);
        if (!match) {
          return { passed: false, errorMessage: "No instance found" };
        }
        return { passed: true };
    failMessage: ""  # not used when custom provides errorMessage
```

For Kubernetes exercises, `yaml` (js-yaml) and `_get` (nested field helper) are available:

```yaml
check:
  custom: |
    const parsed = yaml.load(code) as Record<string, unknown>;
    const containers = _get(parsed, "spec.containers");
    if (!Array.isArray(containers)) {
      return { passed: false, errorMessage: "containers must be an array" };
    }
    return { passed: true };
```

## Validation Types

Order validations from basic to advanced:

1. **syntax** — Parse-level checks (YAML valid, required blocks present)
2. **semantic** — Schema-level checks (correct field names, types)
3. **intention** — Logic checks (dependencies, cross-references)

## Terminal Commands

Ordered list of condition-response pairs. Evaluated top to bottom; first match wins. Last entry (without `when`) is the default.

```yaml
terminalCommands:
  "kubectl apply -f pod.yaml":
    - when: { not: { yaml_valid: true } }
      output: "error: invalid YAML"
      exitCode: 1
    - when: { yaml_not_has: "spec.containers" }
      output: "Error: missing containers"
      exitCode: 1
    - output: "pod/my-pod created"  # default
      exitCode: 0
```

## Translations (i18n)

The platform supports multiple languages. The default language is **Spanish (Spain)**, and English (US) is included. You can add more languages.

### How it works

- **UI strings**: defined in `src/lib/i18n/locales/{es,en}.ts`
- **Exercise content**: default in YAML (Spanish), optional `i18n:` block for translations
- **Module descriptions**: per-language in `exercises/_modules.yaml`
- **Language selection**: client-side via `<select>` in the navbar, saved in localStorage

### Adding a new UI language

1. Copy an existing locale file:
   ```bash
   cp src/lib/i18n/locales/en.ts src/lib/i18n/locales/fr.ts
   ```

2. Translate all strings in the new file

3. Register the locale in `src/lib/i18n/context.tsx`:
   ```tsx
   import { fr } from "./locales/fr";

   const locales: Record<string, Translations> = { es, en, fr };

   export const availableLanguages = [
     { code: "es", label: "Español" },
     { code: "en", label: "English" },
     { code: "fr", label: "Français" },
   ];
   ```

4. Add the locale to the server-side files too:
   - `src/lib/terminal/simulator.ts`: add `import { fr } from "../i18n/locales/fr";` and add to `locales`
   - `src/lib/validators/engine.ts`: same pattern

### Translating exercise content

Add an `i18n:` block to any exercise YAML:

```yaml
title: "Playbook sin hosts"
briefing: "Este playbook no tiene hosts..."

i18n:
  en:
    title: "Playbook without hosts"
    briefing: "This playbook is missing the hosts field..."
    hints:
      - "An Ansible play needs the hosts: field..."
    successMessage: |
      Correct! The playbook now has hosts defined.
      ...
```

Only include the fields you want to translate. Missing fields fall back to the default (Spanish).

### Translating module descriptions

In `exercises/_modules.yaml`, use a map for `description`:

```yaml
modules:
  terraform:
    title: "Terraform"
    description:
      es: "Aprende a configurar infraestructura como código..."
      en: "Learn to configure infrastructure as code..."
```

### Language guidelines (Spanish)

The default language is **Spanish (Spain, tu form)**:

- Use **tu** form: "corrige" not "corregi", "revisa" not "revisa"
- Use "anade" instead of "agrega"
- Keep briefings to 1-2 sentences
- Error messages should mimic real CLI output, then explain in Spanish
- Success messages should list 3-5 specific things the student learned

## File Naming

```
NN-slug.yaml
```

- `NN` = two-digit sequential number (01, 02, 03...)
- `slug` = lowercase, hyphen-separated description

## ID Format

```
<prefix>-<NN>-<slug>
```

- `prefix` = module prefix from `_modules.yaml` (tf, k8s, ans, etc.)
- `NN` = matches the file number
- `slug` = matches the file slug

## Checklist

### YAML exercises
- [ ] YAML file created in `exercises/<module>/`
- [ ] ID matches `<prefix>-NN-slug` format
- [ ] `npm run exercises:import` succeeds
- [ ] `npm run build` passes
- [ ] Exercise appears in module overview
- [ ] Terminal commands produce realistic output
- [ ] Validation errors explain *why*, not just *what*
- [ ] Hints are progressive (vague -> specific)
- [ ] Default text in Spanish (Spain, tu form)
- [ ] English translation added in `i18n.en` block (optional but appreciated)

### New modules

- [ ] Module added to `exercises/_modules.yaml` with per-language descriptions
- [ ] At least one exercise YAML exists
- [ ] `npm run exercises:import` succeeds
- [ ] Module page renders at `/modules/<slug>`

### New language

- [ ] Locale file created in `src/lib/i18n/locales/`
- [ ] Registered in `src/lib/i18n/context.tsx`
- [ ] Added to `src/lib/terminal/simulator.ts` and `src/lib/validators/engine.ts`
- [ ] All UI strings translated
- [ ] Module descriptions added in `exercises/_modules.yaml`
