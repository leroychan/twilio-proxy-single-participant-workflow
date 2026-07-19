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
    console.log('Proxy Intercept Callback received:', JSON.stringify(event));
  } catch {
    // never let logging break the webhook
  }
  // Empty 200 tells Proxy to allow the interaction to proceed normally.
  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.appendHeader('Content-Type', 'application/json');
  response.setBody(JSON.stringify({}));
  return callback(null, response);
};
