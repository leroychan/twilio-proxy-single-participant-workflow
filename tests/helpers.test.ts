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
  const map = '{"123456":"+15551230000","654321":"+15559990000"}';

  it('returns the mapped number for matching digits', () => {
    expect(resolveRealNumber(map, '+15550000000', '123456')).toBe('+15551230000');
  });

  it('falls back to the default number when digits are not in the map', () => {
    expect(resolveRealNumber(map, '+15550000000', '000000')).toBe('+15550000000');
  });

  it('falls back to the default number when the map JSON is malformed', () => {
    expect(resolveRealNumber('{not json', '+15550000000', '123456')).toBe(
      '+15550000000'
    );
  });

  it('returns empty string when nothing resolves', () => {
    expect(resolveRealNumber(undefined, undefined, '123456')).toBe('');
  });
});
