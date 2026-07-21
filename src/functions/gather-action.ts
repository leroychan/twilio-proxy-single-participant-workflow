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
};

type GatherEvent = {
  Digits?: string;
  From?: string;
  To?: string;
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
  const { Digits, From, To } = event;

  if (!Digits || !From || !To) {
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

    // 2. Create a Proxy Session, then add the participants in two sequential
    // calls. The ORDER matters and this must NOT be collapsed into a single
    // sessions.create({ participants: [...] }) call:
    //
    //   The caller must keep the exact proxy number they dialed (To) as their
    //   proxyIdentifier so the redirect below matches them back into this
    //   session. If both participants are resolved at once, Proxy can assign
    //   the SAME number to the destination (prefer-sticky + country geo-match
    //   with a small number pool), colliding with the caller and dropping the
    //   caller participant — the call then loops back to /out-of-session.
    //
    //   Adding the caller FIRST reserves To for them, forcing Proxy to pick a
    //   different proxy number for the destination.
    //
    // voice-only: call-only flow, so Proxy matches a voice-capable proxy
    // number and does not require SMS capabilities (avoids error 80202).
    const client = context.getTwilioClient();
    const serviceSid = context.PROXY_SERVICE_SID as string;
    // uniqueName: human-readable "<caller> -> <destination>" (actual numbers).
    // ttl: 300s (5 min) so the session — and the proxy numbers it holds — free
    // themselves 5 minutes after the last interaction.
    const session = await client.proxy.v1.services(serviceSid).sessions.create({
      uniqueName: `${From} -> ${realNumber}`,
      mode: 'voice-only',
      ttl: 300,
    });

    // Participant 1: the caller, pinned to the proxy number they dialed.
    await client.proxy.v1
      .services(serviceSid)
      .sessions(session.sid)
      .participants.create({ identifier: From, proxyIdentifier: To });

    // Participant 2: the real target number (Proxy assigns a free number).
    await client.proxy.v1
      .services(serviceSid)
      .sessions(session.sid)
      .participants.create({ identifier: realNumber });

    // 3. Redirect the live call into Proxy to connect the two parties.
    const redirectUrl =
      `https://webhooks.twilio.com/v1/Accounts/${context.ACCOUNT_SID}` +
      `/Proxy/${serviceSid}/Webhooks/Call`;
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
