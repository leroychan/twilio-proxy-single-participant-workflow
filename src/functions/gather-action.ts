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

    // 2. Create a Proxy Session with both participants in a single API call.
    const client = context.getTwilioClient();
    const serviceSid = context.PROXY_SERVICE_SID as string;
    // voice-only: this is a call-only flow, so Proxy should match a
    // voice-capable proxy number and not require SMS capabilities. Without
    // this, Proxy defaults to voice-and-message and fails with error 80202
    // when no proxy number has both voice and SMS.
    //
    // The nested `participants` array is serialized verbatim into the
    // `Participants` API parameter, so each entry must use the API's
    // PascalCase field names (Identifier / ProxyIdentifier) rather than the
    // camelCase used by the standalone participants.create() endpoint.
    //   Participant 1: the caller, keyed to the proxy number they dialed.
    //   Participant 2: the real target number.
    await client.proxy.v1.services(serviceSid).sessions.create({
      mode: 'voice-only',
      participants: [
        { Identifier: From, ProxyIdentifier: To },
        { Identifier: realNumber },
      ],
    });

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
