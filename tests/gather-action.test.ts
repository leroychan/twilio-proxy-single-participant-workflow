import path from 'path';
import { handler } from '../src/functions/gather-action';

const documentsCreate = jest.fn();

// add alongside the existing documents mock:
const streamMessagesCreate = jest.fn().mockResolvedValue({});
const syncStreams: any = jest.fn(() => ({
  streamMessages: { create: streamMessagesCreate },
}));
syncStreams.create = jest.fn().mockResolvedValue({});

function makeContext() {
  // client.sync.v1.services(sid).documents.create(...)
  const documents: any = jest.fn();
  documents.create = documentsCreate;
  const syncService = { documents, syncStreams };
  const client = { sync: { v1: { services: jest.fn(() => syncService) } } };

  return {
    ACCOUNT_SID: 'ACtestaccountsid00000000000000000',
    PROXY_SERVICE_SID: 'KStestproxyservice0000000000000000',
    SYNC_SERVICE_SID: 'IStestsyncservice00000000000000000',
    SERVICE_BASE_URL: 'https://svc-1234-dev.twil.io',
    getTwilioClient: () => client,
  };
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
  documentsCreate.mockResolvedValue({ sid: 'ETtestdocument00000000000000000000' });
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ realNumber: '+15551230000' }),
  });
});

it('looks up the number, stashes it in Sync keyed by CallSid, and redirects', (done) => {
  const context = makeContext();
  handler(
    context as any,
    {
      Digits: '123456',
      From: '+15551112222',
      To: '+15553334444',
      CallSid: 'CAtestcallsid000000000000000000000',
    } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();

      // called /lookup with the digits + From
      const fetchUrl = (global as any).fetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('https://svc-1234-dev.twil.io/lookup');

      // resolution stored in Sync as a Document keyed by the (prefixed) CallSid
      // — Sync rejects a raw SID-shaped uniqueName, so it is prefixed. No
      // session or participants are created here — Proxy auto-creates the
      // session when the redirect triggers the 2nd out-of-session bounce.
      expect(documentsCreate).toHaveBeenCalledWith({
        uniqueName: 'res-CAtestcallsid000000000000000000000',
        data: { realNumber: '+15551230000' },
        ttl: 900,
      });

      // redirect TwiML with dynamic ACCOUNT_SID + PROXY_SERVICE_SID
      expect(response.headers['Content-Type']).toBe('application/xml');
      expect(response.body).toContain(
        'https://webhooks.twilio.com/v1/Accounts/ACtestaccountsid00000000000000000/Proxy/KStestproxyservice0000000000000000/Webhooks/Call'
      );
      expect(response.body).toContain('<Redirect');

      const types = streamMessagesCreate.mock.calls.map((c: any[]) => c[0].data.type);
      expect(types).toContain('resolution.stored');
      done();
    }
  );
});

it('says an error and hangs up when required fields are missing', (done) => {
  const context = makeContext();
  handler(
    context as any,
    // no CallSid
    { Digits: '123456', From: '+15551112222', To: '+15553334444' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.headers['Content-Type']).toBe('application/xml');
      expect(response.body).toContain('<Say>');
      expect(response.body).toContain('<Hangup');
      expect(documentsCreate).not.toHaveBeenCalled();
      done();
    }
  );
});

it('says an error and hangs up when the Sync write fails', (done) => {
  const context = makeContext();
  documentsCreate.mockRejectedValue(new Error('boom'));
  // The handler logs the caught error via console.error; silence it so the
  // expected failure does not print as noise in the test output.
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  handler(
    context as any,
    {
      Digits: '123456',
      From: '+15551112222',
      To: '+15553334444',
      CallSid: 'CAtestcallsid000000000000000000000',
    } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.headers['Content-Type']).toBe('application/xml');
      expect(response.body).toContain('<Hangup');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
      done();
    }
  );
});
