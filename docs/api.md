# API Documentation

Complete reference for all REST API endpoints in the Self-Learning Platform.

**Base URL:** `http://localhost:3000` (development)

**Authentication:** Session-based via `iron-session` cookies. Endpoints marked **Auth: Yes** require an active session. Endpoints marked **Auth: Admin** require an active session with `role: "admin"`.

**Content-Type:** All request bodies are JSON (`application/json`). All responses return JSON unless otherwise noted.

---

## Table of Contents

- [Auth](#auth)
  - [POST /api/auth/register](#post-apiauthregister)
  - [POST /api/auth/login](#post-apiauthlogin)
  - [POST /api/auth/logout](#post-apiauthlogout)
  - [GET /api/auth/me](#get-apiauthme)
  - [PATCH /api/auth/profile](#patch-apiauthprofile)
  - [PATCH /api/auth/preferences](#patch-apiauthpreferences)
  - [GET /api/auth/verify-email](#get-apiauthverify-email)
  - [POST /api/auth/forgot-password](#post-apiauthforgot-password)
  - [POST /api/auth/reset-password](#post-apiauthreset-password)
  - [GET /api/auth/oauth/[provider]](#get-apiauthoauthprovider)
  - [GET /api/auth/oauth/[provider]/callback](#get-apiauthoauthprovidercallback)
  - [POST /api/auth/totp/setup](#post-apiauthtotpsetup)
  - [POST /api/auth/totp/verify](#post-apiauthtotpverify)
  - [POST /api/auth/totp/disable](#post-apiauthtotpdisable)
  - [POST /api/auth/passkey/register-options](#post-apiauthpasskeyregister-options)
  - [POST /api/auth/passkey/register-verify](#post-apiauthpasskeyregister-verify)
  - [POST /api/auth/passkey/auth-options](#post-apiauthpasskeyauth-options)
  - [POST /api/auth/passkey/auth-verify](#post-apiauthpasskeyauth-verify)
  - [GET /api/auth/passkey/list](#get-apiauthpasskeylist)
  - [DELETE /api/auth/passkey/[id]](#delete-apiauthpasskeyid)
- [Modules](#modules)
  - [GET /api/modules](#get-apimodules)
  - [GET /api/modules/[module]/exercises](#get-apimodulesmoduleexercises)
- [Exercises](#exercises)
  - [GET /api/exercises/[id]/metadata](#get-apiexercisesidmetadata)
- [Validation](#validation)
  - [POST /api/validate](#post-apivalidate)
- [Terminal](#terminal)
  - [POST /api/terminal](#post-apiterminal)
- [Progress](#progress)
  - [GET /api/progress](#get-apiprogress)
  - [GET /api/progress/summary](#get-apiprogresssummary)
- [Settings](#settings)
  - [GET /api/settings](#get-apisettings)
- [Admin - Settings](#admin---settings)
  - [GET /api/admin/settings](#get-apiadminsettings)
  - [PATCH /api/admin/settings](#patch-apiadminsettings)
- [Admin - Users](#admin---users)
  - [GET /api/admin/users](#get-apiadminusers)
  - [POST /api/admin/users](#post-apiadminusers)
  - [GET /api/admin/users/[id]](#get-apiadminusersid)
  - [PATCH /api/admin/users/[id]](#patch-apiadminusersid)
  - [DELETE /api/admin/users/[id]](#delete-apiadminusersid)
  - [POST /api/admin/users/[id]/verify-email](#post-apiadminusersidverify-email)
- [Admin - Modules](#admin---modules)
  - [GET /api/admin/modules](#get-apiadminmodules)
  - [POST /api/admin/modules](#post-apiadminmodules)
  - [GET /api/admin/modules/[id]](#get-apiadminmodulesid)
  - [PATCH /api/admin/modules/[id]](#patch-apiadminmodulesid)
  - [DELETE /api/admin/modules/[id]](#delete-apiadminmodulesid)
  - [POST /api/admin/modules/reorder](#post-apiadminmodulesreorder)
- [Admin - Exercises](#admin---exercises)
  - [GET /api/admin/exercises](#get-apiadminexercises)
  - [POST /api/admin/exercises](#post-apiadminexercises)
  - [GET /api/admin/exercises/[id]](#get-apiadminexercisesid)
  - [PATCH /api/admin/exercises/[id]](#patch-apiadminexercisesid)
  - [DELETE /api/admin/exercises/[id]](#delete-apiadminexercisesid)
  - [POST /api/admin/exercises/reorder](#post-apiadminexercisesreorder)
- [Admin - Audit](#admin---audit)
  - [GET /api/admin/audit](#get-apiadminaudit)

---

## Auth

### POST /api/auth/register

Create a new user account.

**Auth:** No

**Rate limited:** Yes (by IP)

**Request Body:**

| Field      | Type   | Required | Description                |
|------------|--------|----------|----------------------------|
| `email`    | string | Yes      | Valid email address         |
| `password` | string | Yes      | Minimum 8 characters        |
| `username` | string | No       | 2-50 characters; defaults to email prefix |

**Response (200):**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "user",
    "role": "user"
  }
}
```

A session cookie is set automatically upon successful registration.

If SMTP is configured, a verification email is sent to the provided address.

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 400 | `{ "error": "<password policy message>" }` | Password does not meet policy |
| 403 | `{ "error": "Registration is disabled" }` | Registration disabled in settings |
| 409 | `{ "error": "Email already registered" }` | Duplicate email |
| 429 | `{ "error": "Too many attempts. Try again later." }` | Rate limit exceeded |

---

### POST /api/auth/login

Authenticate with email and password.

**Auth:** No

**Rate limited:** Yes (by IP)

**Request Body:**

| Field      | Type   | Required | Description        |
|------------|--------|----------|--------------------|
| `email`    | string | Yes      | Valid email address |
| `password` | string | Yes      | User password       |

**Response (200) -- Standard login:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "user",
    "displayName": "User Name",
    "role": "user",
    "avatarUrl": null
  }
}
```

**Response (200) -- TOTP 2FA required:**

When the user has TOTP enabled, the login is not yet complete. The client must call `/api/auth/totp/verify` with `isLogin: true`.

```json
{
  "requires2FA": true,
  "tempToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input" }` | Validation failed |
| 401 | `{ "error": "Invalid email or password" }` | Wrong credentials |
| 403 | `{ "error": "Account disabled" }` | Account disabled by admin |
| 429 | `{ "error": "Too many attempts. Try again later." }` | Rate limit exceeded |

---

### POST /api/auth/logout

Destroy the current session.

**Auth:** No (works even if already unauthenticated)

**Request Body:** None

**Response (200):**

```json
{ "ok": true }
```

---

### GET /api/auth/me

Get the currently authenticated user and available OAuth providers.

**Auth:** No (returns `user: null` if unauthenticated)

**Response (200) -- Authenticated:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "user",
    "displayName": "User Name",
    "role": "user",
    "avatarUrl": null,
    "totpEnabled": false,
    "preferences": "{\"theme\":\"dark\",\"language\":\"es\"}"
  },
  "oauthProviders": ["google", "github"]
}
```

**Response (200) -- Not authenticated:**

```json
{
  "user": null,
  "oauthProviders": ["google", "github"]
}
```

---

### PATCH /api/auth/profile

Update profile information or change password. The endpoint distinguishes between the two operations based on the presence of `currentPassword` and `newPassword` fields.

**Auth:** Yes

**Request Body -- Profile update:**

| Field         | Type   | Required | Description           |
|---------------|--------|----------|-----------------------|
| `displayName` | string | No       | 1-100 characters       |
| `username`    | string | No       | 2-50 characters        |

**Response (200) -- Profile update:**

```json
{ "ok": true }
```

**Request Body -- Password change:**

| Field             | Type   | Required | Description           |
|-------------------|--------|----------|-----------------------|
| `currentPassword` | string | Yes      | Current password       |
| `newPassword`     | string | Yes      | Minimum 8 characters   |

**Response (200) -- Password change:**

```json
{ "ok": true, "message": "Password updated" }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input" }` | Validation failed |
| 400 | `{ "error": "<password policy message>" }` | New password does not meet policy |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 401 | `{ "error": "Current password is incorrect" }` | Wrong current password |
| 404 | `{ "error": "User not found" }` | User record missing |

---

### PATCH /api/auth/preferences

Update user preferences (theme, language). Merges with existing preferences.

**Auth:** Yes

**Request Body:**

| Field      | Type   | Required | Description                    |
|------------|--------|----------|--------------------------------|
| `theme`    | string | No       | `"dark"` or `"light"`          |
| `language` | string | No       | Language code, 2-5 chars (e.g. `"es"`, `"en"`) |

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input" }` | Validation failed |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |

---

### GET /api/auth/verify-email

Verify a user's email address via a token link (typically sent via email).

**Auth:** No

**Query Parameters:**

| Param   | Type   | Required | Description         |
|---------|--------|----------|---------------------|
| `token` | string | Yes      | Email verification token |

**Response:** Redirects to `/login?verified=true` on success.

**Error Responses (redirects):**

| Condition | Redirect |
|-----------|----------|
| Missing token | `/login?error=invalid_token` |
| Invalid token | `/login?error=invalid_token` |
| Expired token | `/login?error=token_expired` |

---

### POST /api/auth/forgot-password

Request a password reset email. Always returns success to prevent email enumeration.

**Auth:** No

**Request Body:**

| Field   | Type   | Required | Description         |
|---------|--------|----------|---------------------|
| `email` | string | Yes      | Valid email address  |

**Response (200):**

```json
{ "success": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 503 | `{ "error": "Email service not configured" }` | SMTP not configured |

---

### POST /api/auth/reset-password

Reset a user's password using a valid reset token.

**Auth:** No

**Request Body:**

| Field         | Type   | Required | Description           |
|---------------|--------|----------|-----------------------|
| `token`       | string | Yes      | Password reset token   |
| `newPassword` | string | Yes      | Minimum 8 characters   |

**Response (200):**

```json
{ "success": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 400 | `{ "error": "<password policy message>" }` | Password does not meet policy |
| 400 | `{ "error": "Invalid or already used token" }` | Token not found or already used |
| 400 | `{ "error": "Token expired" }` | Token past expiry (1 hour TTL) |

---

### GET /api/auth/oauth/[provider]

Initiate an OAuth login flow. Redirects the browser to the provider's authorization URL.

**Auth:** No

**Path Parameters:**

| Param      | Type   | Description                             |
|------------|--------|-----------------------------------------|
| `provider` | string | One of: `google`, `github`, `azure`     |

**Response:** 302 redirect to the provider's authorization page.

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "OAuth provider \"<name>\" is not configured" }` | Provider credentials not set |

---

### GET /api/auth/oauth/[provider]/callback

OAuth callback handler. Exchanges the authorization code for user profile data, creates or links the user account, and establishes a session.

**Auth:** No

**Path Parameters:**

| Param      | Type   | Description                             |
|------------|--------|-----------------------------------------|
| `provider` | string | One of: `google`, `github`, `azure`     |

**Query Parameters (set by the OAuth provider):**

| Param   | Type   | Description              |
|---------|--------|--------------------------|
| `code`  | string | Authorization code        |
| `state` | string | CSRF state token          |
| `error` | string | Error code from provider  |

**Response:** 302 redirect to `/` on success, or to `/login?error=<reason>` on failure.

**Possible error redirect reasons:**

- `oauth_<error>` -- Provider returned an error
- `oauth_missing_params` -- Missing code or state
- `oauth_state_mismatch` -- CSRF state mismatch
- `oauth_invalid_state` -- HMAC verification failed
- `oauth_exchange_failed` -- Token exchange or profile fetch failed

---

### POST /api/auth/totp/setup

Generate a new TOTP secret and QR code for 2FA setup. The secret is stored in the session until verified.

**Auth:** Yes

**Request Body:** None

**Response (200):**

```json
{
  "qrCode": "data:image/png;base64,...",
  "secret": "JBSWY3DPEHPK3PXP",
  "uri": "otpauth://totp/DevOps%20Learning%20Platform:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=DevOps%20Learning%20Platform"
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "2FA is already enabled" }` | TOTP already active |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 404 | `{ "error": "User not found" }` | User record missing |

---

### POST /api/auth/totp/verify

Verify a TOTP code. Used for two flows:

1. **Setup flow** -- Confirm the code from the authenticator app to enable 2FA.
2. **Login flow** -- Complete a login that requires 2FA (when `isLogin: true`).

**Auth:** Depends on flow (session required for setup; pending session for login)

**Request Body:**

| Field     | Type    | Required | Description                                  |
|-----------|---------|----------|----------------------------------------------|
| `code`    | string  | Yes      | 6-digit TOTP code                            |
| `isLogin` | boolean | No       | `true` for login completion; omit for setup  |

**Response (200) -- Setup flow:**

```json
{ "enabled": true }
```

**Response (200) -- Login flow:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "user",
    "displayName": "User Name",
    "role": "user",
    "avatarUrl": null
  }
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input" }` | Validation failed |
| 400 | `{ "error": "No pending 2FA verification" }` | Login flow: no pending user |
| 400 | `{ "error": "No pending TOTP setup. Call /api/auth/totp/setup first." }` | Setup flow: no pending secret |
| 401 | `{ "error": "Authentication required" }` | Setup flow: not authenticated |
| 401 | `{ "error": "Invalid code" }` | Wrong TOTP code |
| 404 | `{ "error": "User not found" }` | User record missing |

---

### POST /api/auth/totp/disable

Disable TOTP 2FA. Requires password confirmation.

**Auth:** Yes

**Request Body:**

| Field      | Type   | Required | Description     |
|------------|--------|----------|-----------------|
| `password` | string | Yes      | Current password |

**Response (200):**

```json
{ "disabled": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Password required" }` | Validation failed |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 401 | `{ "error": "Invalid password" }` | Wrong password |
| 404 | `{ "error": "User not found" }` | User record missing |

---

### POST /api/auth/passkey/register-options

Generate WebAuthn registration options for adding a new passkey.

**Auth:** Yes

**Request Body:** None

**Response (200):**

Returns a WebAuthn `PublicKeyCredentialCreationOptions` object (structure defined by the WebAuthn spec). The challenge is stored in the session.

```json
{
  "challenge": "base64url-encoded-challenge",
  "rp": { "name": "DevOps Learning Platform", "id": "localhost" },
  "user": { "id": "...", "name": "user@example.com", "displayName": "user" },
  "pubKeyCredParams": [...],
  "timeout": 60000,
  "attestation": "none",
  "excludeCredentials": [...]
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 404 | `{ "error": "User not found" }` | User record missing |

---

### POST /api/auth/passkey/register-verify

Verify and save a new passkey registration.

**Auth:** Yes

**Request Body:**

| Field      | Type   | Required | Description                                |
|------------|--------|----------|--------------------------------------------|
| `response` | object | Yes      | WebAuthn `AuthenticatorAttestationResponse` |
| `name`     | string | No       | Friendly name for the passkey (default: `"Passkey"`) |

**Response (200):**

```json
{ "verified": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "No pending challenge" }` | No challenge in session |
| 400 | `{ "error": "Verification failed" }` | WebAuthn verification failed |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |

---

### POST /api/auth/passkey/auth-options

Generate WebAuthn authentication options for passkey login.

**Auth:** No

**Request Body:** None

**Response (200):**

Returns a WebAuthn `PublicKeyCredentialRequestOptions` object. The challenge is stored in the session.

```json
{
  "challenge": "base64url-encoded-challenge",
  "timeout": 60000,
  "rpId": "localhost",
  "allowCredentials": []
}
```

---

### POST /api/auth/passkey/auth-verify

Verify a passkey authentication response and log the user in.

**Auth:** No

**Request Body:**

| Field      | Type   | Required | Description                                   |
|------------|--------|----------|-----------------------------------------------|
| `response` | object | Yes      | WebAuthn `AuthenticatorAssertionResponse`      |

**Response (200):**

```json
{
  "verified": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "user",
    "displayName": "User Name",
    "role": "user",
    "avatarUrl": null
  }
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "No pending challenge" }` | No challenge in session |
| 400 | `{ "error": "Passkey not found" }` | Credential ID not in database |
| 400 | `{ "error": "Verification failed" }` | WebAuthn verification failed |
| 404 | `{ "error": "User not found" }` | User record missing |

---

### GET /api/auth/passkey/list

List all passkeys registered by the authenticated user.

**Auth:** Yes

**Response (200):**

```json
{
  "passkeys": [
    {
      "id": 1,
      "name": "MacBook Touch ID",
      "deviceType": "platform",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "lastUsedAt": "2025-01-20T08:15:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |

---

### DELETE /api/auth/passkey/[id]

Remove a passkey belonging to the authenticated user.

**Auth:** Yes

**Path Parameters:**

| Param | Type    | Description   |
|-------|---------|---------------|
| `id`  | integer | Passkey ID    |

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid ID" }` | Non-numeric ID |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 404 | `{ "error": "Passkey not found" }` | Not found or belongs to another user |

---

## Modules

### GET /api/modules

List all available learning modules.

**Auth:** No

**Response (200):**

```json
{
  "modules": [
    {
      "id": "terraform",
      "title": "Terraform",
      "description": { "es": "Aprende Terraform...", "en": "Learn Terraform..." },
      "icon": "Terminal",
      "prefix": "tf",
      "language": "hcl",
      "sortOrder": 0
    },
    {
      "id": "kubernetes",
      "title": "Kubernetes",
      "description": { "es": "Aprende Kubernetes...", "en": "Learn Kubernetes..." },
      "icon": "Container",
      "prefix": "k8s",
      "language": "yaml",
      "sortOrder": 1
    }
  ]
}
```

---

### GET /api/modules/[module]/exercises

List all exercises for a specific module with their basic metadata.

**Auth:** Conditional (required unless demo mode is enabled)

**Path Parameters:**

| Param    | Type   | Description              |
|----------|--------|--------------------------|
| `module` | string | Module ID (e.g. `terraform`) |

**Response (200):**

```json
{
  "module": {
    "id": "terraform",
    "title": "Terraform",
    "description": { "es": "...", "en": "..." },
    "icon": "Terminal",
    "prefix": "tf",
    "language": "hcl",
    "sortOrder": 0
  },
  "exercises": [
    {
      "id": "tf-01",
      "title": "Provider Configuration",
      "language": "hcl",
      "prerequisites": [],
      "sortOrder": 0
    }
  ]
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated and demo mode off |
| 404 | `{ "error": "Module not found" }` | Invalid module ID |

---

## Exercises

### GET /api/exercises/[id]/metadata

Get full metadata for a specific exercise (briefing, initial code, hints, etc.).

**Auth:** No

**Path Parameters:**

| Param | Type   | Description                      |
|-------|--------|----------------------------------|
| `id`  | string | Exercise ID (e.g. `tf-01`)       |

**Response (200):**

```json
{
  "id": "tf-01",
  "title": "Provider Configuration",
  "briefing": "Configure the AWS provider in Terraform...",
  "language": "hcl",
  "initialCode": "# Configure the AWS provider\n",
  "prerequisites": [],
  "hints": ["Use the provider block", "Set the region argument"],
  "successMessage": "Correct! The AWS provider is configured.",
  "i18n": {
    "en": {
      "title": "Provider Configuration",
      "briefing": "Configure the AWS provider...",
      "hints": ["Use the provider block", "Set the region argument"],
      "successMessage": "Correct!"
    }
  }
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{ "error": "Exercise not found" }` | Invalid exercise ID |

---

## Validation

### POST /api/validate

Submit code for validation against an exercise's rules. Also records submissions and updates progress for authenticated users.

**Auth:** Conditional (required unless demo mode is enabled)

**Request Body:**

| Field          | Type   | Required | Description                                    |
|----------------|--------|----------|------------------------------------------------|
| `exerciseId`   | string | Yes      | Exercise ID                                     |
| `code`         | string | Yes      | User's code submission                          |
| `failureCount` | number | No       | Number of previous failures (used for hint unlocking; default: `0`) |
| `lang`         | string | No       | Language code for feedback messages (default: `"es"`)              |

**Response (200):**

```json
{
  "passed": true,
  "summary": "All validations passed!",
  "checks": [
    {
      "type": "syntax",
      "passed": true,
      "message": "Valid HCL syntax"
    },
    {
      "type": "semantic",
      "passed": true,
      "message": "Provider block found"
    }
  ],
  "hints": []
}
```

```json
{
  "passed": false,
  "summary": "Some checks failed",
  "checks": [
    {
      "type": "syntax",
      "passed": true,
      "message": "Valid HCL syntax"
    },
    {
      "type": "semantic",
      "passed": false,
      "message": "Missing required provider block"
    }
  ],
  "hints": ["Use the provider block to configure AWS"]
}
```

**Side effects (authenticated users only):**

- A submission record is created in the database
- If passed, user progress is updated to `"completed"`
- Dependent exercises are unlocked if all their prerequisites are met

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "exerciseId and code are required" }` | Missing required fields |
| 401 | `{ "error": "Authentication required" }` | Not authenticated and demo mode off |

---

## Terminal

### POST /api/terminal

Simulate a terminal command in the context of an exercise. Commands are not executed on the real system; responses are generated by a simulator based on the exercise definition and the current code.

**Auth:** No

**Request Body:**

| Field        | Type   | Required | Description                        |
|--------------|--------|----------|------------------------------------|
| `exerciseId` | string | Yes      | Exercise ID                         |
| `command`    | string | Yes      | Shell command to simulate           |
| `code`       | string | Yes      | Current code in the editor          |
| `lang`       | string | No       | Language code (default: `"es"`)     |

**Response (200):**

```json
{
  "output": "Terraform has been successfully initialized!",
  "exitCode": 0
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "exerciseId, command, and code are required" }` | Missing required fields |

---

## Progress

### GET /api/progress

Get the user's exercise progress for a specific module.

**Auth:** Conditional (required unless demo mode is enabled)

**Query Parameters:**

| Param    | Type   | Required | Description                          |
|----------|--------|----------|--------------------------------------|
| `module` | string | No       | Module name to filter by (e.g. `terraform`) |

**Response (200):**

```json
{
  "progress": {
    "tf-01": "completed",
    "tf-02": "available",
    "tf-03": "locked"
  }
}
```

Progress statuses:

- `"available"` -- Exercise can be started (prerequisites met or none)
- `"completed"` -- Exercise passed
- `"locked"` -- Prerequisites not yet met

If no progress records exist for the module, they are initialized automatically (exercises with no prerequisites get `"available"`, others get `"locked"`).

In demo mode without authentication, returns default progress without persisting.

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated and demo mode off |

---

### GET /api/progress/summary

Get a summary of completed vs total exercises per module.

**Auth:** No (returns empty data for unauthenticated users)

**Response (200):**

```json
{
  "modules": {
    "terraform": { "total": 10, "completed": 3 },
    "kubernetes": { "total": 8, "completed": 0 }
  }
}
```

**Response (200) -- Not authenticated:**

```json
{
  "modules": {}
}
```

---

## Settings

### GET /api/settings

Get public platform settings (no authentication required).

**Auth:** No

**Response (200):**

```json
{
  "registrationEnabled": true,
  "demoMode": false,
  "platformTitle": "Self-Learning Platform"
}
```

---

## Admin - Settings

### GET /api/admin/settings

Get all platform settings with their current values. Secret values (passwords, client secrets) are masked.

**Auth:** Admin

**Response (200):**

```json
{
  "settings": {
    "registration_enabled": "true",
    "demo_mode": "false",
    "platform_title": "Self-Learning Platform",
    "session_ttl": "604800",
    "base_url": "http://localhost:3000",
    "totp_issuer": "DevOps Learning Platform",
    "smtp_host": "",
    "smtp_port": "587",
    "smtp_user": "",
    "smtp_pass": "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    "smtp_from": "noreply@devopslab.local",
    "smtp_secure": "false",
    "oauth_google_client_id": "",
    "oauth_google_client_secret": "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    "oauth_github_client_id": "",
    "oauth_github_client_secret": "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    "oauth_azure_client_id": "",
    "oauth_azure_client_secret": "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    "oauth_azure_tenant": "common"
  }
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

### PATCH /api/admin/settings

Update a single platform setting.

**Auth:** Admin

**Request Body:**

| Field   | Type   | Required | Description                              |
|---------|--------|----------|------------------------------------------|
| `key`   | string | Yes      | Setting key (see allowed keys below)     |
| `value` | string | Yes      | New value                                |

**Allowed keys:** `registration_enabled`, `demo_mode`, `platform_title`, `session_ttl`, `base_url`, `totp_issuer`, `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_from`, `smtp_secure`, `oauth_google_client_id`, `oauth_google_client_secret`, `oauth_github_client_id`, `oauth_github_client_secret`, `oauth_azure_client_id`, `oauth_azure_client_secret`, `oauth_azure_tenant`

**Response (200):**

```json
{ "ok": true }
```

If a masked value placeholder is sent for a secret key, the update is silently skipped (existing value preserved).

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input" }` | Validation failed |
| 400 | `{ "error": "Unknown setting" }` | Key not in allowed list |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

## Admin - Users

### GET /api/admin/users

List all users with pagination and search.

**Auth:** Admin

**Query Parameters:**

| Param    | Type   | Default | Description                               |
|----------|--------|---------|-------------------------------------------|
| `search` | string | `""`    | Filter by email or username (case-insensitive) |
| `page`   | number | `1`     | Page number (1-based)                     |
| `limit`  | number | `50`    | Results per page (1-100)                  |

**Response (200):**

```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@example.com",
      "username": "admin",
      "displayName": "Admin User",
      "role": "admin",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "totpEnabled": true,
      "emailVerified": true,
      "disabled": false
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

### POST /api/admin/users

Create a new user account (admin-initiated).

**Auth:** Admin

**Request Body:**

| Field      | Type   | Required | Description                       |
|------------|--------|----------|-----------------------------------|
| `email`    | string | Yes      | Valid email address                |
| `password` | string | Yes      | Minimum 8 characters               |
| `username` | string | No       | 2-50 characters                    |
| `role`     | string | No       | `"admin"` or `"user"` (default: `"user"`) |

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newuser@example.com",
  "role": "user"
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |
| 409 | `{ "error": "Email already registered" }` | Duplicate email |

---

### GET /api/admin/users/[id]

Get details for a specific user.

**Auth:** Admin

**Path Parameters:**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | User UUID   |

**Response (200):**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "user",
    "displayName": "User Name",
    "role": "user",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "totpEnabled": false,
    "emailVerified": true,
    "disabled": false,
    "avatarUrl": null
  }
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |
| 404 | `{ "error": "User not found" }` | Invalid user ID |

---

### PATCH /api/admin/users/[id]

Update a user's details (admin-initiated). All fields are optional.

**Auth:** Admin

**Path Parameters:**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | User UUID   |

**Request Body:**

| Field           | Type    | Required | Description                       |
|-----------------|---------|----------|-----------------------------------|
| `role`          | string  | No       | `"admin"` or `"user"`             |
| `displayName`   | string  | No       | 1-100 characters                   |
| `username`      | string  | No       | 2-50 characters                    |
| `password`      | string  | No       | Minimum 8 characters (reset password) |
| `disabled`      | boolean | No       | Disable/enable the account         |
| `emailVerified` | boolean | No       | Manually verify/unverify email     |

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |
| 404 | `{ "error": "User not found" }` | Invalid user ID |

---

### DELETE /api/admin/users/[id]

Delete a user account. An admin cannot delete their own account.

**Auth:** Admin

**Path Parameters:**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | User UUID   |

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Cannot delete your own account" }` | Self-deletion attempt |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |
| 404 | `{ "error": "User not found" }` | Invalid user ID |

---

### POST /api/admin/users/[id]/verify-email

Resend the email verification link for a user. Requires SMTP to be configured.

**Auth:** Admin

**Path Parameters:**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | User UUID   |

**Request Body:** None

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "SMTP not configured" }` | SMTP settings missing |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |
| 404 | `{ "error": "User not found" }` | Invalid user ID or no email |

---

## Admin - Modules

### GET /api/admin/modules

List all modules ordered by sort order.

**Auth:** Admin

**Response (200):**

```json
{
  "modules": [
    {
      "id": "terraform",
      "title": "Terraform",
      "description": { "es": "Aprende Terraform...", "en": "Learn Terraform..." },
      "icon": "Terminal",
      "prefix": "tf",
      "language": "hcl",
      "sortOrder": 0,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

### POST /api/admin/modules

Create a new learning module.

**Auth:** Admin

**Request Body:**

| Field         | Type                      | Required | Description                                 |
|---------------|---------------------------|----------|---------------------------------------------|
| `id`          | string                    | Yes      | URL-safe identifier (`/^[a-z0-9-]+$/`, max 50 chars) |
| `title`       | string                    | Yes      | Display title (max 100 chars)                |
| `description` | `Record<string, string>`  | Yes      | Per-language descriptions (e.g. `{ "es": "...", "en": "..." }`) |
| `icon`        | string                    | No       | Lucide icon name (default: `"Terminal"`)     |
| `prefix`      | string                    | Yes      | Exercise ID prefix (max 10 chars)            |
| `language`    | string                    | No       | Default code language (default: `"yaml"`)    |
| `sortOrder`   | number                    | No       | Display order (default: `0`)                 |

**Response (200):**

```json
{ "id": "ansible", "title": "Ansible" }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

### GET /api/admin/modules/[id]

Get a single module by ID.

**Auth:** Admin

**Path Parameters:**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | Module ID   |

**Response (200):**

```json
{
  "id": "terraform",
  "title": "Terraform",
  "description": { "es": "...", "en": "..." },
  "icon": "Terminal",
  "prefix": "tf",
  "language": "hcl",
  "sortOrder": 0,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |
| 404 | `{ "error": "Not found" }` | Invalid module ID |

---

### PATCH /api/admin/modules/[id]

Update a module. All fields are optional.

**Auth:** Admin

**Path Parameters:**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | Module ID   |

**Request Body:**

| Field            | Type                     | Required | Description                                 |
|------------------|--------------------------|----------|---------------------------------------------|
| `title`          | string                   | No       | Display title (max 100 chars)                |
| `description`    | `Record<string, string>` | No       | Per-language descriptions                    |
| `icon`           | string                   | No       | Lucide icon name                             |
| `prefix`         | string                   | No       | Exercise ID prefix (max 10 chars)            |
| `language`       | string                   | No       | Default code language                        |
| `showDifficulty` | boolean                  | No       | Show difficulty badges on exercises          |
| `image`          | string \| null           | No       | Module image (base64, max ~700KB)            |
| `sortOrder`      | number                   | No       | Display order                                |

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |
| 404 | `{ "error": "Not found" }` | Invalid module ID |

---

### DELETE /api/admin/modules/[id]

Delete a module and all its exercises.

**Auth:** Admin

**Path Parameters:**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | string | Module ID   |

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

### POST /api/admin/modules/reorder

Reorder modules by providing an ordered array of module IDs.

**Auth:** Admin

**Request Body:**

| Field       | Type     | Required | Description                     |
|-------------|----------|----------|---------------------------------|
| `moduleIds` | string[] | Yes      | Ordered array of module IDs     |

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

## Admin - Exercises

### GET /api/admin/exercises

List exercises with optional module filtering and pagination.

**Auth:** Admin

**Query Parameters:**

| Param    | Type   | Default | Description                              |
|----------|--------|---------|------------------------------------------|
| `module` | string | --      | Filter by module ID                      |
| `page`   | number | `1`     | Page number (1-based)                    |
| `limit`  | number | `50`    | Results per page (1-100)                 |

**Response (200):**

```json
{
  "exercises": [
    {
      "id": "tf-01",
      "moduleId": "terraform",
      "title": "Provider Configuration",
      "language": "hcl",
      "sortOrder": 0,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": null
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

### POST /api/admin/exercises

Create a new exercise.

**Auth:** Admin

**Request Body:**

| Field              | Type     | Required | Description                                       |
|--------------------|----------|----------|---------------------------------------------------|
| `id`               | string   | Yes      | Unique exercise ID (max 100 chars)                 |
| `moduleId`         | string   | Yes      | Parent module ID (must exist)                      |
| `title`            | string   | Yes      | Exercise title                                     |
| `briefing`         | string   | Yes      | Exercise description/instructions                  |
| `language`         | string   | Yes      | Code language (e.g. `"hcl"`, `"yaml"`)            |
| `initialCode`      | string   | Yes      | Starting code template                             |
| `prerequisites`    | string[] | No       | Array of prerequisite exercise IDs (default: `[]`) |
| `hints`            | string[] | No       | Progressive hints (default: `[]`)                  |
| `successMessage`   | string   | Yes      | Message shown on completion                        |
| `validations`      | array    | Yes      | Validation rules (see below)                       |
| `terminalCommands` | object   | Yes      | Terminal command simulation rules (see below)      |
| `i18n`             | object   | No       | Per-language overrides                             |
| `sortOrder`        | number   | No       | Display order (default: `0`)                       |

**Validation rule structure:**

```json
{
  "type": "syntax | semantic | intention",
  "errorMessage": "Displayed when check fails",
  "check": {
    "contains": "string to find",
    "not_contains": "string that must be absent",
    "match": "regex pattern",
    "not_match": "regex that must not match",
    "yaml_valid": true,
    "yaml_has": "path.to.key",
    "yaml_not_has": "path.to.key",
    "yaml_is_array": "path.to.key",
    "yaml_equals": { "path": "path.to.key", "value": "expected" },
    "yaml_items_have": { "path": "path.to.array", "fields": ["field1", "field2"] },
    "custom": "custom validator name",
    "all": [ /* nested checks, all must pass */ ],
    "any": [ /* nested checks, at least one must pass */ ],
    "not": { /* nested check, must fail */ }
  },
  "failMessage": "Detailed failure explanation"
}
```

**Terminal command structure:**

```json
{
  "terraform init": [
    {
      "when": { "contains": "provider" },
      "output": "Terraform has been successfully initialized!",
      "exitCode": 0
    }
  ]
}
```

**Response (200):**

```json
{ "id": "tf-01", "title": "Provider Configuration" }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 400 | `{ "error": "Module not found" }` | Referenced module does not exist |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

### GET /api/admin/exercises/[id]

Get the full definition of a single exercise, including parsed JSON fields.

**Auth:** Admin

**Path Parameters:**

| Param | Type   | Description  |
|-------|--------|--------------|
| `id`  | string | Exercise ID  |

**Response (200):**

```json
{
  "id": "tf-01",
  "moduleId": "terraform",
  "title": "Provider Configuration",
  "briefing": "Configure the AWS provider...",
  "language": "hcl",
  "initialCode": "# Configure the provider\n",
  "prerequisites": [],
  "hints": ["Use the provider block"],
  "successMessage": "Correct!",
  "validations": [ { "type": "syntax", "errorMessage": "...", "check": { "contains": "provider" }, "failMessage": "..." } ],
  "terminalCommands": { "terraform init": [{ "output": "...", "exitCode": 0 }] },
  "i18n": null,
  "sortOrder": 0,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": null
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |
| 404 | `{ "error": "Not found" }` | Invalid exercise ID |

---

### PATCH /api/admin/exercises/[id]

Update an exercise. All fields are optional.

**Auth:** Admin

**Path Parameters:**

| Param | Type   | Description  |
|-------|--------|--------------|
| `id`  | string | Exercise ID  |

**Request Body:**

| Field              | Type               | Required | Description                                     |
|--------------------|--------------------|----------|-------------------------------------------------|
| `title`            | string             | No       | Exercise title                                   |
| `briefing`         | string             | No       | Exercise instructions                            |
| `language`         | string             | No       | Code language                                    |
| `initialCode`      | string             | No       | Starting code template                           |
| `prerequisites`    | string[]           | No       | Prerequisite exercise IDs                        |
| `hints`            | string[]           | No       | Progressive hints                                |
| `successMessage`   | string             | No       | Completion message                               |
| `validations`      | array              | No       | Validation rules                                 |
| `terminalCommands` | object             | No       | Terminal simulation rules                        |
| `i18n`             | object \| null     | No       | Per-language overrides (null to remove)           |
| `difficulty`       | string \| null     | No       | `"easy"`, `"medium"`, `"hard"`, or null          |
| `sortOrder`        | number             | No       | Display order                                    |
| `moduleId`         | string             | No       | Move exercise to a different module              |

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |
| 404 | `{ "error": "Not found" }` | Invalid exercise ID |

---

### DELETE /api/admin/exercises/[id]

Delete an exercise.

**Auth:** Admin

**Path Parameters:**

| Param | Type   | Description  |
|-------|--------|--------------|
| `id`  | string | Exercise ID  |

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

### POST /api/admin/exercises/reorder

Reorder exercises within a module by providing an ordered array of exercise IDs.

**Auth:** Admin

**Request Body:**

| Field         | Type     | Required | Description                           |
|---------------|----------|----------|---------------------------------------|
| `moduleId`    | string   | Yes      | Module ID containing the exercises    |
| `exerciseIds` | string[] | Yes      | Ordered array of exercise IDs         |

**Response (200):**

```json
{ "ok": true }
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid input", "details": {...} }` | Validation failed |
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |

---

## Admin - Audit

### GET /api/admin/audit

Query the audit log with optional action filtering and pagination.

**Auth:** Admin

**Query Parameters:**

| Param    | Type   | Default | Description                                  |
|----------|--------|---------|----------------------------------------------|
| `action` | string | `""`    | Filter by action type (partial match)        |
| `page`   | number | `1`     | Page number (1-based)                        |
| `limit`  | number | `50`    | Results per page (1-100)                     |

**Common action types:** `login`, `login_failed`, `logout`, `register`, `password_change`, `totp_enable`, `totp_disable`, `passkey_register`, `passkey_remove`, `admin_user_edit`, `admin_user_delete`, `admin_resend_verification`, `oauth_link`

**Response (200):**

```json
{
  "entries": [
    {
      "id": 1,
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "action": "login",
      "details": "{\"method\":\"totp\"}",
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0 ...",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Authentication required" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Not an admin |
