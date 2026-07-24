import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(() => {
  process.env.TWILIO_ACCOUNT_SID = 'ACtest00000000000000000000000000000';
  process.env.TWILIO_API_KEY = 'SKtest00000000000000000000000000000';
  process.env.TWILIO_API_SECRET = 'secrettest';
  process.env.TWILIO_SYNC_SERVICE_SID = 'IStest00000000000000000000000000000';
});

describe('GET /api/token', () => {
  it('returns a non-empty JWT and an identity', async () => {
    const { GET } = await import('./route');
    const res = await GET();
    const body = await res.json();
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(20);
    expect(body.identity).toBeTruthy();
  });
});
