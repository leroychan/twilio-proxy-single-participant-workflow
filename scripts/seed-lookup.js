#!/usr/bin/env node
/*
 * Seed the Twilio Sync `lookup` Map from the LOOKUP_MAP env var.
 *
 * Run with:  npm run seed:lookup
 * (which is:  node --env-file=.env scripts/seed-lookup.js  — Node >= 20.6)
 *
 * LOOKUP_MAP is the demo data source; this script pushes each entry into the
 * Sync Map that /lookup actually reads at runtime. Real phone numbers live only
 * in .env (gitignored) — never hardcode numbers here.
 *
 * Map item schema (must match resolveCounterparty in helpers.private.ts):
 *   key  = "<6-digit code>"
 *   data = { "parties": ["+partyA", "+partyB"] }   // bidirectional pair
 *        | { "number": "+dest" }                   // legacy one-directional
 */

// Keep in sync with LOOKUP_SYNC_MAP_NAME in src/assets/helpers.private.ts.
const MAP_NAME = 'lookup';

const {
  ACCOUNT_SID,
  AUTH_TOKEN,
  SYNC_SERVICE_SID,
  LOOKUP_MAP,
} = process.env;

function fail(message) {
  console.error(`seed-lookup: ${message}`);
  process.exit(1);
}

if (!ACCOUNT_SID || !AUTH_TOKEN) fail('ACCOUNT_SID and AUTH_TOKEN are required.');
if (!LOOKUP_MAP) fail('LOOKUP_MAP is empty — nothing to seed.');

const syncServiceSid = SYNC_SERVICE_SID || 'default';

let entries;
try {
  entries = JSON.parse(LOOKUP_MAP);
} catch (err) {
  fail(`LOOKUP_MAP is not valid JSON: ${err.message}`);
}

// Convert a LOOKUP_MAP value into the Sync item data shape.
function toData(value) {
  if (Array.isArray(value)) {
    const parties = value.filter((n) => typeof n === 'string' && n.length > 0);
    return { parties };
  }
  if (typeof value === 'string' && value.length > 0) {
    return { number: value };
  }
  return null;
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const client = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);
  const service = client.sync.v1.services(syncServiceSid);

  // Ensure the Map exists (ignore "already exists").
  try {
    await service.syncMaps.create({ uniqueName: MAP_NAME });
    console.log(`Created Sync Map "${MAP_NAME}".`);
  } catch (err) {
    console.log(`Sync Map "${MAP_NAME}" already exists (or: ${err.message}).`);
  }

  let ok = 0;
  for (const [code, value] of Object.entries(entries)) {
    const data = toData(value);
    if (!data) {
      console.warn(`  skip ${code}: unrecognized value shape`);
      continue;
    }
    // Upsert: create the item, or update it if the key already exists.
    try {
      await service.syncMaps(MAP_NAME).syncMapItems.create({ key: code, data });
    } catch {
      await service.syncMaps(MAP_NAME).syncMapItems(code).update({ data });
    }
    ok += 1;
    console.log(`  upserted ${code} -> ${JSON.stringify(data)}`);
  }

  console.log(`Done. Seeded ${ok} entr${ok === 1 ? 'y' : 'ies'} into "${MAP_NAME}".`);
}

main().catch((err) => fail(err.message));
