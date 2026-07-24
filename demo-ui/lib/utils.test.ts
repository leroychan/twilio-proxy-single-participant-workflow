import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges class names and dedupes tailwind conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-on-primary', false && 'hidden', 'font-bold')).toContain(
      'font-bold'
    );
  });
});
