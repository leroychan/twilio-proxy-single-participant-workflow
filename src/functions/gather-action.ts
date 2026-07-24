import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from '@twilio-labs/serverless-runtime-types/types';
import type * as Helpers from '../assets/helpers.private';

type GatherContext = {
  ACCOUNT_SID?: string;
  PROXY_SERVICE_SID?: string;
  SERVICE_BASE_URL?: string;
  SYNC_SERVICE_SID?: string;
};

type GatherEvent = {
  Digits?: string;
  From?: string;
  To?: string;
  CallSid?: string;
};

function errorTwiml(message: string): string {
  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.say(message);
  twiml.hangup();
  return twiml.toString();
}

function xmlResponse(body: string): any {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/xml');
  response.setBody(body);
  return response;
}

export const handler: ServerlessFunctionSignature = async function (
  context: Context<GatherContext>,
  event: ServerlessEventObject<GatherEvent>,
  callback: ServerlessCallback
) {
  try {
    console.log('Gather-Action received:', JSON.stringify(event));
  } catch {
    // never let logging break the handler
  }

  const { Digits, From, CallSid } = event;

  if (!Digits || !From || !CallSid) {
    return callback(
      null,
      xmlResponse(errorTwiml('Sorry, we did not receive your input. Goodbye.'))
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const helpers = require(Runtime.getAssets()['/helpers.js']
      .path) as typeof Helpers;
    const baseUrl = helpers.getBaseUrl(context);

    // 1. Look up the real target number via the mock REST API.
    const lookupUrl =
      `${baseUrl}/lookup?Digits=${encodeURIComponent(Digits)}` +
      `&From=${encodeURIComponent(From)}`;
    const lookupResponse = await fetch(lookupUrl);
    if (!lookupResponse.ok) {
      throw new Error(`Lookup failed with status ${lookupResponse.status}`);
    }
    const { realNumber } = (await lookupResponse.json()) as {
      realNumber: string;
    };
    if (!realNumber) {
      throw new Error('Lookup returned no number');
    }
    console.log(
      `Resolved realNumber: ${realNumber} (Digits=${Digits}, From=${From})`
    );

    // 2. Stash the resolution so the *next* /out-of-session bounce can build
    //    the auto-create JSON. The out-of-session callback never carries the
    //    entered digits, so we persist the resolved number in Twilio Sync
    //    keyed by CallSid (stable across the redirect). We do NOT create the
    //    session or participants here — Proxy does that when it receives the
    //    auto-create response, and it binds the caller to the reserved number
    //    they actually dialed (which is why the caller can't land on the wrong
    //    proxy number and loop).
    const client = context.getTwilioClient();
    const syncServiceSid = context.SYNC_SERVICE_SID || 'default';
    await helpers.saveResolution(client, syncServiceSid, CallSid, realNumber);
    await helpers.publishEvent(client, syncServiceSid, {
      type: 'resolution.stored',
      ts: new Date().toISOString(),
      callSid: CallSid,
      from: From,
      realNumber,
    });
    console.log(
      `Stored resolution in Sync: CallSid=${CallSid} -> ${realNumber}.`
    );

    // 3. Redirect the live call back into Proxy. With no matching session yet,
    //    Proxy fires /out-of-session again — and that bounce returns the
    //    auto-create JSON, standing up the session and bridging the call.
    const redirectUrl =
      `https://webhooks.twilio.com/v1/Accounts/${context.ACCOUNT_SID}` +
      `/Proxy/${context.PROXY_SERVICE_SID}/Webhooks/Call`;
    const twiml = new Twilio.twiml.VoiceResponse();
    twiml.redirect({ method: 'POST' }, redirectUrl);
    return callback(null, xmlResponse(twiml.toString()));
  } catch (err) {
    console.error('gather-action error:', err);
    return callback(
      null,
      xmlResponse(
        errorTwiml('Sorry, we could not connect your call. Please try again later.')
      )
    );
  }
};
