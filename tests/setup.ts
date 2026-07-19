// Reproduce the runtime's global `Twilio` object the same way the Twilio
// dev runtime builds it (see @twilio/runtime-handler dist/dev-runtime/route.js):
//   global['Twilio'] = { ...twilio, Response };
// The internal `Response` module is not exposed via the package `exports` map,
// so we resolve it as a sibling of the allowed `./dev` entry point instead of
// deep-importing a blocked subpath.
import * as path from 'path';
import * as twilio from 'twilio';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const devEntry = require.resolve('@twilio/runtime-handler/dev');
const responsePath = path.join(path.dirname(devEntry), 'internal', 'response.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Response } = require(responsePath);

(global as any).Twilio = { ...twilio, Response };
