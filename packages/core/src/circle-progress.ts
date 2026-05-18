/**
 * Circle Progress — ortak birikim cemberinin ilerleme hesabi.
 *
 * PBI: "Ailem veya toplulugumla ortak birikim hedefi olusturmak istiyorum;
 * boylece birikim surecini sosyal ve motive edici hale getirebilirim."
 *
 * Pure fn — UI/infrastructure agnostic. Sosyal motivasyon icin lider tablosu
 * + milestone seviyesini birlikte uretir.
 */

export interface CircleMemberShape {
  userId: string;
  /// UI'da gosterim icin
  name: string;
  contribution: number;
  /// 'admin' | 'member'
  role: string;
  joinedAt: Date;
}

export interface CircleLeaderboardEntry {
  userId: string;
  name: string;
  contribution: number;
  /// Lider tablosu yuzdesi (kullanicinin toplam icindeki payi, 0-1)
  sharePct: number;
  /// 1-indexed siralama
  rank: number;
}

export type CircleMilestoneLevel = 25 | 50 | 75 | 100;

export interface CircleProgress {
  target: number;
  totalContributed: number;
  remainingAmount: number;
  /// 0-1+ (hedef asilirsa > 1)
  progressPct: number;
  /// Ulasilmis en yuksek milestone (25/50/75/100). Hicbir milestone'a
  /// ulasilmadiysa null.
  highestReachedMilestone: CircleMilestoneLevel | null;
  /// Tum ulasilan milestone'lar (kronolojik degil, sirali ascending).
  reachedMilestones: CircleMilestoneLevel[];
  /// Bir sonraki milestone (henuz ulasilmadiysa). Hepsine ulasildiysa null.
  nextMilestone: CircleMilestoneLevel | null;
  /// Lider tablosu — katkiya gore azalan
  leaderboard: CircleLeaderboardEntry[];
  /// Toplam uye sayisi (admin dahil)
  memberCount: number;
}

const MILESTONES: CircleMilestoneLevel[] = [25, 50, 75, 100];

/**
 * Bir cemberin ilerleme + lider tablosunu hesapla.
 *
 * Edge cases:
 * - target ≤ 0: progressPct=0, hicbir milestone tetiklenmez
 * - members bos: totalContributed=0
 * - tie-breaking lider tablosunda: alfabetik isim ile stabil
 *
 * "previouslyReachedMilestones" parametresi DB'deki CircleMilestoneLog'tan
 * gelen daha onceki milestone'lardir. Eger gecerli hesaba dahil edilirse
 * "yeni ulasilan" milestone'lar tespit edilebilir (UI'da bildirim icin).
 */
export function calculateCircleProgress(input: {
  target: number;
  members: ReadonlyArray<CircleMemberShape>;
}): CircleProgress {
  const target = Math.max(0, input.target);
  const totalContributed = round2(
    input.members.reduce((s, m) => s + Math.max(0, m.contribution), 0),
  );
  const remainingAmount = round2(Math.max(0, target - totalContributed));
  const progressPct = target > 0 ? round4(totalContributed / target) : 0;

  const reachedMilestones = MILESTONES.filter((m) => progressPct >= m / 100);
  const highestReachedMilestone =
    reachedMilestones.length > 0 ? reachedMilestones[reachedMilestones.length - 1]! : null;
  const nextMilestone = MILESTONES.find((m) => progressPct < m / 100) ?? null;

  // Leaderboard: katki azalan, tie-break isim
  const sorted = [...input.members].sort((a, b) => {
    const diff = b.contribution - a.contribution;
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, 'tr');
  });

  const leaderboard: CircleLeaderboardEntry[] = sorted.map((m, idx) => ({
    userId: m.userId,
    name: m.name,
    contribution: round2(Math.max(0, m.contribution)),
    sharePct: totalContributed > 0 ? round4(Math.max(0, m.contribution) / totalContributed) : 0,
    rank: idx + 1,
  }));

  return {
    target,
    totalContributed,
    remainingAmount,
    progressPct,
    highestReachedMilestone,
    reachedMilestones,
    nextMilestone,
    leaderboard,
    memberCount: input.members.length,
  };
}

/**
 * Bir progress sonucu ile daha onceki "log'lanmis" milestone setini karsilastir;
 * yeni ulasilan milestone'lari dondur. Notification tetiklemesi icin.
 */
export function diffNewMilestones(
  current: CircleProgress,
  previouslyLogged: ReadonlyArray<CircleMilestoneLevel>,
): CircleMilestoneLevel[] {
  const set = new Set(previouslyLogged);
  return current.reachedMilestones.filter((m) => !set.has(m));
}

/**
 * 8 karakterli alphanumeric (uppercase) davet kodu uret. Sandbox-safe
 * (Math.random kullanir, cryptographic guvenligi degil; DB unique index
 * eklendi cakisma riski cok dusuk olsa da garanti eder).
 */
export function generateInviteCode(): string {
  // Karistirici karakterler (I/0/O) hariç tutuldu — okuma kolayligi icin.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
