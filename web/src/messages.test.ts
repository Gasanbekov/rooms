import { describe, expect, it } from 'vitest';
import { mergeMessages } from './messages';
import type { Message } from './types';

const message = (id: string): Message => ({
  id,
  body: `message ${id}`,
  createdAt: '2026-10-10T10:00:00.000Z',
  user: { id: '1', displayName: 'Anna' },
});

describe('mergeMessages', () => {
  it('removes duplicates and sorts oldest first', () => {
    const merged = mergeMessages([message('2'), message('3')], [message('1'), message('3')]);

    expect(merged.map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('compares ids as numbers, not as strings', () => {
    const merged = mergeMessages([message('10')], [message('9')]);

    expect(merged.map((item) => item.id)).toEqual(['9', '10']);
  });
});
