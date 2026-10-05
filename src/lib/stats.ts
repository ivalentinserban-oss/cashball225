import { CASH_BALL_MAX, WHITE_MAX, WHITE_PICKS, type Draw } from './game';
import { choose, ALL_TIER_ODDS, TOTAL_COMBOS, WHITE_COMBOS } from './odds';

export interface NumberFrequency {
  number: number;
  count: number;
  expected: number;
}

export function whiteFrequencies(draws: readonly Draw[]): NumberFrequency[] {
  const counts = new Array(WHITE_MAX + 1).fill(0);
  for (const d of draws) for (const w of d.whites) counts[w]++;
  const expected = (draws.length * WHITE_PICKS) / WHITE_MAX;
  return counts.slice(1).map((count, i) => ({ number: i + 1, count, expected }));
}

export function cashBallFrequencies(draws: readonly Draw[]): NumberFrequency[] {
  const counts = new Array(CASH_BALL_MAX + 1).fill(0);
  for (const d of draws) counts[d.cashBall]++;
  const expected = draws.length / CASH_BALL_MAX;
  return counts.slice(1).map((count, i) => ({ number: i + 1, count, expected }));
}

export interface GapStats {
  number: number;
  /** Longest run of consecutive draws (in this dataset) without the number. */
  longestGap: number;
  longestGapEnded: string | null;
  /** Draws since the number last appeared. */
  currentGap: number;
  lastSeen: string | null;
}

/**
 * Gaps are counted in dataset draws (ascending by date). The run before a number's first appearance is
 * cut off by the start of the dataset, so it isn't counted as a gap.
 */
export function gapStats(draws: readonly Draw[], max: number, pick: (d: Draw) => readonly number[]): GapStats[] {
  const out: GapStats[] = [];
  for (let n = 1; n <= max; n++) {
    let run = 0;
    let longestGap = 0;
    let longestGapEnded: string | null = null;
    let lastSeen: string | null = null;
    for (const d of draws) {
      if (pick(d).includes(n)) {
        if (lastSeen !== null && run > longestGap) {
          longestGap = run;
          longestGapEnded = d.date;
        }
        run = 0;
        lastSeen = d.date;
      } else run++;
    }
    if (run > longestGap) {
      longestGap = run;
      longestGapEnded = null; // still running
    }
    out.push({ number: n, longestGap, longestGapEnded, currentGap: run, lastSeen });
  }
  return out;
}

export interface PairCount {
  a: number;
  b: number;
  count: number;
}

export function pairCounts(draws: readonly Draw[]): PairCount[] {
  const map = new Map<number, number>();
  for (const d of draws) {
    const w = d.whites;
    for (let i = 0; i < w.length; i++)
      for (let j = i + 1; j < w.length; j++) {
        const key = Math.min(w[i], w[j]) * 100 + Math.max(w[i], w[j]);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
  }
  const all: PairCount[] = [];
  for (let a = 1; a <= WHITE_MAX; a++)
    for (let b = a + 1; b <= WHITE_MAX; b++) all.push({ a, b, count: map.get(a * 100 + b) ?? 0 });
  return all;
}

/** Expected appearances of any specific pair: N × C(4,2)/C(35,2). */
export function expectedPairCount(drawCount: number): number {
  return (drawCount * choose(WHITE_PICKS, 2)) / choose(WHITE_MAX, 2);
}

export interface SplitRow {
  label: string;
  /** e.g. number of odd balls. */
  k: number;
  count: number;
  expected: number;
  probability: number;
}

/**
 * Distribution of how many of the 4 whites fall in a subset of size `subsetSize` (e.g. the 18 odd numbers).
 * Probability is hypergeometric: C(s,k) × C(35−s, 4−k) / C(35,4).
 */
function splitDistribution(draws: readonly Draw[], inSubset: (n: number) => boolean, subsetSize: number, label: (k: number) => string): SplitRow[] {
  const counts = new Array(WHITE_PICKS + 1).fill(0);
  for (const d of draws) counts[d.whites.filter(inSubset).length]++;
  return counts.map((count, k) => {
    const probability = (choose(subsetSize, k) * choose(WHITE_MAX - subsetSize, WHITE_PICKS - k)) / WHITE_COMBOS;
    return { label: label(k), k, count, probability, expected: probability * draws.length };
  });
}

export const LOW_MAX = 17; // low = 1–17, high = 18–35

export function oddEvenSplit(draws: readonly Draw[]): SplitRow[] {
  return splitDistribution(draws, (n) => n % 2 === 1, 18, (k) => `${k} odd / ${WHITE_PICKS - k} even`);
}

export function highLowSplit(draws: readonly Draw[]): SplitRow[] {
  return splitDistribution(draws, (n) => n > LOW_MAX, WHITE_MAX - LOW_MAX, (k) => `${k} high / ${WHITE_PICKS - k} low`);
}

let sumProbCache: Map<number, number> | null = null;

/** Exact probability of each possible sum of the 4 whites (10…134), by enumerating all 52,360 combinations. */
export function sumProbabilities(): Map<number, number> {
  if (sumProbCache) return sumProbCache;
  const ways = new Map<number, number>();
  for (let a = 1; a <= WHITE_MAX; a++)
    for (let b = a + 1; b <= WHITE_MAX; b++)
      for (let c = b + 1; c <= WHITE_MAX; c++)
        for (let d = c + 1; d <= WHITE_MAX; d++) {
          const s = a + b + c + d;
          ways.set(s, (ways.get(s) ?? 0) + 1);
        }
  sumProbCache = new Map([...ways].sort((x, y) => x[0] - y[0]).map(([s, w]) => [s, w / WHITE_COMBOS]));
  return sumProbCache;
}

export interface SumBin {
  /** Inclusive lower bound of the bin. */
  from: number;
  to: number;
  count: number;
  expected: number;
}

export function sumDistribution(draws: readonly Draw[], binWidth = 5): SumBin[] {
  const probs = sumProbabilities();
  const min = 10;
  const max = 134;
  const bins: SumBin[] = [];
  for (let from = min; from <= max; from += binWidth) bins.push({ from, to: Math.min(from + binWidth - 1, max), count: 0, expected: 0 });
  const binOf = (s: number) => bins[Math.floor((s - min) / binWidth)];
  for (const [s, p] of probs) binOf(s).expected += p * draws.length;
  for (const d of draws) binOf(d.whites.reduce((x, y) => x + y, 0)).count++;
  return bins;
}

export function meanSum(draws: readonly Draw[]): number {
  return draws.reduce((s, d) => s + d.whites.reduce((x, y) => x + y, 0), 0) / Math.max(1, draws.length);
}

/** Theoretical mean of the four-white sum: 4 × 18 = 72. */
export const EXPECTED_MEAN_SUM = (WHITE_PICKS * (WHITE_MAX + 1)) / 2;

export interface JackpotSummary {
  drawsWithData: number;
  jackpotWinners: number;
  jackpotDraws: { date: string; winners: number }[];
  /** Rough estimate of plays per draw, inferred from the three most common prize tiers. */
  estimatedPlays: number;
  /** Jackpots you'd expect from that many plays: plays / 1,309,000. */
  expectedJackpots: number;
}

/**
 * Uses Kentucky winner counts to count jackpot hits and estimate ticket sales.
 * Plays ≈ (winners in the 2-white, 1+CB and CB-only tiers) ÷ (their combined probability).
 * This is rough: player-picked numbers aren't uniformly random.
 */
export function jackpotSummary(draws: readonly Draw[]): JackpotSummary | null {
  const withData = draws.filter((d) => d.winners && d.winners.length === ALL_TIER_ODDS.length);
  if (withData.length === 0) return null;
  const common = [5, 6, 7];
  const pCommon = common.reduce((s, i) => s + ALL_TIER_ODDS[i].probability, 0);
  let estimatedPlays = 0;
  let jackpotWinners = 0;
  const jackpotDraws: JackpotSummary['jackpotDraws'] = [];
  for (const d of withData) {
    const w = d.winners!;
    estimatedPlays += common.reduce((s, i) => s + w[i], 0) / pCommon;
    if (w[0] > 0) {
      jackpotWinners += w[0];
      jackpotDraws.push({ date: d.date, winners: w[0] });
    }
  }
  return { drawsWithData: withData.length, jackpotWinners, jackpotDraws, estimatedPlays, expectedJackpots: estimatedPlays / TOTAL_COMBOS };
}
