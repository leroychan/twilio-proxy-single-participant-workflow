import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from '@twilio-labs/serverless-runtime-types/types';
import type * as Helpers from '../assets/helpers.private';

type CallbackContext = {
  AUTH_TOKEN?: string;
  PROXY_SERVICE_SID?: string;
  SERVICE_BASE_URL?: string;
  DOMAIN_NAME?: string;
};

type CallbackEvent = {
  interactionSessionSid?: string;
  outboundResourceStatus?: string;
  request?: { headers?: Record<string, string> };
};

// Terminal states for the outbound (destination) leg. Once the destination
// leg reaches any of these, the connection attempt is over — whether the
// destination answered or not — so the session, and the scarce proxy number
// it holds, can be released immediately instead of waiting out the TTL.
const TERMINAL_OUTBOUND_STATUSES = new Set([
  'completed',
  'busy',
  'no-answer',
  'failed',
  'canceled',
]);

function jsonResponse(statusCode: number): any {
  const response = new Twilio.Response();
  response.setStatusCode(statusCode);
  response.appendHeader('Content-Type', 'application/json');
  response.setBody(JSON.stringify({}));
  return response;
}

export const handler: ServerlessFunctionSignature = async function (
  context: Context<CallbackContext>,
  event: ServerlessEventObject<CallbackEvent>,
  callback: ServerlessCallback
) {
  // This endpoint now takes a destructive action (closing a live session), so
  // its public URL must be authenticated. Reject anything without a valid
  // Twilio signature BEFORE logging or acting on the payload — otherwise a
  // forged POST with a guessed session SID could tear down an active call.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require(Runtime.getAssets()['/helpers.js']
    .path) as typeof Helpers;
  const url = `${helpers.getBaseUrl(context)}/callback`;
  const signature =
    (event.request &&
      event.request.headers &&
      event.request.headers['x-twilio-signature']) ||
    '';
  // The runtime injects `request` and `cookies` into the event; strip them so
  // only the POST params Twilio actually signed remain.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { request, cookies, ...params } = event as any;

  const isValid =
    !!context.AUTH_TOKEN &&
    Twilio.validateRequest(context.AUTH_TOKEN, signature, url, params);
  if (!isValid) {
    console.warn('Rejected Proxy callback: missing/invalid Twilio signature.');
    return callback(null, jsonResponse(403));
  }

  try {
    console.log('Proxy Callback received:', JSON.stringify(event));

    const status = event.outboundResourceStatus;
    const sessionSid = event.interactionSessionSid;
    if (sessionSid && status && TERMINAL_OUTBOUND_STATUSES.has(status)) {
      const client = context.getTwilioClient();
      const serviceSid = context.PROXY_SERVICE_SID as string;
      await client.proxy.v1
        .services(serviceSid)
        .sessions(sessionSid)
        .update({ status: 'closed' });
      console.log(
        `Closed Proxy session ${sessionSid} after outbound leg reached "${status}".`
      );
    }
  } catch (err) {
    // Never let cleanup break the webhook — always ack 200 so Proxy doesn't
    // retry. The session's ttl is the backstop if this close didn't happen
    // (e.g. the session was already closed by an earlier terminal event).
    console.error('callback handler error:', err);
  }
  return callback(null, jsonResponse(200));
};
