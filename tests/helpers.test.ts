import { getBaseUrl, resolveRealNumber } from '../src/assets/helpers.private';

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

describe('resolveRealNumber', () => {
  // Bidirectional pair format: one code links two parties.
  const pairMap = '{"123456":["+15551110000","+15552220000"]}';
  // Legacy one-directional format: code -> number.
  const legacyMap = '{"654321":"+15559990000"}';

  it('returns party B when party A is the caller', () => {
    expect(resolveRealNumber(pairMap, '+15550000000', '123456', '+15551110000')).toBe(
      '+15552220000'
    );
  });

  it('returns party A when party B is the caller (other direction)', () => {
    expect(resolveRealNumber(pairMap, '+15550000000', '123456', '+15552220000')).toBe(
      '+15551110000'
    );
  });

  it('falls back to the default when the caller is in neither party of the pair', () => {
    expect(resolveRealNumber(pairMap, '+15550000000', '123456', '+15559998888')).toBe(
      '+15550000000'
    );
  });

  it('still supports the legacy one-directional format', () => {
    expect(resolveRealNumber(legacyMap, '+15550000000', '654321', '+15551112222')).toBe(
      '+15559990000'
    );
  });

  it('falls back to the default number when digits are not in the map', () => {
    expect(resolveRealNumber(pairMap, '+15550000000', '000000', '+15551110000')).toBe(
      '+15550000000'
    );
  });

  it('falls back to the default number when the map JSON is malformed', () => {
    expect(resolveRealNumber('{not json', '+15550000000', '123456', '+15551110000')).toBe(
      '+15550000000'
    );
  });

  it('returns empty string when nothing resolves', () => {
    expect(resolveRealNumber(undefined, undefined, '123456', '+15551110000')).toBe('');
  });
});
