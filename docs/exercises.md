# Exercises Guide

Exercises are stored in the SQLite database and loaded at runtime. There are three ways to manage them.

## Method 1: YAML Import (Recommended for Bulk)

Best for adding multiple exercises at once or version-controlling exercise content.

### Create an exercise

```bash
# 1. Copy the template
cp exercises/_template.yaml exercises/terraform/14-my-exercise.yaml

# 2. Edit the YAML file (see format below)

# 3. Import into database
npm run exercises:import
```

The import is idempotent (INSERT OR REPLACE) so re-running is safe.

### YAML file structure

```yaml
id: "tf-14-my-exercise"
title: "Titulo del ejercicio"
briefing: "1-2 frases explicando que esta roto y por que importa."

# Optional: exercises that must be completed first. Default: [] (no prerequisites)
prerequisites: []

# Optional: override the module's default language
# language: "hcl"

initialCode: |
  # The broken code the student starts with
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

# Optional: translations
i18n:
  en:
    title: "Exercise title"
    briefing: "1-2 sentences explaining what's broken."
    hints:
      - "First general hint."
      - "Second more specific hint."
      - "Third hint: almost the solution."
    successMessage: |
      Correct!

      What you learned:
      - Point 1
      - Point 2

validations:
  - type: syntax
    errorMessage: "Short error description."
    check:
      contains: "tags"
    failMessage: |
      Error: detailed error message
      Explanation of what's wrong and how to fix it.

terminalCommands:
  "terraform plan":
    - when:
        not_contains: "tags"
      output: "Error: missing tags"
      exitCode: 1
    - output: "Plan: 1 to add"
      exitCode: 0
```

### ID format

```
<prefix>-<NN>-<slug>
```

- `prefix`: from `_modules.yaml` (tf, k8s, ans)
- `NN`: two-digit number (01, 02...)
- `slug`: lowercase hyphen-separated

### Check DSL reference

| Check | Description | Example |
|-------|-------------|---------|
| `contains: "str"` | Code includes string | `contains: "provider"` |
| `not_contains: "str"` | Code does NOT include | `not_contains: "zones"` |
| `match: "regex"` | Code matches regex | `match: "region\\s*="` |
| `not_match: "regex"` | Code does NOT match | `not_match: "zones\\s*="` |
| `yaml_valid: true` | YAML parses OK | `yaml_valid: true` |
| `yaml_has: "path"` | Field exists | `yaml_has: "spec.containers"` |
| `yaml_not_has: "path"` | Field absent | `yaml_not_has: "spec.container"` |
| `yaml_is_array: "path"` | Field is array | `yaml_is_array: "spec.containers"` |
| `yaml_equals: {path, value}` | Field equals value | `yaml_equals: {path: "kind", value: "Pod"}` |
| `yaml_items_have: {path, fields}` | Items have fields | `yaml_items_have: {path: "spec.containers", fields: ["name"]}` |

**Combinators:**

```yaml
# AND
check:
  all:
    - contains: "Name"
    - contains: "Environment"

# OR
check:
  any:
    - contains: "Always"
    - contains: "IfNotPresent"

# NOT
check:
  not: { yaml_valid: true }
```

**Custom JavaScript (escape hatch):**

```yaml
check:
  custom: |
    // Receives: code (string), yaml (js-yaml module), _get (nested path helper)
    const parsed = yaml.load(code);
    const containers = _get(parsed, "spec.containers");
    if (!Array.isArray(containers)) {
      return { passed: false, errorMessage: "containers must be an array" };
    }
    return { passed: true };
```

### Terminal commands

Evaluated top to bottom; first match wins. Last entry (without `when`) is the default.

```yaml
terminalCommands:
  "kubectl apply -f pod.yaml":
    - when: { not: { yaml_valid: true } }
      output: "error: invalid YAML"
      exitCode: 1
    - when: { yaml_not_has: "spec.containers" }
      output: "Error: missing containers"
      exitCode: 1
    - output: "pod/my-pod created"
      exitCode: 0
```

## Method 2: Admin Panel

Best for quick edits or creating individual exercises.

1. Log in as admin at `/login` (default: `admin@devopslab.local` / `admin1234`)
2. Go to `/admin/exercises`
3. Click "Create exercise"
4. Fill in all fields (validations and terminal commands are JSON)
5. Save

Changes are immediate — no build or restart needed.

### Admin API

You can also use the REST API directly:

```bash
# List exercises
curl http://localhost:3000/api/admin/exercises \
  -H "Cookie: devops-lab-session=<session>"

# Create exercise
curl -X POST http://localhost:3000/api/admin/exercises \
  -H "Content-Type: application/json" \
  -H "Cookie: devops-lab-session=<session>" \
  -d '{
    "id": "tf-14-my-exercise",
    "moduleId": "terraform",
    "title": "My Exercise",
    "briefing": "Fix this broken code.",
    "language": "hcl",
    "initialCode": "resource \"aws_instance\" \"web\" {\n  ami = \"ami-123\"\n}",
    "hints": ["Hint 1", "Hint 2"],
    "successMessage": "Correct!",
    "validations": [
      {
        "type": "syntax",
        "errorMessage": "Missing tags",
        "check": {"contains": "tags"},
        "failMessage": "Error: no tags found"
      }
    ],
    "terminalCommands": {
      "terraform plan": [
        {"when": {"not_contains": "tags"}, "output": "Error: missing tags", "exitCode": 1},
        {"output": "Plan: 1 to add", "exitCode": 0}
      ]
    },
    "sortOrder": 14
  }'

# Update exercise
curl -X PATCH http://localhost:3000/api/admin/exercises/tf-14-my-exercise \
  -H "Content-Type: application/json" \
  -H "Cookie: devops-lab-session=<session>" \
  -d '{"title": "Updated Title"}'

# Delete exercise
curl -X DELETE http://localhost:3000/api/admin/exercises/tf-14-my-exercise \
  -H "Cookie: devops-lab-session=<session>"
```

## Method 3: Direct Database

For scripting or migration tools:

```bash
sqlite3 data/learning-platform.db

-- List all exercises
SELECT id, module_id, title FROM exercises ORDER BY module_id, sort_order;

-- Insert an exercise
INSERT INTO exercises (id, module_id, title, briefing, language, initial_code, hints, success_message, validations, terminal_commands, sort_order)
VALUES ('tf-14-test', 'terraform', 'Test', 'Fix this.', 'hcl', 'code here', '["hint"]', 'Done!', '[{"type":"syntax","errorMessage":"err","check":{"contains":"fix"},"failMessage":"fail"}]', '{}', 14);
```

## Adding a New Module

### Via YAML

Add to `exercises/_modules.yaml`:

```yaml
modules:
  docker:
    title: "Docker"
    description:
      es: "Aprende a escribir Dockerfiles corrigiendo errores comunes."
      en: "Learn to write Dockerfiles by fixing common errors."
    icon: "Box"
    prefix: "dk"
    language: "dockerfile"
```

Then create exercises and import:

```bash
mkdir exercises/docker
cp exercises/_template.yaml exercises/docker/01-broken-dockerfile.yaml
# Edit the file...
npm run exercises:import
```

### Via Admin Panel

Go to `/admin/modules` and click "Create module". Fill in:
- **ID**: `docker` (URL slug)
- **Title**: `Docker`
- **Prefix**: `dk` (used in exercise IDs)
- **Icon**: `Box` (lucide-react icon name)
- **Language**: `dockerfile`
- **Descriptions**: Spanish and English

Available icons: Terminal, Box, Cog, Settings, Server, Cloud, Database, Shield, Code, FileCode, Container, GitBranch, Globe, Lock, Cpu, HardDrive.
