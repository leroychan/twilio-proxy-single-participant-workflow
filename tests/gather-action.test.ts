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

      // session created voice-only (so Proxy doesn't require SMS-capable
      // numbers), named "<caller> -> <destination> @ <timestamp>" (the
      // timestamp keeps the uniqueName unique), with a 5-minute TTL.
      expect(sessionsCreate).toHaveBeenCalledWith({
        uniqueName: expect.stringMatching(
          /^\+15551112222 -> \+15551230000 @ /
        ),
        mode: 'voice-only',
        ttl: 300,
      });

      // participants added sequentially, CALLER FIRST so the caller reserves
      // the dialed proxy number (To) and the destination is forced onto a
      // different one. Order matters — see gather-action.ts.
      expect(participantsCreate).toHaveBeenNthCalledWith(1, {
        identifier: '+15551112222',
        proxyIdentifier: '+15553334444',
      });
      expect(participantsCreate).toHaveBeenNthCalledWith(2, {
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
  // The handler logs the caught error via console.error; silence it so the
  // expected failure does not print as noise in the test output.
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  handler(
    context as any,
    { Digits: '123456', From: '+15551112222', To: '+15553334444' } as any,
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
