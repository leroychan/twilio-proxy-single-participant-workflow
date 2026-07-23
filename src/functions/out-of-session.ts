import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from '@twilio-labs/serverless-runtime-types/types';
import type * as Helpers from '../assets/helpers.private';

type OutOfSessionContext = {
  SERVICE_BASE_URL?: string;
  SYNC_SERVICE_SID?: string;
  getTwilioClient: () => any;
};

type OutOfSessionEvent = {
  From?: string;
  CallSid?: string;
};

function jsonResponse(body: unknown): any {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  // Pass the object itself — the runtime serializes it once because the
  // Content-Type is JSON. Calling JSON.stringify here would double-encode it
  // into a quoted string ("{\"uniqueName\":...}"), which Proxy can't parse.
  response.setBody(body as any);
  return response;
}

function gatherResponse(baseUrl: string): any {
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
  return response;
}

export const handler: ServerlessFunctionSignature = async function (
  context: Context<OutOfSessionContext>,
  event: ServerlessEventObject<OutOfSessionEvent>,
  callback: ServerlessCallback
) {
  try {
    console.log('Out-of-Session Callback received:', JSON.stringify(event));
  } catch {
    // never let logging break the webhook
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require(Runtime.getAssets()['/helpers.js']
    .path) as typeof Helpers;

  const { From, CallSid } = event;
  const syncServiceSid = context.SYNC_SERVICE_SID || 'default';

  // If `/gather-action` has already resolved a destination for this call, this
  // is the *second* out-of-session bounce (the redirect back into Proxy). Reply
  // with Proxy's auto-create-session JSON: Proxy stands up the session, binds
  // the caller to the exact (reserved) number they dialed, dials the
  // destination, and bridges the live call — no manual participant wiring, so
  // the caller can never land on the wrong proxy number.
  if (CallSid) {
    const client = context.getTwilioClient();
    const realNumber = await helpers.getResolution(
      client,
      syncServiceSid,
      CallSid
    );
    if (realNumber) {
      const body = {
        uniqueName: `${From} -> ${realNumber} @ ${new Date().toISOString()}`,
        ttl: 300,
        mode: 'voice-only',
        participantIdentifier: realNumber,
      };
      // Consumed — best-effort cleanup (the Sync TTL is the real backstop).
      await helpers.deleteResolution(client, syncServiceSid, CallSid);
      console.log(
        `Auto-creating session for CallSid ${CallSid}:`,
        JSON.stringify(body)
      );
      return callback(null, jsonResponse(body));
    }
  }

  // First bounce (no resolution yet): prompt the caller for their code.
  const baseUrl = helpers.getBaseUrl(context);
  return callback(null, gatherResponse(baseUrl));
};
