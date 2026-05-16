import { describe, expect, it } from 'vitest';

import { recommendFunds, type RiskProfile } from '../fund-recommendation';

const RISK_ORDER: Record<RiskProfile, number> = {
  VERY_LOW: 1,
  LOW: 2,
  BALANCED: 3,
  HIGH: 4,
  VERY_HIGH: 5,
};

describe('recommendFunds risk profile analysis', () => {
  it('returns 6 sorted recommendations for every risk profile', () => {
    const profiles: RiskProfile[] = ['VERY_LOW', 'LOW', 'BALANCED', 'HIGH', 'VERY_HIGH'];
    for (const riskProfile of profiles) {
      const recommendations = recommendFunds({ riskProfile, targetYears: 7 });
      expect(recommendations).toHaveLength(6);
      expect(recommendations[0]!.score).toBeGreaterThanOrEqual(recommendations[1]!.score);
      expect(recommendations[1]!.score).toBeGreaterThanOrEqual(recommendations[2]!.score);
    }
  });

  it('moves top recommendation risk upward when user risk increases', () => {
    const lowTop = recommendFunds({ riskProfile: 'VERY_LOW', targetYears: 7 })[0]!;
    const highTop = recommendFunds({ riskProfile: 'VERY_HIGH', targetYears: 7 })[0]!;
    expect(RISK_ORDER[highTop.riskBand]).toBeGreaterThanOrEqual(RISK_ORDER[lowTop.riskBand]);
  });

  it('prefers longer horizon funds when duration increases at same risk', () => {
    const shortTop = recommendFunds({ riskProfile: 'HIGH', targetYears: 2 })[0]!;
    const longTop = recommendFunds({ riskProfile: 'HIGH', targetYears: 15 })[0]!;
    expect(longTop.horizonBand).toBe('LONG');
    expect(longTop.score).toBeGreaterThanOrEqual(shortTop.score - 5);
  });

  it('handles extreme combinations deterministically', () => {
    const a = recommendFunds({ riskProfile: 'VERY_HIGH', targetYears: 1 });
    const b = recommendFunds({ riskProfile: 'VERY_HIGH', targetYears: 1 });
    expect(a.map((item) => item.id)).toEqual(b.map((item) => item.id));
  });
});
