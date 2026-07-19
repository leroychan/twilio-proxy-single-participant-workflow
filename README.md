# twilio-proxy-single-participant-workflow

Twilio Serverless (TypeScript) functions for a Twilio Proxy out-of-session voice flow.

## Endpoints

| Route | Configure as |
|-------|--------------|
| `/callback` | Proxy Service **Callback URL** |
| `/intercept-callback` | Proxy Service **Intercept Callback URL** |
| `/out-of-session` | Proxy Service **Out-of-Session Callback URL** (Voice) |
| `/gather-action` | Target of the `<Gather action>` (set automatically) |
| `/lookup` | Mock number-lookup REST API (called internally) |

## Flow

1. Inbound call with no active session → `/out-of-session` returns a `<Gather>` for a 6-digit code.
2. Caller enters the code → `/gather-action` calls `/lookup`, creates a Proxy Session with the caller and the resolved real number, and `<Redirect>`s the call into Proxy.

## Setup

```bash
npm install
cp .env.example .env   # fill in real values
```

## Test

```bash
npm test         # jest unit tests
npm run typecheck
```

## Run locally

```bash
npm start
```

## Deploy

```bash
npm run deploy
```

After deploying, set the three Proxy Service webhook URLs (above) to the deployed function URLs.
