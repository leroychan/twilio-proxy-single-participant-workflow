import { describe, it, expect } from 'vitest';
import { maskNumber } from './mask';

describe('maskNumber', () => {
  it('masks the middle, keeping a prefix and last two digits', () => {
    expect(maskNumber('+15551112222')).toBe('+1555•••••22');
  });
  it('returns a dash for empty input', () => {
    expect(maskNumber(undefined)).toBe('—');
    expect(maskNumber('')).toBe('—');
  });
  it('leaves very short values mostly masked', () => {
    expect(maskNumber('+1234')).toBe('+1234');
  });
});
