# Architecture

This document describes the system architecture of the Self Learning Platform using Mermaid diagrams.

## 1. System Architecture Overview

The platform is a Next.js 15 monolith using the App Router. The server handles both page rendering (Server Components) and API routes. The client-side embeds Monaco Editor for code editing and xterm.js for an interactive terminal. Authentication is managed with iron-session (encrypted cookies), and all data is stored in a single SQLite database accessed via Drizzle ORM.

```mermaid
graph TB
    subgraph Browser["Browser (Client)"]
        UI["React 19 UI"]
        Monaco["Monaco Editor<br/>(Code Editing)"]
        XTerm["xterm.js Terminal<br/>(Simulated CLI)"]
        Auth_UI["Auth Components<br/>(Login / Register / OAuth / Passkey)"]
        Providers["Context Providers<br/>(Auth, i18n, Theme)"]
    end

    subgraph NextJS["Next.js 15 App Router"]
        Middleware["Middleware<br/>(Security Headers, Session Check,<br/>Admin Guard)"]

        subgraph Pages["Server Components (Pages)"]
            Home["/ &mdash; Home (Module List)"]
            ModulePage["/modules/[module] &mdash; Exercise List"]
            ExercisePage["/modules/[module]/[exerciseId] &mdash; Lab"]
            AdminPages["/admin/* &mdash; Admin Panel"]
            ProfilePages["/profile/* &mdash; User Profile"]
        end

        subgraph API["API Routes"]
            AuthAPI["/api/auth/*<br/>(login, register, OAuth,<br/>TOTP, Passkey, me, logout)"]
            ValidateAPI["/api/validate<br/>(Exercise Validation)"]
            TerminalAPI["/api/terminal<br/>(Command Simulation)"]
            ProgressAPI["/api/progress<br/>(User Progress)"]
            ModulesAPI["/api/modules<br/>(Module & Exercise Data)"]
            SettingsAPI["/api/settings<br/>(Platform Config)"]
            AdminAPI["/api/admin/*<br/>(Users, Modules,<br/>Exercises, Audit)"]
        end

        subgraph Core["Core Libraries (src/lib)"]
            Session["iron-session<br/>(Encrypted Cookie Sessions)"]
            Validator["Validation Engine<br/>(Check DSL Interpreter)"]
            Simulator["Terminal Simulator"]
            DBLoader["Exercise DB Loader<br/>(Hydration + Cache)"]
            RateLimit["Rate Limiter"]
            AuditMod["Audit Logger"]
            Crypto["Crypto Utils<br/>(AES encrypt, HMAC hash)"]
        end
    end

    subgraph Storage["Data Layer"]
        SQLite["SQLite Database<br/>(via Drizzle ORM + better-sqlite3)"]
    end

    subgraph External["External Services (Optional)"]
        OAuth_Providers["OAuth Providers<br/>(Google, GitHub, Azure)"]
        SMTP["SMTP Server<br/>(Email Verification)"]
    end

    Browser -->|HTTP Requests| Middleware
    Middleware --> Pages
    Middleware --> API
    API --> Core
    Core --> SQLite
    AuthAPI -->|OAuth redirect| OAuth_Providers
    AuthAPI -->|Verification emails| SMTP
    Monaco -->|Code content| ValidateAPI
    XTerm -->|Commands| TerminalAPI
    Auth_UI --> AuthAPI
    UI --> ProgressAPI
    UI --> ModulesAPI
```

## 2. Database Schema (Entity Relationship)

The database is a single SQLite file managed by Drizzle ORM. The `users` table is the central entity, linked to authentication methods (OAuth accounts, passkeys), learning data (progress, submissions), and audit records. Exercises are organized into modules, and both are stored declaratively as JSON in the database.

```mermaid
erDiagram
    users {
        text id PK "UUID"
        text email "AES-encrypted"
        text email_hash UK "HMAC for lookup"
        text password_hash "argon2 hash"
        text username "default: anonymous"
        text display_name "AES-encrypted"
        text role "admin | user | anonymous"
        text totp_secret "TOTP shared secret"
        boolean totp_enabled "2FA toggle"
        boolean email_verified
        boolean disabled
        text avatar_url
        text preferences "JSON"
        text created_at
        text updated_at
    }

    oauth_accounts {
        integer id PK "autoincrement"
        text user_id FK
        text provider "google | github | azure"
        text provider_account_id
        text access_token
        text refresh_token
        text created_at
    }

    passkeys {
        integer id PK "autoincrement"
        text user_id FK
        text credential_id UK "WebAuthn credential"
        text public_key
        integer counter
        text device_type
        boolean backed_up
        text transports "JSON array"
        text name
        text created_at
        text last_used_at
    }

    modules {
        text id PK "e.g. terraform, kubernetes"
        text title
        text description "JSON per-language"
        text icon "Lucide icon name"
        text prefix "e.g. tf, k8s"
        text language "e.g. hcl, yaml"
        boolean show_difficulty
        text image
        integer sort_order
        text created_at
    }

    exercises {
        text id PK "e.g. tf-01-broken-provider"
        text module_id FK
        text title
        text briefing
        text language
        text initial_code
        text prerequisites "JSON array of exercise IDs"
        text hints "JSON array"
        text success_message
        text validations "JSON array of Check DSL"
        text terminal_commands "JSON object"
        text i18n "JSON per-language overrides"
        text difficulty "easy | medium | hard"
        integer sort_order
        text created_at
        text updated_at
    }

    progress {
        integer id PK "autoincrement"
        text user_id FK
        text exercise_id
        text status "locked | available | completed"
        text completed_at
    }

    submissions {
        integer id PK "autoincrement"
        text user_id FK
        text exercise_id
        text code
        text result "pass | fail"
        text feedback
        text submitted_at
    }

    settings {
        text key PK
        text value
        text updated_at
    }

    rate_limits {
        integer id PK "autoincrement"
        text key "e.g. login:192.168.1.1"
        integer attempts
        text window_start
    }

    audit_log {
        integer id PK "autoincrement"
        text user_id
        text action "login, register, totp_enable, ..."
        text ip
        text user_agent
        text details "JSON"
        text created_at
    }

    email_verification_tokens {
        integer id PK "autoincrement"
        text user_id FK
        text token UK
        text expires_at
        text created_at
    }

    password_reset_tokens {
        integer id PK "autoincrement"
        text email
        text token UK
        text expires_at
        boolean used
        text created_at
    }

    users ||--o{ oauth_accounts : "has"
    users ||--o{ passkeys : "has"
    users ||--o{ progress : "tracks"
    users ||--o{ submissions : "submits"
    users ||--o{ email_verification_tokens : "verifies"
    users ||--o{ audit_log : "generates"
    modules ||--o{ exercises : "contains"
```

## 3. Authentication Flow

The platform supports four authentication methods: email/password (with optional TOTP 2FA), OAuth (Google, GitHub, Azure AD), and passkeys (WebAuthn). All methods ultimately create an iron-session cookie. Rate limiting is applied to login and registration endpoints. All auth events are recorded in the audit log.

### 3a. Email/Password Login (with Optional TOTP)

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Login as POST /api/auth/login
    participant RL as Rate Limiter
    participant DB as SQLite
    participant TOTP as POST /api/auth/totp/verify
    participant Session as iron-session

    User->>Browser: Enter email + password
    Browser->>Login: POST {email, password}
    Login->>RL: checkRateLimit("login:<ip>")
    RL->>DB: Query/update rate_limits table
    RL-->>Login: {allowed, remaining}

    alt Rate limit exceeded
        Login-->>Browser: 429 Too Many Requests
    end

    Login->>DB: SELECT user WHERE email_hash = HMAC(email)
    DB-->>Login: User row

    alt User not found or invalid password
        Login->>DB: INSERT audit_log (login_failed)
        Login-->>Browser: 401 Invalid credentials
    end

    alt Account disabled
        Login-->>Browser: 403 Account disabled
    end

    Login->>Login: verifyPassword(hash, password)

    alt TOTP enabled
        Login->>Session: Store pendingUserId
        Login-->>Browser: {requires2FA: true}
        User->>Browser: Enter 6-digit TOTP code
        Browser->>TOTP: POST {code, isLogin: true}
        TOTP->>Session: Read pendingUserId
        TOTP->>DB: Get user.totpSecret
        TOTP->>TOTP: verifyTOTP(code, secret)
        alt Valid code
            TOTP->>Session: Set userId, role, email
            TOTP->>DB: INSERT audit_log (login, method:totp)
            TOTP-->>Browser: {user: {...}}
        else Invalid code
            TOTP-->>Browser: 401 Invalid code
        end
    else No TOTP
        Login->>Session: Set userId, role, email
        Login->>DB: INSERT audit_log (login)
        Login-->>Browser: {user: {...}}
    end
```

### 3b. OAuth Flow (Google / GitHub / Azure)

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant OAuthInit as GET /api/auth/oauth/[provider]
    participant Provider as OAuth Provider<br/>(Google/GitHub/Azure)
    participant Callback as GET /api/auth/oauth/[provider]/callback
    participant DB as SQLite
    participant Session as iron-session

    User->>Browser: Click "Login with Google"
    Browser->>OAuthInit: GET /api/auth/oauth/google
    OAuthInit->>OAuthInit: Generate state = nonce.HMAC(nonce)
    OAuthInit->>Browser: Set oauth_state cookie
    OAuthInit-->>Browser: 302 Redirect to provider

    Browser->>Provider: Authorization page
    User->>Provider: Approve consent
    Provider-->>Browser: 302 Redirect to callback?code=...&state=...

    Browser->>Callback: GET /api/auth/oauth/google/callback
    Callback->>Callback: Verify state cookie vs query param
    Callback->>Callback: Verify HMAC signature on state
    Callback->>Provider: Exchange code for access token
    Provider-->>Callback: {access_token}
    Callback->>Provider: Fetch user profile
    Provider-->>Callback: {id, email, name, avatar}

    Callback->>DB: findOrCreateOAuthUser(profile)
    Note over Callback,DB: Links oauth_accounts to existing<br/>user by email, or creates new user

    Callback->>Session: Set userId, role, email
    Callback->>DB: INSERT audit_log (login + oauth_link)
    Callback-->>Browser: 302 Redirect to /
```

### 3c. Passkey / WebAuthn Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant AuthOpts as POST /api/auth/passkey/auth-options
    participant AuthVerify as POST /api/auth/passkey/auth-verify
    participant DB as SQLite
    participant Session as iron-session

    User->>Browser: Click "Login with Passkey"
    Browser->>AuthOpts: POST (request challenge)
    AuthOpts->>AuthOpts: generatePasskeyAuthOptions()
    AuthOpts->>Session: Store webauthnChallenge
    AuthOpts-->>Browser: {challenge, ...PublicKeyCredentialRequestOptions}

    Browser->>Browser: navigator.credentials.get()
    User->>Browser: Authenticate (Touch ID / Face ID / Security Key)
    Browser->>AuthVerify: POST {response: authenticatorResponse}

    AuthVerify->>Session: Read webauthnChallenge
    AuthVerify->>DB: SELECT passkey WHERE credential_id = response.id
    AuthVerify->>AuthVerify: verifyPasskeyAuth(response, challenge, passkey)

    alt Verified
        AuthVerify->>DB: UPDATE passkey counter + lastUsedAt
        AuthVerify->>DB: SELECT user by passkey.userId
        AuthVerify->>Session: Set userId, role, email
        AuthVerify->>DB: INSERT audit_log (login, method:passkey)
        AuthVerify-->>Browser: {verified: true, user: {...}}
    else Failed
        AuthVerify-->>Browser: 400 Verification failed
    end
```

## 4. Exercise Validation Pipeline

When a user clicks "Validate" in the lab, their code is sent to the server where the validation engine loads the exercise definition from the database, hydrates the declarative Check DSL into executable validation functions, and evaluates each rule against the submitted code. Progressive hints are unlocked after repeated failures. On success, the user's progress is updated and dependent exercises are unlocked.

```mermaid
flowchart TD
    A["User clicks Validate<br/>in LabLayout"] --> B["POST /api/validate<br/>{exerciseId, code, failureCount, lang}"]

    B --> C{"Authenticated<br/>user?"}
    C -->|"No (and not demo mode)"| C1["401 Unauthorized"]
    C -->|"Yes or demo mode"| D["validateExercise()<br/>(engine.ts)"]

    D --> E["getExercise(exerciseId)<br/>(db-loader.ts)"]
    E --> F{"Exercise in<br/>cache?"}
    F -->|"Yes (< 60s)"| G["Return cached Exercise"]
    F -->|"No"| H["SELECT from exercises table"]
    H --> I["hydrateExercise()"]

    I --> I1["Parse validations JSON<br/>into Check DSL objects"]
    I1 --> I2["Parse terminalCommands JSON<br/>into handler functions"]
    I2 --> I3["Build full Exercise object"]
    I3 --> G

    G --> J["Iterate validation rules"]

    J --> K{"Check DSL<br/>Type"}
    K -->|"contains / not_contains"| K1["String inclusion test"]
    K -->|"match / not_match"| K2["Regex test"]
    K -->|"yaml_valid"| K3["YAML parse attempt"]
    K -->|"yaml_has / yaml_equals / ..."| K4["YAML structural check"]
    K -->|"all / any / not"| K5["Composite logic"]
    K -->|"custom"| K6["Execute custom function<br/>(new Function)"]

    K1 & K2 & K3 & K4 & K5 & K6 --> L{"All checks<br/>passed?"}

    L -->|"Yes"| M["Return success + successMessage"]
    L -->|"No"| N["Compute hint index:<br/>floor(failureCount / 2)"]
    N --> O{"failureCount >= 2?"}
    O -->|"Yes"| P["Include hints[hintIndex]<br/>as nextHint"]
    O -->|"No"| Q["No hint yet"]
    P & Q --> R["Return failure + first errorMessage"]

    M --> S{"User<br/>authenticated?"}
    S -->|"Yes"| T["INSERT submission (pass)"]
    T --> U["UPDATE/INSERT progress<br/>status = completed"]
    U --> V["unlockDependentExercises()"]
    V --> W["For each exercise in module:<br/>if all prerequisites completed,<br/>set status = available"]
    W --> X["Return JSON response"]

    S -->|"No (demo)"| X
    R --> S2{"User<br/>authenticated?"}
    S2 -->|"Yes"| T2["INSERT submission (fail)"]
    T2 --> X
    S2 -->|"No"| X
```

## 5. Request Flow (Middleware Pipeline)

Every matched request passes through the Next.js middleware before reaching its handler. The middleware applies security headers to all responses, then checks session-based authorization for protected routes (`/profile/*` and `/admin/*`). API route handlers perform their own authorization using helper functions (`requireAuth`, `requireAdmin`) and apply rate limiting where needed.

```mermaid
flowchart TD
    A["Incoming HTTP Request"] --> B["Next.js Middleware<br/>(middleware.ts)"]

    B --> C["Add Security Headers<br/>X-Frame-Options: DENY<br/>X-Content-Type-Options: nosniff<br/>Referrer-Policy: strict-origin-when-cross-origin<br/>X-XSS-Protection: 1; mode=block<br/>Permissions-Policy: camera=(), microphone=(), geolocation=()"]

    C --> D{"Path starts with<br/>/profile or /admin?"}

    D -->|"No"| E["Pass through to<br/>route handler"]

    D -->|"Yes"| F["Read iron-session<br/>from cookie"]

    F --> G{"session.userId<br/>exists?"}
    G -->|"No"| H["302 Redirect<br/>to /login"]

    G -->|"Yes"| I{"Path starts with<br/>/admin?"}
    I -->|"No (/profile)"| E

    I -->|"Yes"| J{"session.role<br/>=== admin?"}
    J -->|"Yes"| E
    J -->|"No"| K["302 Redirect to /"]

    E --> L{"Route type"}

    L -->|"Page (Server Component)"| M["Render page"]

    L -->|"Public API<br/>(/api/settings, /api/modules)"| N["Handle request<br/>(no auth required)"]

    L -->|"User API<br/>(/api/validate, /api/progress)"| O["getCurrentUserId()"]
    O --> O1{"userId?"}
    O1 -->|"Yes"| P["Process + store result"]
    O1 -->|"No + demo mode"| P2["Process without storage"]
    O1 -->|"No + no demo"| Q["401 Unauthorized"]

    L -->|"Auth API<br/>(/api/auth/login, /register)"| R["checkRateLimit(key)"]
    R --> R1{"Allowed?"}
    R1 -->|"Yes"| S["Process auth request"]
    R1 -->|"No"| T["429 Too Many Requests"]

    L -->|"Admin API<br/>(/api/admin/*)"| U["requireAdmin()"]
    U --> U1{"Admin?"}
    U1 -->|"Yes"| V["Process admin request"]
    U1 -->|"No"| W["401/403 Error"]

    S & P & P2 & V --> X["logAudit() on<br/>relevant actions"]
    X --> Y["Return JSON Response"]
    N --> Y
```

## Component Hierarchy

For reference, the React component tree is structured as follows. The root layout wraps the entire application in `AuthProvider`, `LanguageProvider`, and `ThemeProvider`. The `Navbar` is always visible. The lab view (`LabLayout`) is the primary interactive surface, embedding both Monaco Editor and the xterm.js Terminal side by side.

```mermaid
graph TD
    RootLayout["RootLayout (layout.tsx)"]
    RootLayout --> AuthProvider
    AuthProvider --> LangProvider["LanguageProvider"]
    LangProvider --> ThemeProvider
    ThemeProvider --> Navbar
    ThemeProvider --> Main["main (children)"]

    Main --> HomePage["Home Page<br/>(Module Cards)"]
    Main --> ModulePage["Module Page<br/>(ProgressTracker)"]
    Main --> ExercisePage["Exercise Page"]

    ExercisePage --> LabLayout

    LabLayout --> CodeEditor["CodeEditor<br/>(Monaco Editor)"]
    LabLayout --> Terminal["Terminal<br/>(xterm.js)"]
    LabLayout --> FeedbackPanel["Feedback Panel<br/>(pass/fail + hints)"]

    ModulePage --> ProgressTracker
    ProgressTracker --> ExerciseCards["Exercise Cards<br/>(locked / available / completed)"]
```
