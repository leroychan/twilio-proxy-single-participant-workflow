# Twilio Proxy Single-Participant Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Twilio Serverless (TypeScript) project that handles Twilio Proxy webhooks and a TwiML `<Gather>` action, implementing an out-of-session voice flow that prompts for a 6-digit code, looks up the real target number via a mocked REST API, creates a Proxy Session, and redirects the live call into Proxy.

**Architecture:** Five Twilio Functions (`/callback`, `/intercept-callback`, `/out-of-session`, `/gather-action`, `/lookup`) in `src/functions/*.ts`. Pure logic (`getBaseUrl`, `resolveRealNumber`) lives in a shared `src/assets/helpers.private.ts` module loaded at runtime via `Runtime.getAssets()`. Handlers return TwiML with an explicit `Content-Type: application/xml` header via `Twilio.Response`. The `/gather-action` handler makes a real HTTP call (Node global `fetch`) to `/lookup`, then creates a Proxy Session using `context.getTwilioClient()`.

**Tech Stack:** Twilio Serverless Toolkit (`twilio-run`), TypeScript 5, `@twilio/runtime-handler` 2.x, `twilio` SDK 5.x, Node 22 (global `fetch`), Jest + ts-jest for unit tests.

## Global Constraints

- Project name / directory: `twilio-proxy-single-participant-workflow` (already the repo root; scaffold must be moved into it preserving `.git`).
- Language: TypeScript. Scaffolded via `twilio serverless:init ... --typescript`.
- Runtime: Node 22 (`.twilioserverlessrc` `runtime: node22`). Use global `fetch` — do NOT add axios/node-fetch.
- All TwiML responses MUST set `Content-Type: application/xml` explicitly via `Twilio.Response`.
- `ACCOUNT_SID` is read dynamically from `context.ACCOUNT_SID` (never hardcoded).
- `PROXY_SERVICE_SID` comes from `.env` (a `KS...` SID).
- Redirect target host is exactly `https://webhooks.twilio.com/v1/Accounts/${ACCOUNT_SID}/Proxy/${PROXY_SERVICE_SID}/Webhooks/Call`.
- Out-of-session Gather: `input="dtmf"`, `numDigits="6"`, `method="POST"`, `<Say>Please enter your order number.</Say>`.
- Lookup mapping: `LOOKUP_MAP` env var is a JSON object keyed by the digit string; on no match / malformed JSON, fall back to `DEFAULT_REAL_NUMBER`.
- Base URL for both the Gather `action` and the `/lookup` call: `SERVICE_BASE_URL` env override if set, else derived from `context.DOMAIN_NAME` (`http://` for `localhost*`, else `https://`).
- Callback + Intercept Callback: log and return HTTP 200 (no-op), never throw.
- DRY, YAGNI, TDD, frequent commits.

---

### Task 1: Scaffold the Twilio Serverless TypeScript project into the repo

**Files:**
- Create (via CLI, then move): `package.json`, `tsconfig.json`, `.twilioserverlessrc`, `.gitignore`, `.nvmrc`, `.env`, `src/functions/`, `src/assets/`
- Delete: template example files (`src/functions/hello-world.ts`, `src/functions/private-message.ts`, `src/functions/sms/reply.protected.ts`, `src/assets/message.private.ts`, `src/assets/index.html`, `src/assets/style.css`)

**Interfaces:**
- Produces: a buildable TS serverless project at the repo root. Later tasks add functions under `src/functions/` and helpers under `src/assets/`.

- [ ] **Step 1: Scaffold into a temp directory**

```bash
cd /tmp && rm -rf tpspw-scaffold
twilio serverless:init tpspw-scaffold --typescript --skip-credentials
```

Note: the CLI may print an `EEXIT: 1` error at the very end after "Installing dependencies" — this is a known cosmetic CLI issue; the project files and `node_modules` are still created. Verify the next step regardless.

- [ ] **Step 2: Verify scaffold produced files, then move into the repo root (preserving `.git`)**

```bash
ls /tmp/tpspw-scaffold/package.json /tmp/tpspw-scaffold/tsconfig.json
# Move everything including dotfiles, but NOT the scaffold's own .git if any
cd /tmp/tpspw-scaffold && rm -rf .git
# Copy all contents (including dotfiles) into the existing repo
shopt -s dotglob 2>/dev/null || setopt dotglob 2>/dev/null || true
cp -R /tmp/tpspw-scaffold/. /Users/lechan/Projects/twilio-proxy-single-participant-workflow/
```

Expected: repo root now contains `package.json`, `tsconfig.json`, `.twilioserverlessrc`, `src/`, `node_modules/`, plus the pre-existing `docs/` and `.git/`.

- [ ] **Step 3: Remove the template example functions/assets**

```bash
cd /Users/lechan/Projects/twilio-proxy-single-participant-workflow
rm -f src/functions/hello-world.ts src/functions/private-message.ts
rm -rf src/functions/sms
rm -f src/assets/message.private.ts src/assets/index.html src/assets/style.css
```

- [ ] **Step 4: Set the package name and ensure `.gitignore` ignores build/env**

Edit `package.json` — set `"name": "twilio-proxy-single-participant-workflow"`.

Verify `.gitignore` contains `node_modules`, `dist`, and `.env` (the template's downloaded `.gitignore` includes these). If `.env` is not listed, add these lines to `.gitignore`:

```
node_modules
dist
.env
```

- [ ] **Step 5: Verify the project builds (typecheck)**

Run: `cd /Users/lechan/Projects/twilio-proxy-single-participant-workflow && npx tsc --noEmit`
Expected: exits 0 with no output (no functions yet, nothing to typecheck errors on).

- [ ] **Step 6: Commit**

```bash
cd /Users/lechan/Projects/twilio-proxy-single-participant-workflow
git add -A
git commit -m "chore: scaffold Twilio Serverless TypeScript project"
```

---

### Task 2: Add Jest testing setup

**Files:**
- Modify: `package.json` (devDependencies + scripts)
- Create: `jest.config.js`
- Create: `tests/setup.ts`
- Create: `tests/smoke.test.ts` (temporary, deleted at end of task)

**Interfaces:**
- Produces: `npm test` runs Jest with ts-jest; a global `Twilio` object (`{ ...twilio, Response }`) is available in every test via `tests/setup.ts`. Later tasks add `tests/*.test.ts` files.

- [ ] **Step 1: Install test dependencies**

```bash
cd /Users/lechan/Projects/twilio-proxy-single-participant-workflow
npm install --save-dev jest ts-jest @types/jest
```

Expected: `jest`, `ts-jest`, `@types/jest` appear under `devDependencies` in `package.json`.

- [ ] **Step 2: Create the Jest config**

Create `jest.config.js`:

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  clearMocks: true,
};
```

- [ ] **Step 3: Create the test setup that provides the global `Twilio`**

Create `tests/setup.ts`:

```ts
// Reproduce the runtime's global `Twilio` object the same way the Twilio
// dev runtime builds it: the twilio SDK spread with the runtime `Response`.
import * as twilio from 'twilio';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Response } = require('@twilio/runtime-handler/dist/dev-runtime/internal/response');

(global as any).Twilio = { ...twilio, Response };
```

- [ ] **Step 4: Update `package.json` scripts**

In `package.json`, change the `scripts` block so `test` runs Jest and typechecking is a separate script. Set:

```json
"scripts": {
  "test": "jest",
  "typecheck": "tsc --noEmit",
  "start": "twilio-run --functions-folder dist/functions --assets-folder dist/assets",
  "deploy": "twilio-run deploy --functions-folder dist/functions --assets-folder dist/assets",
  "build": "tsc && npm run build:copy-assets",
  "build:copy-assets": "copyfiles src/assets/* src/assets/**/* --up 2 --exclude **/*.ts dist/assets/",
  "prestart": "npm run build",
  "predeploy": "npm run build"
}
```

- [ ] **Step 5: Write a temporary smoke test to prove Jest + global Twilio work**

Create `tests/smoke.test.ts`:

```ts
test('global Twilio provides twiml and Response', () => {
  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.say('hi');
  expect(twiml.toString()).toContain('<Say>hi</Say>');

  const res = new Twilio.Response();
  res.appendHeader('Content-Type', 'application/xml');
  res.setBody('<Response/>');
  expect(res.headers['Content-Type']).toBe('application/xml');
});
```

- [ ] **Step 6: Run the smoke test**

Run: `npm test`
Expected: PASS (1 test passed).

- [ ] **Step 7: Delete the smoke test and commit**

```bash
cd /Users/lechan/Projects/twilio-proxy-single-participant-workflow
rm tests/smoke.test.ts
git add -A
git commit -m "test: add Jest + ts-jest setup with global Twilio"
```

---

### Task 3: Shared helpers module (`getBaseUrl`, `resolveRealNumber`)

**Files:**
- Create: `src/assets/helpers.private.ts`
- Test: `tests/helpers.test.ts`

**Interfaces:**
- Produces:
  - `getBaseUrl(context: { DOMAIN_NAME?: string; SERVICE_BASE_URL?: string }): string` — returns absolute base URL with no trailing slash.
  - `resolveRealNumber(lookupMapJson: string | undefined, defaultNumber: string | undefined, digits: string | undefined): string` — returns the mapped number for `digits`, else `defaultNumber`, else `''`. Never throws on malformed JSON.
- Consumed by: `/lookup` (`resolveRealNumber`), `/out-of-session` and `/gather-action` (`getBaseUrl`), loaded at runtime via `Runtime.getAssets()['/helpers.js'].path`.

- [ ] **Step 1: Write the failing test**

Create `tests/helpers.test.ts`:

```ts
import { getBaseUrl, resolveRealNumber } from '../src/assets/helpers.private';

describe('getBaseUrl', () => {
  it('uses SERVICE_BASE_URL when set, stripping a trailing slash', () => {
    expect(getBaseUrl({ SERVICE_BASE_URL: 'https://example.twil.io/' })).toBe(
      'https://example.twil.io'
    );
  });

  it('derives https from a deployed DOMAIN_NAME', () => {
    expect(getBaseUrl({ DOMAIN_NAME: 'svc-1234-dev.twil.io' })).toBe(
      'https://svc-1234-dev.twil.io'
    );
  });

  it('derives http from a localhost DOMAIN_NAME', () => {
    expect(getBaseUrl({ DOMAIN_NAME: 'localhost:3000' })).toBe(
      'http://localhost:3000'
    );
  });
});

describe('resolveRealNumber', () => {
  const map = '{"123456":"+15551230000","654321":"+15559990000"}';

  it('returns the mapped number for matching digits', () => {
    expect(resolveRealNumber(map, '+15550000000', '123456')).toBe('+15551230000');
  });

  it('falls back to the default number when digits are not in the map', () => {
    expect(resolveRealNumber(map, '+15550000000', '000000')).toBe('+15550000000');
  });

  it('falls back to the default number when the map JSON is malformed', () => {
    expect(resolveRealNumber('{not json', '+15550000000', '123456')).toBe(
      '+15550000000'
    );
  });

  it('returns empty string when nothing resolves', () => {
    expect(resolveRealNumber(undefined, undefined, '123456')).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/helpers.test.ts`
Expected: FAIL — cannot find module `../src/assets/helpers.private`.

- [ ] **Step 3: Write minimal implementation**

Create `src/assets/helpers.private.ts`:

```ts
export function getBaseUrl(context: {
  DOMAIN_NAME?: string;
  SERVICE_BASE_URL?: string;
}): string {
  const override = context.SERVICE_BASE_URL;
  if (override && override.trim() !== '') {
    return override.trim().replace(/\/+$/, '');
  }
  const domain = context.DOMAIN_NAME || '';
  const scheme = domain.startsWith('localhost') ? 'http' : 'https';
  return `${scheme}://${domain}`;
}

export function resolveRealNumber(
  lookupMapJson: string | undefined,
  defaultNumber: string | undefined,
  digits: string | undefined
): string {
  if (digits && lookupMapJson) {
    try {
      const map = JSON.parse(lookupMapJson) as Record<string, string>;
      if (typeof map[digits] === 'string' && map[digits].length > 0) {
        return map[digits];
      }
    } catch {
      // fall through to default
    }
  }
  return defaultNumber ?? '';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/helpers.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/assets/helpers.private.ts tests/helpers.test.ts
git commit -m "feat: add getBaseUrl and resolveRealNumber helpers"
```

---

### Task 4: `/lookup` mock REST API function

**Files:**
- Create: `src/functions/lookup.ts`
- Test: `tests/lookup.test.ts`

**Interfaces:**
- Consumes: `resolveRealNumber` from `helpers.private` (loaded via `Runtime.getAssets()['/helpers.js'].path`).
- Produces: HTTP endpoint `/lookup`. Accepts `Digits` and `From` (query or POST body). Responds `200` with JSON `{ "realNumber": string }` and `Content-Type: application/json`.

- [ ] **Step 1: Write the failing test**

Create `tests/lookup.test.ts`:

```ts
import path from 'path';
import { handler } from '../src/functions/lookup';

function mockRuntime() {
  (global as any).Runtime = {
    getAssets: () => ({
      '/helpers.js': {
        path: path.resolve(__dirname, '../src/assets/helpers.private.ts'),
      },
    }),
  };
}

const baseContext = {
  LOOKUP_MAP: '{"123456":"+15551230000"}',
  DEFAULT_REAL_NUMBER: '+15559999999',
};

beforeEach(() => mockRuntime());

it('returns the mapped number as JSON for matching digits', (done) => {
  handler(
    baseContext as any,
    { Digits: '123456', From: '+15551112222' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(response.body)).toEqual({ realNumber: '+15551230000' });
      done();
    }
  );
});

it('returns the default number when digits do not match', (done) => {
  handler(
    baseContext as any,
    { Digits: '000000', From: '+15551112222' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(JSON.parse(response.body)).toEqual({ realNumber: '+15559999999' });
      done();
    }
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lookup.test.ts`
Expected: FAIL — cannot find module `../src/functions/lookup`.

- [ ] **Step 3: Write minimal implementation**

Create `src/functions/lookup.ts`:

```ts
import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from '@twilio-labs/serverless-runtime-types/types';
import type * as Helpers from '../assets/helpers.private';

type LookupContext = {
  LOOKUP_MAP?: string;
  DEFAULT_REAL_NUMBER?: string;
};

type LookupEvent = {
  Digits?: string;
  From?: string;
};

export const handler: ServerlessFunctionSignature = function (
  context: Context<LookupContext>,
  event: ServerlessEventObject<LookupEvent>,
  callback: ServerlessCallback
) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require(Runtime.getAssets()['/helpers.js']
    .path) as typeof Helpers;

  const realNumber = helpers.resolveRealNumber(
    context.LOOKUP_MAP,
    context.DEFAULT_REAL_NUMBER,
    event.Digits
  );

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.setBody(JSON.stringify({ realNumber }));
  return callback(null, response);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lookup.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/functions/lookup.ts tests/lookup.test.ts
git commit -m "feat: add /lookup mock REST API function"
```

---

### Task 5: `/out-of-session` function

**Files:**
- Create: `src/functions/out-of-session.ts`
- Test: `tests/out-of-session.test.ts`

**Interfaces:**
- Consumes: `getBaseUrl` from `helpers.private`.
- Produces: HTTP endpoint `/out-of-session`. Returns TwiML `<Gather input="dtmf" numDigits="6" method="POST" action="{baseUrl}/gather-action"><Say>Please enter your order number.</Say></Gather>` with `Content-Type: application/xml`.

- [ ] **Step 1: Write the failing test**

Create `tests/out-of-session.test.ts`:

```ts
import path from 'path';
import { handler } from '../src/functions/out-of-session';

beforeEach(() => {
  (global as any).Runtime = {
    getAssets: () => ({
      '/helpers.js': {
        path: path.resolve(__dirname, '../src/assets/helpers.private.ts'),
      },
    }),
  };
});

it('returns a Gather for 6 DTMF digits with an application/xml content type', (done) => {
  handler(
    { DOMAIN_NAME: 'svc-1234-dev.twil.io' } as any,
    {} as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.headers['Content-Type']).toBe('application/xml');
      const body = response.body as string;
      expect(body).toContain('<Gather');
      expect(body).toContain('input="dtmf"');
      expect(body).toContain('numDigits="6"');
      expect(body).toContain('method="POST"');
      expect(body).toContain(
        'action="https://svc-1234-dev.twil.io/gather-action"'
      );
      expect(body).toContain('<Say>Please enter your order number.</Say>');
      done();
    }
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/out-of-session.test.ts`
Expected: FAIL — cannot find module `../src/functions/out-of-session`.

- [ ] **Step 3: Write minimal implementation**

Create `src/functions/out-of-session.ts`:

```ts
import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
} from '@twilio-labs/serverless-runtime-types/types';
import type * as Helpers from '../assets/helpers.private';

type OutOfSessionContext = {
  SERVICE_BASE_URL?: string;
};

export const handler: ServerlessFunctionSignature = function (
  context: Context<OutOfSessionContext>,
  event: {},
  callback: ServerlessCallback
) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require(Runtime.getAssets()['/helpers.js']
    .path) as typeof Helpers;
  const baseUrl = helpers.getBaseUrl(context);

  const twiml = new Twilio.twiml.VoiceResponse();
  const gather = twiml.gather({
    input: ['dtmf'],
    numDigits: 6,
    method: 'POST',
    action: `${baseUrl}/gather-action`,
  });
  gather.say('Please enter your order number.');

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/xml');
  response.setBody(twiml.toString());
  return callback(null, response);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/out-of-session.test.ts`
Expected: PASS. (Note: the `twilio` SDK renders `input=["dtmf"]` as the attribute `input="dtmf"`.)

- [ ] **Step 5: Commit**

```bash
git add src/functions/out-of-session.ts tests/out-of-session.test.ts
git commit -m "feat: add /out-of-session Gather TwiML function"
```

---

### Task 6: `/gather-action` function

**Files:**
- Create: `src/functions/gather-action.ts`
- Test: `tests/gather-action.test.ts`

**Interfaces:**
- Consumes: `getBaseUrl` from `helpers.private`; Node global `fetch`; `context.getTwilioClient()`; `context.ACCOUNT_SID`; `context.PROXY_SERVICE_SID`.
- Produces: HTTP endpoint `/gather-action`. On success returns TwiML `<Redirect method="POST">https://webhooks.twilio.com/v1/Accounts/{ACCOUNT_SID}/Proxy/{PROXY_SERVICE_SID}/Webhooks/Call</Redirect>` with `Content-Type: application/xml`. On missing `Digits` or any failure, returns TwiML `<Say>...</Say><Hangup/>` (still `application/xml`).

- [ ] **Step 1: Write the failing test**

Create `tests/gather-action.test.ts`:

```ts
import path from 'path';
import { handler } from '../src/functions/gather-action';

const sessionsCreate = jest.fn();
const participantsCreate = jest.fn();

function makeContext() {
  // client.proxy.v1.services(sid).sessions.create(...)
  // client.proxy.v1.services(sid).sessions(sessionSid).participants.create(...)
  const sessionInstance = { participants: { create: participantsCreate } };
  const sessions: any = jest.fn(() => sessionInstance);
  sessions.create = sessionsCreate;
  const service = { sessions };
  const client = { proxy: { v1: { services: jest.fn(() => service) } } };

  return {
    ACCOUNT_SID: 'ACtestaccountsid00000000000000000',
    PROXY_SERVICE_SID: 'KStestproxyservice0000000000000000',
    SERVICE_BASE_URL: 'https://svc-1234-dev.twil.io',
    getTwilioClient: () => client,
  };
}

beforeEach(() => {
  (global as any).Runtime = {
    getAssets: () => ({
      '/helpers.js': {
        path: path.resolve(__dirname, '../src/assets/helpers.private.ts'),
      },
    }),
  };
  sessionsCreate.mockResolvedValue({ sid: 'KCtestsession0000000000000000000000' });
  participantsCreate.mockResolvedValue({ sid: 'KPtestparticipant000000000000000000' });
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ realNumber: '+15551230000' }),
  });
});

it('looks up the number, creates a session with both participants, and redirects', (done) => {
  const context = makeContext();
  handler(
    context as any,
    { Digits: '123456', From: '+15551112222', To: '+15553334444' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();

      // called /lookup with the digits + From
      const fetchUrl = (global as any).fetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('https://svc-1234-dev.twil.io/lookup');

      // participant 1 = caller with proxyIdentifier = To
      expect(participantsCreate).toHaveBeenCalledWith({
        identifier: '+15551112222',
        proxyIdentifier: '+15553334444',
      });
      // participant 2 = target real number
      expect(participantsCreate).toHaveBeenCalledWith({
        identifier: '+15551230000',
      });

      // redirect TwiML with dynamic ACCOUNT_SID + PROXY_SERVICE_SID
      expect(response.headers['Content-Type']).toBe('application/xml');
      expect(response.body).toContain(
        'https://webhooks.twilio.com/v1/Accounts/ACtestaccountsid00000000000000000/Proxy/KStestproxyservice0000000000000000/Webhooks/Call'
      );
      expect(response.body).toContain('<Redirect');
      done();
    }
  );
});

it('says an error and hangs up when Digits are missing', (done) => {
  const context = makeContext();
  handler(
    context as any,
    { From: '+15551112222', To: '+15553334444' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.headers['Content-Type']).toBe('application/xml');
      expect(response.body).toContain('<Say>');
      expect(response.body).toContain('<Hangup');
      expect(sessionsCreate).not.toHaveBeenCalled();
      done();
    }
  );
});

it('says an error and hangs up when session creation fails', (done) => {
  const context = makeContext();
  sessionsCreate.mockRejectedValue(new Error('boom'));
  handler(
    context as any,
    { Digits: '123456', From: '+15551112222', To: '+15553334444' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.body).toContain('<Hangup');
      done();
    }
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/gather-action.test.ts`
Expected: FAIL — cannot find module `../src/functions/gather-action`.

- [ ] **Step 3: Write minimal implementation**

Create `src/functions/gather-action.ts`:

```ts
import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from '@twilio-labs/serverless-runtime-types/types';
import type * as Helpers from '../assets/helpers.private';

type GatherContext = {
  ACCOUNT_SID?: string;
  PROXY_SERVICE_SID?: string;
  SERVICE_BASE_URL?: string;
};

type GatherEvent = {
  Digits?: string;
  From?: string;
  To?: string;
};

function errorTwiml(message: string): string {
  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.say(message);
  twiml.hangup();
  return twiml.toString();
}

function xmlResponse(body: string): any {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/xml');
  response.setBody(body);
  return response;
}

export const handler: ServerlessFunctionSignature = async function (
  context: Context<GatherContext>,
  event: ServerlessEventObject<GatherEvent>,
  callback: ServerlessCallback
) {
  const { Digits, From, To } = event;

  if (!Digits || !From || !To) {
    return callback(
      null,
      xmlResponse(errorTwiml('Sorry, we did not receive your input. Goodbye.'))
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const helpers = require(Runtime.getAssets()['/helpers.js']
      .path) as typeof Helpers;
    const baseUrl = helpers.getBaseUrl(context);

    // 1. Look up the real target number via the mock REST API.
    const lookupUrl =
      `${baseUrl}/lookup?Digits=${encodeURIComponent(Digits)}` +
      `&From=${encodeURIComponent(From)}`;
    const lookupResponse = await fetch(lookupUrl);
    if (!lookupResponse.ok) {
      throw new Error(`Lookup failed with status ${lookupResponse.status}`);
    }
    const { realNumber } = (await lookupResponse.json()) as {
      realNumber: string;
    };
    if (!realNumber) {
      throw new Error('Lookup returned no number');
    }

    // 2. Create a Proxy Session with both participants.
    const client = context.getTwilioClient();
    const serviceSid = context.PROXY_SERVICE_SID as string;
    const session = await client.proxy.v1
      .services(serviceSid)
      .sessions.create({});

    // Participant 1: the caller, keyed to the proxy number they dialed.
    await client.proxy.v1
      .services(serviceSid)
      .sessions(session.sid)
      .participants.create({ identifier: From, proxyIdentifier: To });

    // Participant 2: the real target number.
    await client.proxy.v1
      .services(serviceSid)
      .sessions(session.sid)
      .participants.create({ identifier: realNumber });

    // 3. Redirect the live call into Proxy to connect the two parties.
    const redirectUrl =
      `https://webhooks.twilio.com/v1/Accounts/${context.ACCOUNT_SID}` +
      `/Proxy/${serviceSid}/Webhooks/Call`;
    const twiml = new Twilio.twiml.VoiceResponse();
    twiml.redirect({ method: 'POST' }, redirectUrl);
    return callback(null, xmlResponse(twiml.toString()));
  } catch (err) {
    console.error('gather-action error:', err);
    return callback(
      null,
      xmlResponse(
        errorTwiml('Sorry, we could not connect your call. Please try again later.')
      )
    );
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/gather-action.test.ts`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add src/functions/gather-action.ts tests/gather-action.test.ts
git commit -m "feat: add /gather-action lookup + Proxy session + redirect"
```

---

### Task 7: `/callback` and `/intercept-callback` no-op functions

**Files:**
- Create: `src/functions/callback.ts`
- Create: `src/functions/intercept-callback.ts`
- Test: `tests/callback.test.ts`

**Interfaces:**
- Produces: HTTP endpoints `/callback` and `/intercept-callback`. Both log the incoming event and return HTTP `200` with an empty JSON body (`{}`), `Content-Type: application/json`. Never throw.

- [ ] **Step 1: Write the failing test**

Create `tests/callback.test.ts`:

```ts
import { handler as callback } from '../src/functions/callback';
import { handler as interceptCallback } from '../src/functions/intercept-callback';

it('callback returns 200 and does not throw', (done) => {
  callback(
    {} as any,
    { interactionSid: 'KI123', outboundResourceStatus: 'delivered' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.statusCode).toBe(200);
      done();
    }
  );
});

it('intercept-callback returns 200 and does not throw', (done) => {
  interceptCallback(
    {} as any,
    { interactionSid: 'KI123' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.statusCode).toBe(200);
      done();
    }
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/callback.test.ts`
Expected: FAIL — cannot find module `../src/functions/callback`.

- [ ] **Step 3: Write minimal implementations**

Create `src/functions/callback.ts`:

```ts
import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
} from '@twilio-labs/serverless-runtime-types/types';

export const handler: ServerlessFunctionSignature = function (
  _context: Context,
  event: {},
  callback: ServerlessCallback
) {
  try {
    console.log('Proxy Callback received:', JSON.stringify(event));
  } catch {
    // never let logging break the webhook
  }
  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.appendHeader('Content-Type', 'application/json');
  response.setBody(JSON.stringify({}));
  return callback(null, response);
};
```

Create `src/functions/intercept-callback.ts`:

```ts
import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
} from '@twilio-labs/serverless-runtime-types/types';

export const handler: ServerlessFunctionSignature = function (
  _context: Context,
  event: {},
  callback: ServerlessCallback
) {
  try {
    console.log('Proxy Intercept Callback received:', JSON.stringify(event));
  } catch {
    // never let logging break the webhook
  }
  // Empty 200 tells Proxy to allow the interaction to proceed normally.
  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.appendHeader('Content-Type', 'application/json');
  response.setBody(JSON.stringify({}));
  return callback(null, response);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/callback.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/functions/callback.ts src/functions/intercept-callback.ts tests/callback.test.ts
git commit -m "feat: add /callback and /intercept-callback no-op webhooks"
```

---

### Task 8: Environment docs, README, and full verification

**Files:**
- Create: `.env.example`
- Create: `README.md`
- Modify: `.env` (add the new keys locally for `twilio serverless:start`)

**Interfaces:**
- Produces: documented env vars and run/deploy instructions. Final green build + test run.

- [ ] **Step 1: Create `.env.example`**

Create `.env.example`:

```
# Twilio account credentials (ACCOUNT_SID is also available at runtime as context.ACCOUNT_SID)
ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_TOKEN=your_auth_token

# Proxy Service SID used for session creation and the redirect URL
PROXY_SERVICE_SID=KSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# JSON map of entered 6-digit code -> real destination number
LOOKUP_MAP={"123456":"+15551230000","654321":"+15559990000"}

# Fallback destination number when the entered code is not in LOOKUP_MAP
DEFAULT_REAL_NUMBER=+15559999999

# Optional: absolute base URL of this deployed service. When empty, the base
# URL is derived from context.DOMAIN_NAME (https for *.twil.io, http for localhost).
SERVICE_BASE_URL=
```

- [ ] **Step 2: Add the new keys to the local `.env`**

Append to `.env` (real values for local testing; `.env` is git-ignored):

```
PROXY_SERVICE_SID=KSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LOOKUP_MAP={"123456":"+15551230000"}
DEFAULT_REAL_NUMBER=+15559999999
SERVICE_BASE_URL=
```

- [ ] **Step 3: Create `README.md`**

Create `README.md`:

````markdown
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
````

- [ ] **Step 4: Run the full test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: all test suites PASS; `tsc --noEmit` exits 0.

- [ ] **Step 5: Verify a production build succeeds**

Run: `npm run build`
Expected: exits 0; `dist/functions/*.js` and `dist/assets/helpers.js` exist.

```bash
ls dist/functions/gather-action.js dist/assets/helpers.js
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: add .env.example and README; finalize env vars"
```

---

## Self-Review Notes

- **Spec coverage:** callback (Task 7), intercept-callback (Task 7), out-of-session Gather w/ application/xml (Task 5), gather-action parse Digits → REST lookup → Proxy session (both participants) → redirect with dynamic ACCOUNT_SID + env PROXY_SERVICE_SID (Task 6), mock `/lookup` keyed by Digits w/ default fallback (Task 4), `SERVICE_BASE_URL` override with `DOMAIN_NAME` default for both action + lookup (Task 3, used in Tasks 5/6), TypeScript + Twilio CLI scaffold (Task 1), Jest unit tests (Task 2 + each function task).
- **Type consistency:** `getBaseUrl` / `resolveRealNumber` signatures in Task 3 match their call sites in Tasks 4/5/6. Proxy client shape (`proxy.v1.services(sid).sessions.create` / `.sessions(sid).participants.create`) is consistent between the Task 6 mock and implementation.
- **No placeholders:** all steps contain runnable code/commands; `KS`/`AC` values in docs are illustrative env examples, not code placeholders.
