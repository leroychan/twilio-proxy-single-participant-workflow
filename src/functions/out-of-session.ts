import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
} from '@twilio-labs/serverless-runtime-types/types';
import type * as Helpers from '../assets/helpers.private';

type OutOfSessionContext = {
  SERVICE_BASE_URL?: string;
};

export const handler: ServerlessFunctionSignature = function (
  context: Context<OutOfSessionContext>,
  event: {},
  callback: ServerlessCallback
) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helpers = require(Runtime.getAssets()['/helpers.js']
    .path) as typeof Helpers;
  const baseUrl = helpers.getBaseUrl(context);

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
  return callback(null, response);
};
