# Twilio Proxy Single-Participant Workflow — Design

**Date:** 2026-07-19
**Status:** Approved

## Overview

A Twilio Serverless (TypeScript) project, scaffolded with the Twilio CLI, that
handles Twilio Proxy webhooks plus a TwiML `<Gather>` action webhook. It
implements an out-of-session voice flow: an inbound caller with no active Proxy
session is prompted to enter a 6-digit code; the code + caller number are used
to look up the real target number via a (mocked) REST API; a Proxy Session is
then created and the live call is redirected into Proxy to connect the two
parties.

The project is created via:

```
twilio serverless:init twilio-proxy-single-participant-workflow --typescript
```

Because the git repo already exists at the target directory, scaffolding is done
in a temporary location and the generated files are moved into the existing repo
root, preserving `.git`.

## Components (routes)

TypeScript functions in `src/functions/`, using `@twilio/runtime-handler`
signatures.

| File | Route | Purpose |
|------|-------|---------|
| `src/functions/callback.ts` | `/callback` | Proxy Callback webhook. Log event, return `200 OK` (no-op). |
| `src/functions/intercept-callback.ts` | `/intercept-callback` | Proxy Intercept Callback webhook. Log event, return `200 OK` (allow / no-op). |
| `src/functions/out-of-session.ts` | `/out-of-session` | Proxy Out-of-Session Callback. Return TwiML `<Gather>` for 6 DTMF digits. |
| `src/functions/gather-action.ts` | `/gather-action` | Parse `Digits`, call `/lookup`, create Proxy Session, return TwiML `<Redirect>`. |
| `src/functions/lookup.ts` | `/lookup` | Mock REST API: resolve real number from `Digits` via `.env` JSON map + default. |

Shared helpers live in `src/utils/` (kept minimal), notably `getBaseUrl`.

## Data Flow

1. Inbound call to a Proxy number with **no active session** → Proxy calls
   **`/out-of-session`** → we return, with `Content-Type: application/xml`:

   ```xml
   <Response>
     <Gather input="dtmf" numDigits="6" method="POST" action="{baseUrl}/gather-action">
       <Say>Please enter your order number.</Say>
     </Gather>
   </Response>
   ```

2. Caller enters 6 digits → Twilio calls **`/gather-action`** (POST) with
   `Digits`, `From`, `To`.

3. `/gather-action` makes a **real HTTP call to `/lookup`** at
   `{baseUrl}/lookup`, passing `Digits` + `From`.

4. `/lookup` returns `{ realNumber }`, resolved from `LOOKUP_MAP` (JSON keyed by
   `Digits`), falling back to `DEFAULT_REAL_NUMBER`.

5. `/gather-action` **creates a Proxy Session** with two participants:
   - Participant 1: `identifier = From` (caller), `proxyIdentifier = To` (the
     dialed Proxy number).
   - Participant 2: `identifier = realNumber` (target).

6. `/gather-action` returns TwiML (`Content-Type: application/xml`):

   ```xml
   <Response>
     <Redirect method="POST">https://webhooks.twilio.com/v1/Accounts/{ACCOUNT_SID}/Proxy/{PROXY_SERVICE_SID}/Webhooks/Call</Redirect>
   </Response>
   ```

   `ACCOUNT_SID` comes from `context.ACCOUNT_SID` (dynamic). `PROXY_SERVICE_SID`
   comes from `.env`. Proxy matches the redirected live call to the caller
   participant (via `From`/`To`) and dials the target.

## Base URL Resolution

A shared helper `getBaseUrl(context)` produces the absolute base URL used for
**both** the Gather `<action>` and the `/lookup` HTTP call:

1. If `SERVICE_BASE_URL` env var is set and non-empty → use it verbatim.
2. Otherwise derive from `context.DOMAIN_NAME`:
   - `http://` prefix if `DOMAIN_NAME` starts with `localhost`
   - `https://` prefix otherwise (deployed `*.twil.io`)

The `<Redirect>` target is the Twilio Proxy webhooks host
(`https://webhooks.twilio.com/...`) and is **not** derived from the base URL.

## Error Handling

- **`/gather-action`**:
  - Missing/empty `Digits` → TwiML `<Say>` error + `<Hangup>`.
  - `/lookup` failure or Proxy session creation throws → log error, return TwiML
    `<Say>` apology + `<Hangup>`. Never leave the caller on a dead redirect.
- **`/lookup`**: always resolves (map match → default fallback), returns `200`
  with `{ realNumber }`. Malformed `LOOKUP_MAP` JSON is caught → log + fall back
  to `DEFAULT_REAL_NUMBER`.
- **`/callback`, `/intercept-callback`**: wrapped in try/catch, always `200` so
  Proxy is never blocked.
- All TwiML responses set `Content-Type: application/xml` explicitly via a
  `Twilio.Response` object.

## Testing (Jest unit tests)

- `out-of-session`: asserts `<Gather>` with `numDigits="6"`, `input="dtmf"`,
  correct absolute `action`, the `<Say>` prompt, and
  `Content-Type: application/xml`.
- `gather-action`: mocks the `/lookup` HTTP call and the Twilio client's
  `proxy.v1.services(...).sessions.create` (+ participants); asserts participant
  setup (caller with `proxyIdentifier`, target) and the exact `<Redirect>` URL
  including dynamic `ACCOUNT_SID`. Also asserts error paths (missing Digits,
  lookup failure).
- `lookup`: asserts Digits→number resolution, default fallback, and
  malformed-JSON fallback.
- `callback` / `intercept-callback`: assert `200` and no throw.
- `getBaseUrl` helper: asserts env override, `https` for deployed domain, `http`
  for localhost.

## Environment Variables (`.env`)

| Var | Purpose | Example |
|-----|---------|---------|
| `PROXY_SERVICE_SID` | Proxy Service SID for session creation + redirect URL | `KSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `LOOKUP_MAP` | JSON map, Digits → real number | `{"123456":"+15551230000"}` |
| `DEFAULT_REAL_NUMBER` | Fallback target number | `+15559999999` |
| `SERVICE_BASE_URL` | Optional absolute base URL override | `https://twilio-proxy-single-participant-workflow-1234-dev.twil.io` |

- `ACCOUNT_SID` and `DOMAIN_NAME` are provided by the runtime automatically (not
  set manually).
- `.env.example` documents all of the above; the real `.env` stays git-ignored
  (default in the TypeScript template).

## Out of Scope (YAGNI)

- Real number-lookup backend (mocked via `.env` for now).
- Custom Intercept logic / blocking interactions (no-op for now).
- Request signature validation beyond template defaults.
- Deployment automation / CI.
