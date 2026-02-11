# Configuration Guide

All configuration is done via environment variables. Copy `.env.example` to `.env.local` for local development.

```bash
cp .env.example .env.local
```

## Environment Variables

### Session

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_SECRET` | dev default (insecure) | Encryption key for cookies. **Must be 32+ chars in production.** |
| `SESSION_TTL` | `604800` (7 days) | Session lifetime in seconds |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URL` | `data/learning-platform.db` | Path to SQLite database file |

### Admin Seed

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@devopslab.local` | Admin user email (created by `db:seed`) |
| `ADMIN_PASSWORD` | `admin1234` | Admin user password (created by `db:seed`) |

### OAuth Providers

| Variable | Default | Description |
|----------|---------|-------------|
| `OAUTH_GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `OAUTH_GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `OAUTH_GOOGLE_CALLBACK` | `/api/auth/oauth/google/callback` | Google callback URL |
| `OAUTH_GITHUB_CLIENT_ID` | — | GitHub OAuth client ID |
| `OAUTH_GITHUB_CLIENT_SECRET` | — | GitHub OAuth client secret |
| `OAUTH_GITHUB_CALLBACK` | `/api/auth/oauth/github/callback` | GitHub callback URL |
| `OAUTH_AZURE_CLIENT_ID` | — | Azure AD client ID |
| `OAUTH_AZURE_CLIENT_SECRET` | — | Azure AD client secret |
| `OAUTH_AZURE_TENANT` | `common` | Azure AD tenant |
| `OAUTH_AZURE_CALLBACK` | `/api/auth/oauth/azure/callback` | Azure callback URL |

OAuth providers are only shown on the login page when their client ID is configured.

### Auth Features

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ANONYMOUS_ENABLED` | `true` | Allow anonymous access (UUID in localStorage) |
| `AUTH_EMAIL_ENABLED` | `true` | Allow email/password registration |

### Application

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Public URL (used for OAuth callbacks, WebAuthn) |
| `TOTP_ISSUER` | `DevOps Learning Platform` | Name shown in authenticator apps |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host (Docker) |

## Configuration Files

| File | Purpose |
|------|---------|
| `.env.local` | Local env vars (gitignored) |
| `.env.example` | Template with all available vars |
| `drizzle.config.ts` | Drizzle ORM config (schema path, dialect, DB path) |
| `exercises/_modules.yaml` | Module definitions for YAML import |
| `exercises/_template.yaml` | Template for new exercise YAML files |
| `.releaserc.json` | semantic-release configuration |
| `tsconfig.json` | TypeScript config (excludes `scripts/`) |
| `next.config.ts` | Next.js configuration |

## Key Source Files

| File | Purpose |
|------|---------|
| `src/lib/db/index.ts` | Database connection (SQLite + Drizzle) |
| `src/lib/db/schema.ts` | All table definitions (Drizzle ORM) |
| `src/lib/db/seed.ts` | Table creation SQL + admin user seeding |
| `src/lib/auth/session.ts` | iron-session config (cookie name, TTL, encryption) |
| `src/lib/exercises/db-loader.ts` | Exercise loader + runtime Check DSL interpreter |
| `src/lib/exercises/index.ts` | Public exercise API (getExercise, getModuleExercises) |
| `src/lib/i18n/context.tsx` | Language provider + available languages |
| `src/lib/i18n/locales/es.ts` | Spanish translations |
| `src/lib/i18n/locales/en.ts` | English translations |
| `scripts/import-exercises.ts` | YAML exercise importer |
| `src/middleware.ts` | Auth middleware (protects /admin/*, /profile/*) |

## Production Checklist

1. Set `SESSION_SECRET` to a random 32+ char string
2. Set `ADMIN_PASSWORD` to a strong password
3. Configure `BASE_URL` to your public domain
4. Set up OAuth providers if needed
5. Run `npm run db:seed && npm run exercises:import` before first start
6. Ensure `data/` directory exists and is writable
