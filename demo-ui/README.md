# demo-ui

A Next.js dashboard for the Twilio Proxy dynamic-session workflow: live call-flow
feed (via a Sync Stream), lookup-mapping CRUD, reserved-number cards, and a
Courier/Buyer phone staging area. Bilingual (EN / 中文), dark/light themes.

## Setup

```bash
cd demo-ui
cp .env.local.example .env.local   # fill in Twilio account, Sync SID, API key/secret
npm install
npm run dev                        # http://localhost:3000
```

## Env

| Var | Purpose |
|-----|---------|
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | server-side mapping CRUD |
| `TWILIO_SYNC_SERVICE_SID` | the Sync service holding the `lookup` Map + `demo-events` Stream |
| `TWILIO_API_KEY` / `TWILIO_API_SECRET` | mint browser Sync access tokens |

## Test

```bash
npm test
```
