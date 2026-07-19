import '@twilio-labs/serverless-runtime-types';
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
} from '@twilio-labs/serverless-runtime-types/types';

export const handler: ServerlessFunctionSignature = function (
  _context: Context,
  event: {},
  callback: ServerlessCallback
) {
  try {
    console.log('Proxy Callback received:', JSON.stringify(event));
  } catch {
    // never let logging break the webhook
  }
  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.appendHeader('Content-Type', 'application/json');
  response.setBody(JSON.stringify({}));
  return callback(null, response);
};
