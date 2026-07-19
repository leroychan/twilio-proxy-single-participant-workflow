import { handler as callback } from '../src/functions/callback';
import { handler as interceptCallback } from '../src/functions/intercept-callback';

it('callback returns 200 and does not throw', (done) => {
  callback(
    {} as any,
    { interactionSid: 'KI123', outboundResourceStatus: 'delivered' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(response.body)).toEqual({});
      done();
    }
  );
});

it('intercept-callback returns 200 and does not throw', (done) => {
  interceptCallback(
    {} as any,
    { interactionSid: 'KI123' } as any,
    (err: any, response: any) => {
      expect(err).toBeFalsy();
      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(response.body)).toEqual({});
      done();
    }
  );
});
