import { describe, expect, it } from 'vitest';

import { calculateNextPriceCheckAt, calculatePriceCheckBackoffUntil } from '../goal-price-schedule';

const now = new Date('2026-01-01T00:00:00.000Z');

describe('goal price schedule', () => {
  it('checks near goals daily', () => {
    const next = calculateNextPriceCheckAt(new Date('2026-03-01T00:00:00.000Z'), now);
    expect(next.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });

  it('checks medium range goals every three days', () => {
    const next = calculateNextPriceCheckAt(new Date('2026-08-01T00:00:00.000Z'), now);
    expect(next.toISOString()).toBe('2026-01-04T00:00:00.000Z');
  });

  it('checks far goals weekly', () => {
    const next = calculateNextPriceCheckAt(new Date('2027-04-01T00:00:00.000Z'), now);
    expect(next.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('backs off repeated failures', () => {
    expect(calculatePriceCheckBackoffUntil(1, now).toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(calculatePriceCheckBackoffUntil(2, now).toISOString()).toBe('2026-01-04T00:00:00.000Z');
    expect(calculatePriceCheckBackoffUntil(3, now).toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });
});
