import path from 'path';
import { handler as callback } from '../src/functions/callback';
import { handler as interceptCallback } from '../src/functions/intercept-callback';

const sessionUpdate = jest.fn();
const sessions = jest.fn(() => ({ update: sessionUpdate }));
const services = jest.fn(() => ({ sessions }));

function makeContext() {
  const client = { proxy: { v1: { services } } };
  return {
    AUTH_TOKEN: 'test_auth_token',
    PROXY_SERVICE_SID: 'KStestproxyservice0000000000000000',
    SERVICE_BASE_URL: 'https://svc-1234-dev.twil.io',
    getTwilioClient: () => client,
  };
}

// A callback event as the runtime delivers it: POST params plus the injected
// `request` (carrying the signature header) and `cookies`.
function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    interactionSessionSid: 'KCtestsession0000000000000000000000',
    outboundResourceStatus: 'completed',
    request: { headers: { 'x-twilio-signature': 'sig' }, cookies: {} },
    cookies: {},
    ...overrides,
  };
}

// Promise wrapper around the callback-style handler.
function invoke(handler: any, context: any, event: any): Promise<any> {
  return new Promise((resolve) => handler(context, event, (_e: any, r: any) => resolve(r)));
}

let validateRequest: jest.Mock;

beforeEach(() => {
  (global as any).Runtime = {
    getAssets: () => ({
      '/helpers.js': {
        path: path.resolve(__dirname, '../src/assets/helpers.private.ts'),
      },
    }),
  };
  // Swap the real signature check for a controllable mock. setup.ts rebuilds
  // the global Twilio object for each test file, so this doesn't leak.
  validateRequest = jest.fn().mockReturnValue(true);
  (global as any).Twilio.validateRequest = validateRequest;
  sessionUpdate.mockResolvedValue({});
});

describe('/callback', () => {
  it('rejects with 403 when the Twilio signature is invalid', async () => {
    validateRequest.mockReturnValue(false);
    const response = await invoke(callback, makeContext(), makeEvent());
    expect(response.statusCode).toBe(403);
    expect(sessions).not.toHaveBeenCalled();
    expect(sessionUpdate).not.toHaveBeenCalled();
  });

  it('validates against the reconstructed URL and stripped params', async () => {
    await invoke(callback, makeContext(), makeEvent());
    expect(validateRequest).toHaveBeenCalledWith(
      'test_auth_token',
      'sig',
      'https://svc-1234-dev.twil.io/callback',
      // request + cookies stripped; only the signed POST params remain
      {
        interactionSessionSid: 'KCtestsession0000000000000000000000',
        outboundResourceStatus: 'completed',
      }
    );
  });

  it('closes the session when the outbound leg reaches a terminal state', async () => {
    const response = await invoke(callback, makeContext(), makeEvent());
    expect(response.statusCode).toBe(200);
    expect(services).toHaveBeenCalledWith('KStestproxyservice0000000000000000');
    expect(sessions).toHaveBeenCalledWith('KCtestsession0000000000000000000000');
    expect(sessionUpdate).toHaveBeenCalledWith({ status: 'closed' });
  });

  it.each(['completed', 'busy', 'no-answer', 'failed', 'canceled'])(
    'closes on terminal outbound status "%s"',
    async (status) => {
      await invoke(callback, makeContext(), makeEvent({ outboundResourceStatus: status }));
      expect(sessionUpdate).toHaveBeenCalledWith({ status: 'closed' });
    }
  );

  it('does NOT close on a non-terminal outbound status', async () => {
    const response = await invoke(
      callback,
      makeContext(),
      makeEvent({ outboundResourceStatus: 'initiated' })
    );
    expect(response.statusCode).toBe(200);
    expect(sessionUpdate).not.toHaveBeenCalled();
  });

  it('does NOT close when there is no outbound leg yet', async () => {
    const event = makeEvent();
    delete (event as any).outboundResourceStatus;
    const response = await invoke(callback, makeContext(), event);
    expect(response.statusCode).toBe(200);
    expect(sessionUpdate).not.toHaveBeenCalled();
  });

  it('still returns 200 when closing the session throws (ttl backstop)', async () => {
    sessionUpdate.mockRejectedValue(new Error('session already closed'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const response = await invoke(callback, makeContext(), makeEvent());
    expect(response.statusCode).toBe(200);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('/intercept-callback', () => {
  it('returns 200 and does not throw', async () => {
    const response = await invoke(interceptCallback, {}, { interactionSid: 'KI123' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(response.body)).toEqual({});
  });
});
