import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from '@twilio-labs/serverless-runtime-types/types';
import type * as Helpers from '../assets/helpers.private';

type LookupContext = {
  LOOKUP_MAP?: string;
  DEFAULT_REAL_NUMBER?: string;
};

type LookupEvent = {
  Digits?: string;
  From?: string;
};

export const handler: ServerlessFunctionSignature = function (
  context: Context<LookupContext>,
  event: ServerlessEventObject<LookupEvent>,
  callback: ServerlessCallback
) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require(Runtime.getAssets()['/helpers.js']
    .path) as typeof Helpers;

  const realNumber = helpers.resolveRealNumber(
    context.LOOKUP_MAP,
    context.DEFAULT_REAL_NUMBER,
    event.Digits
  );

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.setBody(JSON.stringify({ realNumber }));
  return callback(null, response);
};
