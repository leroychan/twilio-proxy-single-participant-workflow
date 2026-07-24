# Demo UI — Design Spec

**Date:** 2026-07-24
**Status:** Approved (brainstorm) — ready for implementation planning
**Location:** new `demo-ui/` app at the repo root

## Purpose

A modern, single-page demo UI for the Twilio Proxy dynamic-session workflow. It
lets an operator watch the live call flow in real time, manage the order→parties
lookup mappings, see the reserved Proxy-pool numbers to call, and stage two
physical phones (Courier / Buyer) during a demo. It follows the Twilio brand
palette, supports light/dark themes (dark default), and is bilingual
(English + 简体中文).

## Goals

- Real-time visibility into the workflow: out-of-session bounces, lookup calls,
  and temporary-mapping storage, rendered prominently as they happen.
- Full CRUD over the Sync `lookup` Map (order code → the two parties).
- Show reserved Proxy-pool numbers (mock, masked) as styled "parcel slip" cards,
  with a settings-driven appearance.
- A staging area: Courier / Buyer labels over large drop-zone placeholders for
  physically resting a phone.
- On-brand look: Twilio Red `#EF223A`, Ink `#000D25`, White; semantic color
  tokens; dark (default) / light theme switch; EN / 中文 language switch.

## Non-goals (YAGNI)

- No authentication / login.
- No server-side persistence of labels or settings (client `localStorage` only).
- No real reserved-number provisioning (mock data only).
- No editing of temporary `res-<CallSid>` resolution documents from the UI.
- No production deploy configuration for the Next.js app.

## Constraints

- **No real phone numbers in any git-tracked file.** Mock reserved numbers and
  all examples use clearly-fictional placeholders (`+1555…`). Real numbers live
  only in Twilio Sync (live data) and in transit — never written to repo files.
  Real credentials live only in gitignored env files.
- Publishing live-feed events from the existing Twilio Functions must be
  best-effort: a Sync publish failure must never break the call flow.
- SPA feel: client-side routing, no full page reloads. Dark theme is the default.

## Decisions (locked)

| Area | Decision |
|------|----------|
| Runtime | Next.js (App Router) with client-rendered pages + server Route Handlers that hold Twilio credentials |
| Styling | Tailwind CSS + shadcn/ui (Radix), Twilio brand tokens as CSS variables |
| Live feed | Twilio Sync **Stream** (ephemeral); browser subscribes directly via the JS SDK |
| Card styles | Parcel slip (default) + boarding pass + plain card |
| i18n | i18next + react-i18next, header toggle, no locale-prefixed URLs, persisted to `localStorage` |
| Env | `demo-ui/.env.local` (own file) referencing the same Twilio account/Sync service |
| Reserved numbers | Mock + masked, fictional placeholders only |

## High-level architecture

```
demo-ui/                         new Next.js App Router app, self-contained
├── app/
│   ├── layout.tsx               providers: theme, i18n, sync
│   ├── page.tsx                 main demo dashboard
│   ├── mappings/page.tsx        CRUD the Sync `lookup` Map
│   ├── settings/page.tsx        card style, labels, theme, language
│   └── api/                     server Route Handlers (Twilio creds server-side)
│       ├── token/route.ts       mint a scoped Sync access token
│       ├── mappings/route.ts    GET (list) + POST (create) lookup items
│       └── mappings/[code]/route.ts   PUT (update) + DELETE a single item
├── components/                  LiveFeed, ReservedNumberCard, DropZone, header, ...
├── lib/                         twilio server client, event schema, i18n init
├── locales/                     en.json, zh.json
├── public/twilio-logo-red.png   moved from ~/Downloads/twilio_logo_1color_red.png
└── .env.local                   ACCOUNT_SID, AUTH_TOKEN, SYNC_SERVICE_SID, API_KEY/SECRET

repo backend (existing Twilio Functions) — additive changes
└── src/assets/helpers.private.ts   add publishEvent() (Sync Stream, best-effort)
    src/functions/lookup.ts         publish lookup.request / lookup.result
    src/functions/gather-action.ts  publish resolution.stored
    src/functions/out-of-session.ts publish oos.prompt / oos.autocreate
```

Two browser→Twilio paths:
1. **Mapping CRUD** → Next.js `/api/mappings*` → Twilio SDK (credentials stay on
   the server).
2. **Live feed** → browser subscribes directly to the Twilio Sync Stream using a
   short-lived access token from `/api/token`.

## Live-flow event model

A single Twilio Sync **Stream** named `demo-events`. The existing Functions
publish typed messages to it; the browser subscribes and renders a timeline.

Event shape (all fields optional except `type` and `ts`):

```ts
type DemoEvent = {
  type:
    | 'oos.prompt'        // 1st out-of-session bounce: caller prompted for code
    | 'lookup.request'    // code entered, resolving the counterparty
    | 'lookup.result'     // counterparty resolved (number masked in UI)
    | 'resolution.stored' // temporary mapping stashed in Sync (res-<CallSid>)
    | 'oos.autocreate';   // 2nd bounce: session auto-created, call bridging
  ts: string;             // ISO timestamp (from the Function)
  callSid?: string;
  from?: string;          // masked in UI, never logged raw to repo files
  to?: string;
  digits?: string;        // the entered order code
  realNumber?: string;    // masked in UI
  note?: string;
};
```

| type | Published from | UI meaning |
|------|----------------|------------|
| `oos.prompt` | `out-of-session.ts` (1st bounce) | Caller reached the number; prompted for code |
| `lookup.request` | `lookup.ts` | Code entered; resolving counterparty |
| `lookup.result` | `lookup.ts` | Resolved (masked) |
| `resolution.stored` | `gather-action.ts` | Temporary mapping stored in Sync |
| `oos.autocreate` | `out-of-session.ts` (2nd bounce) | Session auto-created; call bridging |

The **LiveFeed** panel renders these reverse-chronologically. `oos.*` events get
prominent styling. Feed is ephemeral (empty on reload).

### Backend changes (additive, best-effort)

Add to `src/assets/helpers.private.ts`:

```ts
export const EVENTS_STREAM_NAME = 'demo-events';

// Publish a demo event to the Sync Stream. Best-effort: any failure is swallowed
// so it can never break the call flow. The Stream is created lazily by Sync on
// first publish (or ensured by a create-if-missing wrapper).
export async function publishEvent(
  client: SyncClient,
  syncServiceSid: string,
  event: DemoEvent
): Promise<void> { /* try { streams(name).streamMessages.create({data: event}) } catch {} */ }
```

- Extend the `SyncClient` type with the `syncStreams(name).streamMessages.create(...)`
  shape.
- `lookup.ts`: publish `lookup.request` before resolving, `lookup.result` after.
- `gather-action.ts`: publish `resolution.stored` after `saveResolution`.
- `out-of-session.ts`: publish `oos.prompt` on the first bounce, `oos.autocreate`
  on the second.
- Every publish call is wrapped so a Sync error is logged and ignored, never
  thrown. Existing Function behavior and responses are unchanged.
- The events Stream name lives in one exported constant, mirrored by the demo-ui
  token scope.

## Pages & components

### Main dashboard (`/`)

Top to bottom:
1. **Header** — Twilio logo, dark/light theme switch (dark default), EN/中文
   language switch, nav links to Mappings and Settings.
2. **Live flow panel** (`<LiveFeed>`) — prominent real-time timeline of
   `DemoEvent`s from the `demo-events` Stream. `oos.*` events highlighted.
3. **Reserved numbers** (`<ReservedNumbers>`) — grid of mock reserved Proxy-pool
   numbers rendered with `<ReservedNumberCard>` in the selected style. These are
   "the numbers you call". Mock + masked.
4. **Staging area** — two columns (Courier / Buyer). Each shows a label (chosen
   in settings, from `localStorage`) above a large `<DropZone>` placeholder for
   physically resting a phone. Drop zone is a visual placeholder only.

### Mappings page (`/mappings`)

- Table of `lookup` Map items: **code**, **Party A**, **Party B**.
- CRUD via `/api/mappings*`:
  - `GET /api/mappings` → list all items.
  - `POST /api/mappings` → create `{ code, parties: [a, b] }`.
  - `PUT /api/mappings/[code]` → update parties.
  - `DELETE /api/mappings/[code]` → remove.
- Add/edit in a shadcn `Dialog`; delete behind a confirm.
- This is live Twilio data (real numbers may exist there); the UI never writes
  those numbers to any repo file.

### Settings page (`/settings`)

All client-side (`localStorage`), no server storage:
- **Reserved-number card style:** parcel slip / boarding pass / plain card.
- **Courier & Buyer labels:** a preset dropdown + free-text input for each.
- **Theme & language:** also settable here (mirrors the header).

### Key components

| Component | Responsibility |
|-----------|----------------|
| `LiveFeed` | Subscribe to the Sync Stream (via `useSyncStream` hook), render event timeline |
| `ReservedNumberCard` | Render one reserved number in the active style (parcel slip / boarding pass / plain) |
| `ReservedNumbers` | Lay out the grid; read mock data + active style from settings |
| `DropZone` | Large labeled placeholder box for a physical phone |
| `MappingsTable` + `MappingDialog` | CRUD table + add/edit dialog |
| `ThemeSwitch`, `LanguageSwitch` | Header controls |

### Hooks & lib

- `lib/twilio.ts` — server-only Twilio client factory (used by Route Handlers).
- `lib/events.ts` — `DemoEvent` type + a parse/validate helper shared with the feed.
- `lib/mask.ts` — phone-number masking for display.
- `hooks/useSyncStream.ts` — fetch a token from `/api/token`, open the Sync
  client, subscribe to `demo-events`, expose the event list + connection state.
- `lib/settings.ts` — typed `localStorage` get/set for card style + labels.

## Theming & brand tokens

CSS variables express Twilio semantic tokens; theme switch flips a `.dark` /
`data-theme` on `<html>`. Tailwind colors reference the variables.

Primitives:
- `red-450` = `#EF223A` (Twilio Red / accent)
- `blue-900` = `#000D25` (Ink)
- `white` = `#FFFFFF`

Semantic tokens (mapped per theme):

| Token | Dark (default) | Light |
|-------|----------------|-------|
| `surface-primary` | blue-900 | white |
| `on-primary` | white | blue-900 |
| `container-inverse` | white | blue-900 |
| `on-inverse` | blue-900 | white |
| `container-accent` | red-450 | red-450 |
| `on-accent` | white | white |
| `accent` | red-450 | red-450 |

- Logo moved to `demo-ui/public/twilio-logo-red.png` (from
  `~/Downloads/twilio_logo_1color_red.png`).
- Red is used as the accent/attention color (buttons, highlights, `oos.*`
  events), not as a surface, in dark and light — consistent with the brand
  system's accent role.

## i18n

- i18next + react-i18next initialized in a client provider.
- All visible strings keyed in `locales/en.json` and `locales/zh.json`.
- Language toggle in the header; no locale-prefixed routes; selection persisted
  to `localStorage` and applied on load.

## Environment & config

`demo-ui/.env.local` (gitignored), with a committed `demo-ui/.env.local.example`
using placeholders:

```
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_SYNC_SERVICE_SID=ISxxxx
TWILIO_API_KEY=SKxxxx        # for minting Sync access tokens
TWILIO_API_SECRET=xxxx
```

- Route Handlers read these server-side. The browser never receives credentials;
  it only receives a short-lived Sync access token from `/api/token`.
- `demo-ui/` has its own `package.json` and is not wired into the serverless
  build. Root `package.json` name stays as-is (not renamed) unless requested.

## Testing

- **Tooling:** Vitest + React Testing Library for demo-ui; existing Jest suite
  for the backend Functions.
- demo-ui unit/component tests:
  - `lib/events.ts` parse/validate (valid, unknown type, missing fields).
  - `lib/mask.ts` masking.
  - `lib/settings.ts` localStorage round-trip.
  - `LiveFeed` renders events and highlights `oos.*` (mocked hook).
  - `ReservedNumberCard` renders each of the three styles.
  - Route Handlers (`/api/mappings*`, `/api/token`) with a mocked Twilio SDK:
    list/create/update/delete map items; token scoped to the events Stream.
- Backend tests:
  - `publishEvent` unit test: success path + failure is swallowed (never throws).
  - Update `lookup` / `gather-action` / `out-of-session` tests to assert publish
    is called but its failure does not change the response.

## Verification

1. `npm test` (backend) + `npm run typecheck` — green, including updated Function
   tests.
2. `cd demo-ui && npm test` — green.
3. `cd demo-ui && npm run dev` — dashboard loads, dark theme by default, theme
   and language toggles work.
4. Mappings page: create/edit/delete an item; confirm it appears in Twilio Sync.
5. Place a live call; confirm `oos.prompt`, `lookup.request`, `lookup.result`,
   `resolution.stored`, `oos.autocreate` stream into the Live flow panel in real
   time, numbers masked.
6. Reserved-number style switch in settings changes the card rendering; Courier /
   Buyer labels update from settings; drop zones render as placeholders.
7. **No leaked numbers:** `git grep -nE '\+[0-9]{6,}' -- ':!*.env*' | grep -v '+1555'`
   returns nothing in tracked files; `.env.local` is gitignored and never staged.

## Open questions

None outstanding. Ready for implementation planning.
