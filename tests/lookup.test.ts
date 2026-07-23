import path from 'path';
import { handler } from '../src/functions/lookup';

const itemFetch = jest.fn();

function makeContext() {
  // client.sync.v1.services(sid).syncMaps(name).syncMapItems(key).fetch()
  const itemInstance = { fetch: itemFetch };
  const syncMapInstance = { syncMapItems: jest.fn(() => itemInstance) };
  const syncMaps = jest.fn(() => syncMapInstance);
  const client = {
    sync: { v1: { services: jest.fn(() => ({ syncMaps })) } },
  };

  return {
    SYNC_SERVICE_SID: 'IStestsyncservice00000000000000000',
    DEFAULT_REAL_NUMBER: '+15559999999',
    getTwilioClient: () => client,
  };
}

// Invoke the (async) callback-style handler as a promise.
function invoke(context: any, event: any): Promise<any> {
  return new Promise((resolve, reject) => {
    handler(context, event, (err: any, response: any) =>
      err ? reject(err) : resolve(response)
    );
  });
}

beforeEach(() => {
  (global as any).Runtime = {
    getAssets: () => ({
      '/helpers.js': {
        path: path.resolve(__dirname, '../src/assets/helpers.private.ts'),
      },
    }),
  };
});

it('returns the other party (B) as JSON when party A calls', async () => {
  itemFetch.mockResolvedValue({
    data: { parties: ['+15551112222', '+15551230000'] },
  });

  const response = await invoke(makeContext(), {
    Digits: '123456',
    From: '+15551112222',
  });

  expect(response.headers['Content-Type']).toBe('application/json');
  expect(response.body).toEqual({ realNumber: '+15551230000' });
});

it('returns the other party (A) when party B calls (opposite direction)', async () => {
  itemFetch.mockResolvedValue({
    data: { parties: ['+15551112222', '+15551230000'] },
  });

  const response = await invoke(makeContext(), {
    Digits: '123456',
    From: '+15551230000',
  });

  expect(response.body).toEqual({ realNumber: '+15551112222' });
});

it('returns the default number when the code is not in the Map', async () => {
  // Missing Sync Map item → fetch rejects (404) → getLookupEntry returns null.
  itemFetch.mockRejectedValue(new Error('not found'));

  const response = await invoke(makeContext(), {
    Digits: '000000',
    From: '+15551112222',
  });

  expect(response.body).toEqual({ realNumber: '+15559999999' });
});
