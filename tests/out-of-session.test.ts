import path from 'path';
import { handler } from '../src/functions/out-of-session';

beforeEach(() => {
  (global as any).Runtime = {
    getAssets: () => ({
      '/helpers.js': {
        path: path.resolve(__dirname, '../src/assets/helpers.private.ts'),
      },
    }),
  };
});

it('returns a Gather for 6 DTMF digits with an application/xml content type', (done) => {
  handler(
    { DOMAIN_NAME: 'svc-1234-dev.twil.io' } as any,
    {} as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.headers['Content-Type']).toBe('application/xml');
      const body = response.body as string;
      expect(body).toContain('<Gather');
      expect(body).toContain('input="dtmf"');
      expect(body).toContain('numDigits="6"');
      expect(body).toContain('method="POST"');
      expect(body).toContain(
        'action="https://svc-1234-dev.twil.io/gather-action"'
      );
      expect(body).toContain('<Say>Please enter your order number.</Say>');
      done();
    }
  );
});
