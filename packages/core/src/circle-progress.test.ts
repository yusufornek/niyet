import { describe, expect, it } from 'vitest';

import { calculateCircleProgress, diffNewMilestones, generateInviteCode } from './circle-progress';

function m(userId: string, name: string, contribution: number, role = 'member') {
  return {
    userId,
    name,
    contribution,
    role,
    joinedAt: new Date('2026-05-01T00:00:00Z'),
  };
}

describe('calculateCircleProgress', () => {
  it('hicbir milestone: katki %0', () => {
    const r = calculateCircleProgress({ target: 10000, members: [] });
    expect(r.totalContributed).toBe(0);
    expect(r.progressPct).toBe(0);
    expect(r.reachedMilestones).toEqual([]);
    expect(r.highestReachedMilestone).toBeNull();
    expect(r.nextMilestone).toBe(25);
  });

  it('%25 milestone: katki tam %25', () => {
    const r = calculateCircleProgress({
      target: 10000,
      members: [m('a', 'Ali', 2500)],
    });
    expect(r.progressPct).toBe(0.25);
    expect(r.reachedMilestones).toEqual([25]);
    expect(r.highestReachedMilestone).toBe(25);
    expect(r.nextMilestone).toBe(50);
  });

  it('%50 milestone: birden fazla uye', () => {
    const r = calculateCircleProgress({
      target: 10000,
      members: [m('a', 'Ali', 3000), m('b', 'Ayse', 2000)],
    });
    expect(r.totalContributed).toBe(5000);
    expect(r.progressPct).toBe(0.5);
    expect(r.reachedMilestones).toEqual([25, 50]);
    expect(r.highestReachedMilestone).toBe(50);
    expect(r.nextMilestone).toBe(75);
  });

  it('%100 ulasildi: nextMilestone null', () => {
    const r = calculateCircleProgress({
      target: 10000,
      members: [m('a', 'Ali', 10000)],
    });
    expect(r.progressPct).toBe(1);
    expect(r.reachedMilestones).toEqual([25, 50, 75, 100]);
    expect(r.highestReachedMilestone).toBe(100);
    expect(r.nextMilestone).toBeNull();
    expect(r.remainingAmount).toBe(0);
  });

  it('%100 asildi (super-saver): progressPct > 1', () => {
    const r = calculateCircleProgress({
      target: 1000,
      members: [m('a', 'Ali', 1500)],
    });
    expect(r.progressPct).toBe(1.5);
    expect(r.highestReachedMilestone).toBe(100);
    expect(r.remainingAmount).toBe(0);
  });

  it('leaderboard katkiya gore azalan', () => {
    const r = calculateCircleProgress({
      target: 10000,
      members: [m('a', 'Ali', 1000), m('b', 'Ayse', 4000), m('c', 'Can', 2500)],
    });
    expect(r.leaderboard.map((l) => l.userId)).toEqual(['b', 'c', 'a']);
    expect(r.leaderboard[0]?.rank).toBe(1);
    expect(r.leaderboard[0]?.sharePct).toBeCloseTo(4000 / 7500, 4);
  });

  it('leaderboard tie-break: alfabetik isim', () => {
    const r = calculateCircleProgress({
      target: 10000,
      members: [m('a', 'Zeynep', 500), m('b', 'Ahmet', 500)],
    });
    expect(r.leaderboard.map((l) => l.name)).toEqual(['Ahmet', 'Zeynep']);
  });

  it('target=0 edge: progressPct=0, hicbir milestone tetiklenmez', () => {
    const r = calculateCircleProgress({
      target: 0,
      members: [m('a', 'Ali', 500)],
    });
    expect(r.progressPct).toBe(0);
    expect(r.reachedMilestones).toEqual([]);
  });

  it('negatif contribution clamp 0', () => {
    const r = calculateCircleProgress({
      target: 1000,
      members: [m('a', 'Ali', -500)],
    });
    expect(r.totalContributed).toBe(0);
    expect(r.leaderboard[0]?.contribution).toBe(0);
  });
});

describe('diffNewMilestones', () => {
  it("hicbiri log'lanmadiysa tum reached doner", () => {
    const progress = calculateCircleProgress({
      target: 10000,
      members: [m('a', 'Ali', 5000)],
    });
    expect(diffNewMilestones(progress, [])).toEqual([25, 50]);
  });

  it("zaten log'lanmis milestone tekrar dondurulmez", () => {
    const progress = calculateCircleProgress({
      target: 10000,
      members: [m('a', 'Ali', 7500)],
    });
    expect(diffNewMilestones(progress, [25, 50])).toEqual([75]);
  });

  it('hicbir yeni milestone: bos array', () => {
    const progress = calculateCircleProgress({
      target: 10000,
      members: [m('a', 'Ali', 2500)],
    });
    expect(diffNewMilestones(progress, [25])).toEqual([]);
  });
});

describe('generateInviteCode', () => {
  it('8 karakter, alphanumeric uppercase', () => {
    const code = generateInviteCode();
    expect(code.length).toBe(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('rastgele - 100 ornekte cogu farkli olmali (cakisma kuvvetli olmamali)', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) set.add(generateInviteCode());
    expect(set.size).toBeGreaterThan(95);
  });
});
