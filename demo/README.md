# Interview Demo

Complete demo setup for using the Self-Learning Platform as a technical interview tool for DevOps and software engineering positions.

## What's Included

```
demo/
├── README.md                          # This guide
└── exercises/
    ├── _modules.yaml                  # Module configuration (5 modules)
    ├── terraform/
    │   ├── 01-undeclared-variables.yaml   # Easy - Variable declaration
    │   ├── 02-invalid-count.yaml          # Easy - Type system
    │   ├── 03-missing-backend.yaml        # Medium - Backend configuration
    │   └── 04-lifecycle-prevent-destroy.yaml  # Hard - Lifecycle rules
    ├── kubernetes/
    │   ├── 01-service-wrong-port.yaml     # Easy - Service networking
    │   ├── 02-broken-liveness.yaml        # Easy - Health probes
    │   ├── 03-deployment-no-selector.yaml # Medium - Deployment selectors
    │   └── 04-resource-limits-oom.yaml    # Hard - Resource management
    ├── python/
    │   ├── 01-indentation-error.yaml      # Easy - Indentation
    │   ├── 02-mutable-default.yaml        # Easy - Mutable default args
    │   ├── 03-exception-handling.yaml     # Medium - Silent exceptions
    │   └── 04-unhashable-type.yaml        # Hard - __eq__ without __hash__
    ├── golang/
    │   ├── 01-unused-variable.yaml        # Easy - Unused variables
    │   ├── 02-nil-pointer.yaml            # Easy - Nil pointer dereference
    │   ├── 03-goroutine-leak.yaml         # Medium - Goroutine leak
    │   └── 04-race-condition.yaml         # Hard - Concurrent map writes
    └── java/
        ├── 01-null-pointer.yaml           # Easy - NullPointerException
        ├── 02-equals-hashcode.yaml        # Easy - equals/hashCode contract
        ├── 03-resource-leak.yaml          # Medium - Unclosed BufferedReader
        └── 04-concurrent-modification.yaml # Hard - ConcurrentModificationException
```

### Exercise Difficulty Map

**DevOps (Terraform + Kubernetes)**

| # | Terraform | Kubernetes | Level | Time |
|---|-----------|------------|-------|------|
| 1 | Undeclared variables | Service missing targetPort | Easy | 10-15 min |
| 2 | count as string | Invalid liveness probe port | Easy | 10-15 min |
| 3 | Missing backend + provider | Deployment without selector | Medium | 15-20 min |
| 4 | Lifecycle conflict | Resource limits/requests mismatch | Hard | 20-25 min |

**Software Engineering (Python, Go, Java)**

| # | Python | Go | Java | Level | Time |
|---|--------|-----|------|-------|------|
| 1 | Indentation error | Unused variable | NullPointerException | Easy | 10-15 min |
| 2 | Mutable default arg | Nil pointer dereference | equals/hashCode contract | Easy | 10-15 min |
| 3 | Silent except:pass | Goroutine leak | Resource leak (BufferedReader) | Medium | 15-20 min |
| 4 | **eq** without **hash** | Concurrent map race | ConcurrentModificationException | Hard | 20-25 min |

## Quick Start

### 1. Install the Platform

```bash
git clone <repository-url>
cd self-learning-platform
npm install
```

### 2. Configure Environment

Create a `.env.local` file:

```env
# Required: secret for session encryption (min 32 chars)
SESSION_SECRET=your-secret-key-at-least-32-characters-long

# Optional: admin credentials (defaults shown)
ADMIN_EMAIL=admin@devopslab.local
ADMIN_PASSWORD=admin1234

# Optional: platform title
PLATFORM_TITLE=DevOps Interview Platform

# Optional: SMTP for email verification (can skip for interviews)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=user
# SMTP_PASS=pass
# SMTP_FROM=noreply@example.com
```

### 3. Initialize Database

```bash
npm run db:seed
```

This creates the SQLite database with tables and a default admin user.

### 4. Load Interview Exercises

```bash
# Copy demo exercises into the exercises directory
cp -r demo/exercises/* exercises/

# Import into the database
npm run exercises:import
```

Expected output:

```
Importing exercises from YAML into database...

  Module: terraform (Terraform)
  Module: kubernetes (Kubernetes)
  Module: python (Python)
  Module: golang (Go)
  Module: java (Java)
  terraform/01-undeclared-variables.yaml -> tf-01-undeclared-variables
  terraform/02-invalid-count.yaml -> tf-02-invalid-count
  ...
  python/01-indentation-error.yaml -> py-01-indentation-error
  ...
  golang/01-unused-variable.yaml -> go-01-unused-variable
  ...
  java/01-null-pointer.yaml -> java-01-null-pointer
  ...

Imported 20 exercise(s) into database.
```

### 5. Build and Start

```bash
npm run build
npm start
```

The platform is now running at `http://localhost:3000`.

### 6. Configure for Interviews

1. Log in as admin: `http://localhost:3000/login`
   - Email: `admin@devopslab.local` (or your ADMIN_EMAIL)
   - Password: `admin1234` (or your ADMIN_PASSWORD)

2. Go to **Admin → Settings**:
   - **User registration**: OFF (prevent unauthorized access)
   - **Demo mode**: OFF
   - **Anonymous access**: OFF
   - **Platform title**: "DevOps Interview" (or your company name)

3. Go to **Admin → Users → Create user** for each candidate:
   - Email: candidate's email or `candidate-YYYY-MM-DD@interview.local`
   - Password: temporary password (share securely)
   - Role: user

## Interview Workflows

### Junior/Mid-Level Terraform (45-60 min)

Select exercises 1 and 2 (easy). These test:

- Reading and understanding error messages
- Variable declaration and HCL type system
- Basic `terraform plan` / `terraform init` workflow

**Suggested flow:**

1. Exercise 1: Undeclared Variables (20-25 min)
2. Exercise 2: Invalid Count (15-20 min)
3. Follow-up discussion (10-15 min)

### Mid-Level Terraform (60-75 min)

Select exercises 1, 2, and 3. Add backend configuration to test:

- Provider and backend concepts
- State management understanding
- Real-world infrastructure setup

### Senior Terraform (60-90 min)

Use all 4 exercises. Exercise 4 tests:

- Lifecycle meta-arguments and their interactions
- Understanding of `prevent_destroy` vs conditional creation
- `create_before_destroy` patterns for zero-downtime deployments

### Junior/Mid-Level Kubernetes (45-60 min)

Select exercises 1 and 2 (easy). These test:

- Service networking (port vs targetPort)
- Health probe configuration
- Basic `kubectl` debugging workflow

### Mid-Level Kubernetes (60-75 min)

Select exercises 1, 2, and 3. Add Deployment configuration to test:

- Label selectors and matching
- Deployment spec requirements
- Understanding of ReplicaSet management

### Senior Kubernetes (60-90 min)

Use all 4 exercises. Exercise 4 tests:

- Resource management (requests vs limits)
- Understanding of OOM behavior
- QoS classes and scheduling implications

### Junior/Mid-Level Python (45-60 min)

Select exercises 1 and 2 (easy). These test:

- Understanding of indentation as block structure
- Knowledge of mutable default argument pitfall
- Basic Python debugging skills

### Senior Python (60-90 min)

Use all 4 exercises. Exercises 3-4 test:

- Exception handling best practices (no bare `except: pass`)
- Python data model (`__eq__`/`__hash__` contract)
- Deep understanding of hashability and collections

### Junior/Mid-Level Go (45-60 min)

Select exercises 1 and 2 (easy). These test:

- Go's strict compilation rules (unused variables/imports)
- Nil safety and zero values
- Basic `go run` / `go build` workflow

### Senior Go (60-90 min)

Use all 4 exercises. Exercises 3-4 test:

- Channel mechanics and goroutine lifecycle
- Concurrent map access and sync.Mutex usage
- Understanding of Go's race detector

### Junior/Mid-Level Java (45-60 min)

Select exercises 1 and 2 (easy). These test:

- NullPointerException handling
- equals/hashCode contract for collections
- Basic Java debugging skills

### Senior Java (60-90 min)

Use all 4 exercises. Exercises 3-4 test:

- Resource management (try-with-resources)
- ConcurrentModificationException and iterator safety
- Understanding of Java collection internals

### Mixed Interview (DevOps Generalist)

Pick 1 Terraform + 1 Kubernetes exercise:

- **Junior**: tf-01 + k8s-01 (both easy, 40 min)
- **Mid**: tf-02 + k8s-03 (easy + medium, 50 min)
- **Senior**: tf-04 + k8s-04 (both hard, 50 min)

### Mixed Interview (Full-Stack / Backend)

Pick exercises from different language modules:

- **Junior**: py-01 + java-01 (both easy, 40 min)
- **Mid**: py-03 + go-02 (medium + easy, 50 min)
- **Senior**: go-04 + java-04 (both hard, 50 min)

## Evaluation Guide

### What to Observe

1. **First reaction**: Do they read the error? Run a command? Panic?
2. **Debugging method**: Systematic or trial-and-error?
3. **CLI usage**: Comfortable with terraform/kubectl?
4. **Error comprehension**: Can they parse error messages?
5. **Solution quality**: Clean fix or hacky workaround?

### Scoring Rubric (per exercise, 35 points max)

| Criterion | Poor (0-2) | Good (3-4) | Excellent (5) |
|-----------|-----------|-----------|--------------|
| **Correctness** | Doesn't work | Works, minor issues | Perfect, best practices |
| **Speed** | Excessive time, needs hints | Reasonable time | Quick, identifies issues fast |
| **CLI Fluency** | Doesn't use terminal | Uses basic commands | Expert, multiple debug commands |
| **Debugging Method** | Random guessing | Systematic approach | Methodical, forms hypotheses |
| **Conceptual Depth** | Can't explain solution | Understands core concepts | Deep knowledge, edge cases |
| **Problem-Solving** | Needs heavy guidance | Works independently | Self-sufficient, anticipates issues |
| **Communication** | Silent, unclear | Explains major steps | Thinks aloud, asks great questions |

### Overall Score (2 exercises, 70 points)

| Range | Decision |
|-------|----------|
| 0-28 | Do not hire |
| 29-48 | Borderline, additional assessment |
| 49-60 | Strong candidate |
| 61-70 | Exceptional, fast-track |

### Follow-Up Questions

See [docs/interview-guide.md](../docs/interview-guide.md) for detailed follow-up questions, red flags, and tips per exercise.

## Customization

### Adding Your Own Exercises

1. Copy `exercises/_template.yaml` to `exercises/<module>/NN-slug.yaml`
2. Fill in the exercise content following the template
3. Run `npm run exercises:import`

Or use the Admin Panel (Admin → Exercises → Create exercise) to create exercises through the UI.

### Creating a New Module

**Option A: YAML + Import**

Add to `exercises/_modules.yaml`:

```yaml
modules:
  # ... existing modules ...
  docker:
    title: "Docker"
    description:
      es: "Evalúa habilidades de Docker"
      en: "Evaluate Docker skills"
    icon: "Box"
    prefix: "dk"
    language: "dockerfile"
```

Then create exercises in `exercises/docker/` and run `npm run exercises:import`.

**Option B: Admin Panel**

Go to Admin → Modules → Create module. Then add exercises through the UI.

### Resetting Between Interviews

To reset a candidate's progress between interview sessions:

```bash
# Reset the database (deletes all progress, keeps exercises)
npm run db:seed
```

Or create a fresh user account for each candidate (recommended).

## Deployment Options

### Docker

```bash
docker build -t interview-platform .
docker run -p 3000:3000 \
  -e SESSION_SECRET=your-secret-key-at-least-32-characters-long \
  -e ADMIN_PASSWORD=secure-password \
  -e PLATFORM_TITLE="DevOps Interview" \
  -v interview-data:/app/data \
  interview-platform
```

### Remote Interviews

1. Deploy to a server with HTTPS
2. Send candidate the URL + credentials 10 min before
3. Have candidate share screen (preferred)
4. Keep notes document open for observations

### Local (In-Person)

1. Run on interviewer's machine
2. Open browser on candidate's screen
3. Interviewer observes from behind or via screen share

## Troubleshooting

### "No modules found"

Run `npm run exercises:import` to load exercises into the database.

### "Database error" on first run

Run `npm run db:seed` to initialize database tables.

### Candidate can't log in

- Check Admin → Settings: registration must be OFF, anonymous access must be OFF
- Verify the candidate account exists in Admin → Users
- Check the password is correct
- Check the account is not disabled

### Exercises not showing for candidate

- Verify exercises are imported: Admin → Exercises should list them
- Check the module exists: Admin → Modules
- If anonymous access is OFF, candidate must be logged in
