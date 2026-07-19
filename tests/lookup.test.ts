import path from 'path';
import { handler } from '../src/functions/lookup';

function mockRuntime() {
  (global as any).Runtime = {
    getAssets: () => ({
      '/helpers.js': {
        path: path.resolve(__dirname, '../src/assets/helpers.private.ts'),
      },
    }),
  };
}

const baseContext = {
  LOOKUP_MAP: '{"123456":"+15551230000"}',
  DEFAULT_REAL_NUMBER: '+15559999999',
};

beforeEach(() => mockRuntime());

it('returns the mapped number as JSON for matching digits', (done) => {
  handler(
    baseContext as any,
    { Digits: '123456', From: '+15551112222' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(response.body)).toEqual({ realNumber: '+15551230000' });
      done();
    }
  );
});

it('returns the default number when digits do not match', (done) => {
  handler(
    baseContext as any,
    { Digits: '000000', From: '+15551112222' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(JSON.parse(response.body)).toEqual({ realNumber: '+15559999999' });
      done();
    }
  );
});
