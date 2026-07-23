import {
  getBaseUrl,
  resolveCounterparty,
} from '../src/assets/helpers.private';

describe('getBaseUrl', () => {
  it('uses SERVICE_BASE_URL when set, stripping a trailing slash', () => {
    expect(getBaseUrl({ SERVICE_BASE_URL: 'https://example.twil.io/' })).toBe(
      'https://example.twil.io'
    );
  });

  it('derives https from a deployed DOMAIN_NAME', () => {
    expect(getBaseUrl({ DOMAIN_NAME: 'svc-1234-dev.twil.io' })).toBe(
      'https://svc-1234-dev.twil.io'
    );
  });

  it('derives http from a localhost DOMAIN_NAME', () => {
    expect(getBaseUrl({ DOMAIN_NAME: 'localhost:3000' })).toBe(
      'http://localhost:3000'
    );
  });
});

describe('resolveCounterparty', () => {
  // Sync Map item data: bidirectional pair.
  const pair = { parties: ['+15551110000', '+15552220000'] };
  // Legacy one-directional item data.
  const legacy = { number: '+15559990000' };

  it('returns party B when party A is the caller', () => {
    expect(resolveCounterparty(pair, '+15551110000', '+15550000000')).toBe(
      '+15552220000'
    );
  });

  it('returns party A when party B is the caller (other direction)', () => {
    expect(resolveCounterparty(pair, '+15552220000', '+15550000000')).toBe(
      '+15551110000'
    );
  });

  it('falls back to the default when the caller is in neither party of the pair', () => {
    expect(resolveCounterparty(pair, '+15559998888', '+15550000000')).toBe(
      '+15550000000'
    );
  });

  it('supports the legacy { number } item shape', () => {
    expect(resolveCounterparty(legacy, '+15551112222', '+15550000000')).toBe(
      '+15559990000'
    );
  });

  it('accepts a bare array entry (defensive)', () => {
    expect(
      resolveCounterparty(
        ['+15551110000', '+15552220000'],
        '+15551110000',
        '+15550000000'
      )
    ).toBe('+15552220000');
  });

  it('falls back to the default when the entry is null (code not found)', () => {
    expect(resolveCounterparty(null, '+15551110000', '+15550000000')).toBe(
      '+15550000000'
    );
  });

  it('returns empty string when nothing resolves', () => {
    expect(resolveCounterparty(null, '+15551110000', undefined)).toBe('');
  });
});
