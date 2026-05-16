import { describe, expect, it } from 'vitest';

import { buildContributionTimeline } from '../goal-progress';

const now = new Date(2026, 5, 15); // 2026-06-15

describe('buildContributionTimeline', () => {
  it('boş contributions: tüm noktalar 0 ama N nokta üretir', () => {
    const r = buildContributionTimeline({ contributions: [], monthsBack: 6, now });
    expect(r.length).toBe(6);
    expect(r.every((p) => p.periodAmount === 0 && p.cumulativeAmount === 0)).toBe(true);
  });

  it('son 6 ayın "ay başı" tarihlerini eskiden yeniye sıralar', () => {
    const r = buildContributionTimeline({ contributions: [], monthsBack: 6, now });
    expect(r[0]?.periodStart).toBe('2026-01-01');
    expect(r[5]?.periodStart).toBe('2026-06-01');
  });

  it('window içindeki tek katkı doğru aya düşer', () => {
    const r = buildContributionTimeline({
      contributions: [{ amount: 500, createdAt: new Date(2026, 3, 10) }], // Nisan
      monthsBack: 6,
      now,
    });
    const apr = r.find((p) => p.periodStart === '2026-04-01');
    expect(apr?.periodAmount).toBe(500);
    expect(apr?.cumulativeAmount).toBe(500);
    const may = r.find((p) => p.periodStart === '2026-05-01');
    expect(may?.cumulativeAmount).toBe(500); // kümül devam eder
  });

  it('window ÖNCESİ katkı priorSum olarak ilk noktanın altında durur', () => {
    const r = buildContributionTimeline({
      contributions: [
        { amount: 1000, createdAt: new Date(2025, 8, 1) }, // window dışı (8 ay önce)
        { amount: 250, createdAt: new Date(2026, 2, 1) }, // Mart, window içi
      ],
      monthsBack: 6,
      now,
    });
    // Tüm noktalar priorSum (1000)'le başlar; Mart'tan sonra +250
    expect(r[0]?.cumulativeAmount).toBe(1000); // Ocak
    expect(r[1]?.cumulativeAmount).toBe(1000); // Şubat
    const mar = r.find((p) => p.periodStart === '2026-03-01');
    expect(mar?.cumulativeAmount).toBe(1250);
    expect(r[5]?.cumulativeAmount).toBe(1250); // Haziran (kümül devam)
  });

  it('birden fazla katkı aynı aya düşerse periodAmount toplanır', () => {
    const r = buildContributionTimeline({
      contributions: [
        { amount: 100, createdAt: new Date(2026, 5, 5) },
        { amount: 200, createdAt: new Date(2026, 5, 20) },
      ],
      monthsBack: 6,
      now,
    });
    const jun = r.find((p) => p.periodStart === '2026-06-01');
    expect(jun?.periodAmount).toBe(300);
  });

  it('negatif amount 0 sayılır', () => {
    const r = buildContributionTimeline({
      contributions: [{ amount: -500, createdAt: new Date(2026, 4, 1) }],
      monthsBack: 6,
      now,
    });
    const may = r.find((p) => p.periodStart === '2026-05-01');
    expect(may?.periodAmount).toBe(0);
  });

  it('geçersiz tarih atlanır', () => {
    const r = buildContributionTimeline({
      contributions: [{ amount: 100, createdAt: 'invalid-date' }],
      monthsBack: 6,
      now,
    });
    expect(r.every((p) => p.periodAmount === 0)).toBe(true);
  });

  it('monthsBack 0 ise boş dizi', () => {
    const r = buildContributionTimeline({ contributions: [], monthsBack: 0, now });
    expect(r).toEqual([]);
  });

  it('monthsBack negatif ise boş dizi (clamp 0)', () => {
    const r = buildContributionTimeline({ contributions: [], monthsBack: -3, now });
    expect(r).toEqual([]);
  });

  it('cumulativeAmount monotonik artıyor (kümül property)', () => {
    const r = buildContributionTimeline({
      contributions: [
        { amount: 100, createdAt: new Date(2026, 1, 10) },
        { amount: 200, createdAt: new Date(2026, 3, 10) },
        { amount: 150, createdAt: new Date(2026, 5, 10) },
      ],
      monthsBack: 6,
      now,
    });
    for (let i = 1; i < r.length; i++) {
      expect(r[i]!.cumulativeAmount).toBeGreaterThanOrEqual(r[i - 1]!.cumulativeAmount);
    }
    expect(r[r.length - 1]?.cumulativeAmount).toBe(450);
  });
});
