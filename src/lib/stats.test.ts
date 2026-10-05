import { describe, expect, it } from 'vitest';
import type { Draw, Whites } from './game';
import { chiSquarePValue, chiSquareUniform } from './chisq';
import { quickPick, secureRandomInt } from './random';
import {
  EXPECTED_MEAN_SUM,
  cashBallFrequencies,
  expectedPairCount,
  gapStats,
  highLowSplit,
  jackpotSummary,
  oddEvenSplit,
  pairCounts,
  sumDistribution,
  sumProbabilities,
  whiteFrequencies,
} from './stats';
import { validateDrawRow, dateRange, minusYears } from './validate';

const draw = (whites: Whites, cashBall: number, date: string, winners?: number[]): Draw => ({ date, whites, cashBall, source: 'test', winners });

/** Deterministic PRNG for reproducible simulations. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomDraws(n: number, rand: () => number): Draw[] {
  const out: Draw[] = [];
  for (let i = 0; i < n; i++) {
    const pool = Array.from({ length: 35 }, (_, j) => j + 1);
    for (let k = 0; k < 4; k++) {
      const j = k + Math.floor(rand() * (35 - k));
      [pool[k], pool[j]] = [pool[j], pool[k]];
    }
    out.push(draw(pool.slice(0, 4).sort((a, b) => a - b) as Whites, 1 + Math.floor(rand() * 25), `d${i}`));
  }
  return out;
}

describe('chi-square p-values', () => {
  it.each([
    [3.841, 1],
    [18.307, 10],
    [36.415, 24],
    [48.602, 34],
  ])('critical value %f with %i df gives p ≈ 0.05', (x, df) => {
    expect(chiSquarePValue(x, df)).toBeCloseTo(0.05, 3);
  });

  it('gives p = 1 for a perfectly uniform sample', () => {
    const r = chiSquareUniform([10, 10, 10, 10]);
    expect(r.statistic).toBe(0);
    expect(r.pValue).toBeCloseTo(1, 10);
  });

  it('computes the Pearson statistic', () => {
    // (12-10)^2/10 + (8-10)^2/10 = 0.8
    const r = chiSquareUniform([12, 8]);
    expect(r.statistic).toBeCloseTo(0.8, 12);
    expect(r.df).toBe(1);
  });

  it('applies the (n−1)/(n−k) correction for balls drawn without replacement', () => {
    const r = chiSquareUniform(new Array(35).fill(0).map((_, i) => 200 + (i % 3)), 4);
    expect(r.correction).toBeCloseTo(34 / 31, 12);
    expect(r.statistic).toBeCloseTo(r.pearson * (34 / 31), 12);
  });

  it('rejects truly random data about 5% of the time at the 0.05 level', () => {
    const rand = mulberry32(225);
    const trials = 400;
    let whiteRejects = 0;
    let cbRejects = 0;
    for (let t = 0; t < trials; t++) {
      const draws = randomDraws(1825, rand);
      if (chiSquareUniform(whiteFrequencies(draws).map((f) => f.count), 4).pValue < 0.05) whiteRejects++;
      if (chiSquareUniform(cashBallFrequencies(draws).map((f) => f.count)).pValue < 0.05) cbRejects++;
    }
    expect(whiteRejects / trials).toBeGreaterThan(0.02);
    expect(whiteRejects / trials).toBeLessThan(0.09);
    expect(cbRejects / trials).toBeGreaterThan(0.02);
    expect(cbRejects / trials).toBeLessThan(0.09);
  });
});

describe('frequency statistics', () => {
  const draws = [draw([1, 2, 3, 4], 1, '2026-01-01'), draw([1, 5, 6, 7], 2, '2026-01-02'), draw([2, 8, 9, 10], 1, '2026-01-03')];

  it('counts white and Cash Ball frequencies with expected values', () => {
    const w = whiteFrequencies(draws);
    expect(w).toHaveLength(35);
    expect(w[0]).toEqual({ number: 1, count: 2, expected: 12 / 35 });
    expect(w.reduce((s, f) => s + f.count, 0)).toBe(12);
    const c = cashBallFrequencies(draws);
    expect(c).toHaveLength(25);
    expect(c[0].count).toBe(2);
    expect(c[0].expected).toBeCloseTo(3 / 25, 12);
  });

  it('finds longest and current gaps', () => {
    const g = gapStats(draws, 35, (d) => d.whites);
    expect(g[0]).toMatchObject({ number: 1, longestGap: 1, currentGap: 1, lastSeen: '2026-01-02' });
    expect(g[1]).toMatchObject({ number: 2, longestGap: 1, longestGapEnded: '2026-01-03', currentGap: 0 });
    expect(g[34]).toMatchObject({ number: 35, longestGap: 3, longestGapEnded: null, currentGap: 3, lastSeen: null });
    // 8 first appears in the third draw; the two draws before it are cut off by the dataset start, not a gap.
    expect(g[7]).toMatchObject({ number: 8, longestGap: 0, currentGap: 0 });
  });

  it('counts pairs', () => {
    const pairs = pairCounts(draws);
    expect(pairs).toHaveLength(595);
    expect(pairs.find((p) => p.a === 1 && p.b === 2)?.count).toBe(1);
    expect(pairs.reduce((s, p) => s + p.count, 0)).toBe(18);
    expect(expectedPairCount(595)).toBeCloseTo(6, 12);
  });
});

describe('distributions', () => {
  it('has exact sum probabilities from 10 to 134 with mean 72', () => {
    const p = sumProbabilities();
    expect(Math.min(...p.keys())).toBe(10);
    expect(Math.max(...p.keys())).toBe(134);
    let total = 0;
    let mean = 0;
    for (const [s, q] of p) {
      total += q;
      mean += s * q;
    }
    expect(total).toBeCloseTo(1, 12);
    expect(mean).toBeCloseTo(EXPECTED_MEAN_SUM, 10);
    expect(EXPECTED_MEAN_SUM).toBe(72);
  });

  it('bins the sum distribution', () => {
    const bins = sumDistribution([draw([1, 2, 3, 4], 1, 'a'), draw([32, 33, 34, 35], 1, 'b')]);
    expect(bins[0]).toMatchObject({ from: 10, to: 14, count: 1 });
    expect(bins[bins.length - 1]).toMatchObject({ to: 134, count: 1 });
    expect(bins.reduce((s, b) => s + b.expected, 0)).toBeCloseTo(2, 10);
  });

  it('uses hypergeometric probabilities for odd/even and high/low', () => {
    for (const rows of [oddEvenSplit([]), highLowSplit([])]) {
      expect(rows).toHaveLength(5);
      expect(rows.reduce((s, r) => s + r.probability, 0)).toBeCloseTo(1, 12);
    }
    // 18 odd numbers: P(4 odd) = C(18,4)/C(35,4)
    expect(oddEvenSplit([])[4].probability).toBeCloseTo(3060 / 52360, 12);
    const one = oddEvenSplit([draw([1, 3, 4, 6], 1, 'a')]);
    expect(one[2].count).toBe(1);
  });
});

describe('jackpotSummary', () => {
  it('counts jackpot winners and estimates plays from common tiers', () => {
    const s = jackpotSummary([
      draw([1, 2, 3, 4], 1, '2026-01-01', [0, 1, 2, 30, 30, 1500, 400, 700]),
      draw([1, 2, 3, 4], 1, '2026-01-02', [2, 0, 1, 30, 30, 1500, 400, 700]),
      draw([1, 2, 3, 4], 1, '2026-01-03'),
    ])!;
    expect(s.drawsWithData).toBe(2);
    expect([s.from, s.to]).toEqual(['2026-01-01', '2026-01-02']);
    expect(s.jackpotWinners).toBe(2);
    expect(s.jackpotDraws).toEqual([{ date: '2026-01-02', winners: 2 }]);
    const pCommon = (66_960 + 17_980 + 31_465) / 1_309_000;
    expect(s.estimatedPlays).toBeCloseTo((2 * 2600) / pCommon, 6);
  });

  it('returns null without winner data', () => {
    expect(jackpotSummary([draw([1, 2, 3, 4], 1, 'x')])).toBeNull();
  });
});

describe('quick pick', () => {
  it('always produces a legal, sorted ticket', () => {
    for (let i = 0; i < 2000; i++) {
      const p = quickPick();
      expect(validateDrawRow({ date: '2026-01-01', whites: p.whites, cashBall: p.cashBall })).toEqual([]);
      expect([...p.whites].sort((a, b) => a - b)).toEqual(p.whites);
    }
  });

  it('rejects out-of-range raw values to avoid modulo bias', () => {
    const values = [0xffffffff, 7];
    const rng = (b: Uint32Array) => {
      b[0] = values.shift()!;
    };
    expect(secureRandomInt(10, rng)).toBe(7);
  });
});

describe('draw row validation and dates', () => {
  it('flags bad rows', () => {
    expect(validateDrawRow({ date: '2026-02-30', whites: [1, 2, 3, 4], cashBall: 1 })).toHaveLength(1);
    expect(validateDrawRow({ date: '2026-01-01', whites: [1, 2, 3], cashBall: 1 })[0]).toMatch(/4 white/);
    expect(validateDrawRow({ date: '2026-01-01', whites: [1, 2, 3, 3], cashBall: 1 })[0]).toMatch(/repeated/);
    expect(validateDrawRow({ date: '2026-01-01', whites: [1, 2, 3, 36], cashBall: 26 })).toHaveLength(2);
  });

  it('builds date ranges and subtracts years', () => {
    expect(dateRange('2024-02-27', '2024-03-01')).toEqual(['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01']);
    expect(minusYears('2026-10-04', 5)).toBe('2021-10-04');
    expect(minusYears('2028-02-29', 1)).toBe('2027-02-28');
    expect(dateRange(minusYears('2026-10-04', 5), '2026-10-03')).toHaveLength(1826);
  });
});
