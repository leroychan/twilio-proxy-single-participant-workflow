import path from 'path';
import { handler } from '../src/functions/out-of-session';

const documentFetch = jest.fn();
const documentRemove = jest.fn();

// add alongside the existing documents mock:
const streamMessagesCreate = jest.fn().mockResolvedValue({});
const syncStreams: any = jest.fn(() => ({
  streamMessages: { create: streamMessagesCreate },
}));
syncStreams.create = jest.fn().mockResolvedValue({});

function makeContext(extra: Record<string, unknown> = {}) {
  // client.sync.v1.services(sid).documents(key).fetch()/.remove()
  const documentInstance = { fetch: documentFetch, remove: documentRemove };
  const documents: any = jest.fn(() => documentInstance);
  const syncService = { documents, syncStreams };
  const client = { sync: { v1: { services: jest.fn(() => syncService) } } };

  return {
    DOMAIN_NAME: 'svc-1234-dev.twil.io',
    SYNC_SERVICE_SID: 'IStestsyncservice00000000000000000',
    getTwilioClient: () => client,
    ...extra,
  };
}

// Invoke the (now async) callback-style handler as a promise.
function invoke(context: any, event: any): Promise<any> {
  return new Promise((resolve, reject) => {
    handler(context, event, (err: any, response: any) =>
      err ? reject(err) : resolve(response)
    );
  });
}

beforeEach(() => {
  streamMessagesCreate.mockReset().mockResolvedValue({});
  (global as any).Runtime = {
    getAssets: () => ({
      '/helpers.js': {
        path: path.resolve(__dirname, '../src/assets/helpers.private.ts'),
      },
    }),
  };
  documentRemove.mockResolvedValue(undefined);
});

it('returns a Gather on the first bounce (no resolution stored yet)', async () => {
  // No Sync document for this CallSid → fetch rejects (404) → treated as unresolved.
  documentFetch.mockRejectedValue(new Error('not found'));

  const response = await invoke(makeContext(), {
    From: '+15551112222',
    CallSid: 'CAtestcallsid000000000000000000000',
  });

  expect(response.headers['Content-Type']).toBe('application/xml');
  const body = response.body as string;
  expect(body).toContain('<Gather');
  expect(body).toContain('input="dtmf"');
  expect(body).toContain('numDigits="6"');
  expect(body).toContain('action="https://svc-1234-dev.twil.io/gather-action"');
  expect(body).toContain('<Say>Please enter your order number.</Say>');
  expect(documentRemove).not.toHaveBeenCalled();

  const types = streamMessagesCreate.mock.calls.map((c: any[]) => c[0].data.type);
  expect(types).toContain('oos.prompt');
});

it('returns the auto-create JSON on the second bounce (resolution present)', async () => {
  documentFetch.mockResolvedValue({ data: { realNumber: '+15551230000' } });

  const response = await invoke(makeContext(), {
    From: '+15551112222',
    CallSid: 'CAtestcallsid000000000000000000000',
  });

  expect(response.headers['Content-Type']).toBe('application/json');
  // Body is the raw object (the runtime serializes it once); not pre-stringified.
  const body = response.body as any;
  expect(body.mode).toBe('voice-only');
  expect(body.ttl).toBe(300);
  expect(body.participantIdentifier).toBe('+15551230000');
  expect(body.uniqueName).toMatch(/^\+15551112222 -> \+15551230000 @ /);

  // the consumed resolution is deleted (best-effort)
  expect(documentRemove).toHaveBeenCalledTimes(1);

  const types = streamMessagesCreate.mock.calls.map((c: any[]) => c[0].data.type);
  expect(types).toContain('oos.autocreate');
});

it('falls back to a Gather when there is no CallSid to key on', async () => {
  const response = await invoke(makeContext(), {});

  expect(response.headers['Content-Type']).toBe('application/xml');
  expect(response.body).toContain('<Gather');
  // never attempts a Sync read/delete without a key
  expect(documentFetch).not.toHaveBeenCalled();
  expect(documentRemove).not.toHaveBeenCalled();
});
