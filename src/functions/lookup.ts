import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from '@twilio-labs/serverless-runtime-types/types';
import type * as Helpers from '../assets/helpers.private';

type LookupContext = {
  SYNC_SERVICE_SID?: string;
  DEFAULT_REAL_NUMBER?: string;
  getTwilioClient: () => any;
};

type LookupEvent = {
  Digits?: string;
  From?: string;
};

export const handler: ServerlessFunctionSignature = async function (
  context: Context<LookupContext>,
  event: ServerlessEventObject<LookupEvent>,
  callback: ServerlessCallback
) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require(Runtime.getAssets()['/helpers.js']
    .path) as typeof Helpers;

  const syncServiceSid = context.SYNC_SERVICE_SID || 'default';
  const client = context.getTwilioClient();

  // The order → parties mapping lives in the Sync `lookup` Map (seeded by
  // `npm run seed:lookup`), so it's managed data rather than config.
  const entry = await helpers.getLookupEntry(
    client,
    syncServiceSid,
    helpers.LOOKUP_SYNC_MAP_NAME,
    event.Digits
  );
  const realNumber = helpers.resolveCounterparty(
    entry,
    event.From,
    context.DEFAULT_REAL_NUMBER
  );

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  // Pass the object directly: the runtime JSON-serializes the body once for an
  // application/json response. Pre-stringifying here would double-encode it.
  response.setBody({ realNumber });
  return callback(null, response);
};
