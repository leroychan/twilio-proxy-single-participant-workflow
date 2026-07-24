/**
 * Shape of the Twilio client's Sync Documents API that our helpers use.
 * `documents` is both callable (`documents(key)` → a document instance) and
 * has a `.create()` method, matching the Twilio SDK.
 */
type SyncClient = {
  sync: {
    v1: {
      services: (serviceSid: string) => {
        documents: ((key: string) => {
          fetch: () => Promise<{ data?: Record<string, unknown> }>;
          remove: () => Promise<unknown>;
        }) & {
          create: (opts: {
            uniqueName: string;
            data: Record<string, unknown>;
            ttl?: number;
          }) => Promise<unknown>;
        };
        syncMaps: (mapName: string) => {
          syncMapItems: (key: string) => {
            fetch: () => Promise<{ data?: Record<string, unknown> }>;
          };
        };
        syncStreams: ((name: string) => {
          streamMessages: {
            create: (opts: {
              data: Record<string, unknown>;
            }) => Promise<unknown>;
          };
        }) & {
          create: (opts: {
            uniqueName: string;
            ttl?: number;
          }) => Promise<unknown>;
        };
      };
    };
  };
};

// Name of the Sync Map holding the order → parties lookup data. Keep this in
// sync with scripts/seed-lookup.js, which populates the same Map.
export const LOOKUP_SYNC_MAP_NAME = 'lookup';

// How long a resolution is kept in Sync before it auto-expires. Comfortably
// longer than the redirect round-trip that triggers the 2nd out-of-session
// bounce; the TTL is a self-cleaning backstop if that bounce never happens.
export const RESOLUTION_TTL_SECONDS = 900;

// Build the Sync Document uniqueName for a call's resolution. Sync rejects a
// uniqueName that matches the Twilio SID pattern (`[A-Z]{2}[a-f0-9]{32}`), and
// a raw CallSid ("CA" + 32 hex) matches it — so prefix it to make a valid,
// still-unique key. Keep save/get/delete going through this one function.
export function resolutionKey(callSid: string): string {
  return `res-${callSid}`;
}

/**
 * Persist the destination number resolved in `/gather-action` so the *next*
 * `/out-of-session` bounce can read it. The out-of-session callback payload
 * never carries the entered digits, so the resolution has to be stashed
 * out-of-band, keyed by `CallSid` (stable across the redirect).
 *
 * Stored as a Sync Document (uniqueName = CallSid) so it is self-contained and
 * addressable by name with no parent container to create first.
 */
export async function saveResolution(
  client: SyncClient,
  syncServiceSid: string,
  callSid: string,
  realNumber: string
): Promise<void> {
  await client.sync.v1.services(syncServiceSid).documents.create({
    uniqueName: resolutionKey(callSid),
    data: { realNumber },
    ttl: RESOLUTION_TTL_SECONDS,
  });
}

/**
 * Read the destination number stashed by `saveResolution` for this `CallSid`.
 * Returns `null` when there is no resolution yet (e.g. the 1st out-of-session
 * bounce, before the caller has entered a code) — the Sync fetch 404s on a
 * missing document, which we treat as "not resolved".
 */
export async function getResolution(
  client: SyncClient,
  syncServiceSid: string,
  callSid: string
): Promise<string | null> {
  try {
    const doc = await client.sync.v1
      .services(syncServiceSid)
      .documents(resolutionKey(callSid))
      .fetch();
    const realNumber = doc.data && doc.data.realNumber;
    return typeof realNumber === 'string' && realNumber.length > 0
      ? realNumber
      : null;
  } catch {
    // Missing document (404) or any transient read error → treat as unresolved.
    return null;
  }
}

/**
 * Best-effort delete of the resolution once it has been consumed. Failures are
 * swallowed because the Document's TTL is the real cleanup guarantee.
 */
export async function deleteResolution(
  client: SyncClient,
  syncServiceSid: string,
  callSid: string
): Promise<void> {
  try {
    await client.sync.v1
      .services(syncServiceSid)
      .documents(resolutionKey(callSid))
      .remove();
  } catch {
    // already gone / expired — nothing to do.
  }
}

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

/**
 * Read the lookup entry for a 6-digit code from the Sync `lookup` Map. Returns
 * the Map item's `data` (see `resolveCounterparty` for the accepted shapes), or
 * `null` when the code isn't in the Map (Sync 404s) or the read fails.
 */
export async function getLookupEntry(
  client: SyncClient,
  syncServiceSid: string,
  mapName: string,
  digits: string | undefined
): Promise<unknown | null> {
  if (!digits) return null;
  try {
    const item = await client.sync.v1
      .services(syncServiceSid)
      .syncMaps(mapName)
      .syncMapItems(digits)
      .fetch();
    return item.data ?? null;
  } catch {
    // missing code (404) or transient read error → treat as no match.
    return null;
  }
}

/**
 * Resolve the destination ("other party") number from a lookup entry.
 *
 * `entry` is a Sync Map item's `data` (or any parsed lookup value) in one of:
 *   - Bidirectional pair (preferred): `{ parties: ["+partyA", "+partyB"] }`.
 *     One code links two parties. The `from` (caller) is matched against the
 *     pair and the OTHER party's number is returned, so the same code connects
 *     A→B and B→A. If the caller is neither party, fall back to the default.
 *   - One-directional (legacy): `{ number: "+dest" }`. Returns the number
 *     regardless of caller.
 *   - Defensive: a bare array `["+a","+b"]` or bare string `"+dest"` are also
 *     accepted.
 *
 * Falls back to `defaultNumber` when the entry is missing/unusable or the
 * caller is not part of the pair.
 */
export function resolveCounterparty(
  entry: unknown,
  from: string | undefined,
  defaultNumber: string | undefined
): string {
  const isNonEmpty = (n: unknown): n is string =>
    typeof n === 'string' && n.length > 0;

  let parties: string[] | null = null;
  let single: string | null = null;

  if (Array.isArray(entry)) {
    parties = entry.filter(isNonEmpty);
  } else if (entry && typeof entry === 'object') {
    const e = entry as Record<string, unknown>;
    if (Array.isArray(e.parties)) {
      parties = e.parties.filter(isNonEmpty);
    } else if (isNonEmpty(e.number)) {
      single = e.number;
    }
  } else if (isNonEmpty(entry)) {
    single = entry;
  }

  if (parties && parties.length === 2 && from) {
    if (from === parties[0]) return parties[1];
    if (from === parties[1]) return parties[0];
    // caller is not part of this pair → fall through to default
  } else if (single) {
    return single;
  }
  return defaultNumber ?? '';
}

// ---------------------------------------------------------------------------
// Live-feed events (published to a Sync Stream, consumed by the demo-ui).
// ---------------------------------------------------------------------------

export type DemoEventType =
  | 'oos.prompt'
  | 'lookup.request'
  | 'lookup.result'
  | 'resolution.stored'
  | 'oos.autocreate';

export type DemoEvent = {
  type: DemoEventType;
  ts: string;
  callSid?: string;
  from?: string;
  to?: string;
  digits?: string;
  realNumber?: string;
  note?: string;
};

// Name of the Sync Stream the demo-ui subscribes to. Keep in sync with the
// demo-ui token scope (demo-ui/app/api/token/route.ts).
export const EVENTS_STREAM_NAME = 'demo-events';

/**
 * Publish a demo event to the `demo-events` Sync Stream. BEST-EFFORT: this must
 * never throw and never change a webhook's behavior. If the stream doesn't
 * exist yet the first publish 404s, so we create it and retry once; any final
 * error is swallowed.
 */
export async function publishEvent(
  client: SyncClient,
  syncServiceSid: string,
  event: DemoEvent
): Promise<void> {
  const service = () => client.sync.v1.services(syncServiceSid);
  try {
    await service()
      .syncStreams(EVENTS_STREAM_NAME)
      .streamMessages.create({ data: event as unknown as Record<string, unknown> });
    return;
  } catch {
    // Stream likely missing — create it below and retry once.
  }
  try {
    await service().syncStreams.create({ uniqueName: EVENTS_STREAM_NAME });
  } catch {
    // already exists / transient — ignore
  }
  try {
    await service()
      .syncStreams(EVENTS_STREAM_NAME)
      .streamMessages.create({ data: event as unknown as Record<string, unknown> });
  } catch {
    // Give up silently: publishing must never break the call flow.
  }
}
