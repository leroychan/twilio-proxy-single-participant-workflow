import { describe, it, expect } from 'vitest';
import { parseEvent } from './events';

describe('parseEvent', () => {
  it('accepts a well-formed event', () => {
    const e = { type: 'lookup.result', ts: '2026-07-24T00:00:00Z', digits: '123456' };
    expect(parseEvent(e)).toEqual(e);
  });
  it('rejects an unknown type', () => {
    expect(parseEvent({ type: 'nope', ts: 'x' })).toBeNull();
  });
  it('rejects a missing ts', () => {
    expect(parseEvent({ type: 'oos.prompt' })).toBeNull();
  });
  it('rejects non-objects', () => {
    expect(parseEvent(null)).toBeNull();
    expect(parseEvent('string')).toBeNull();
  });
});
