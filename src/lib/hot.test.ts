import { describe, expect, it } from 'vitest';
import type { Draw, Whites } from './game';
import { hotCashBalls, hotWhites } from './hot';
import { pickFromPools } from './random';

const draw = (whites: Whites, cashBall: number, date: string): Draw => ({ date, whites, cashBall, source: 'test' });

const draws = [
  draw([1, 2, 3, 4], 5, '2026-01-01'),
  draw([1, 2, 3, 9], 5, '2026-01-02'),
  draw([1, 2, 8, 9], 7, '2026-01-03'),
  draw([1, 6, 8, 10], 7, '2026-01-04'),
];

describe('hot number ranking', () => {
  it('ranks whites by count, breaking ties by most recent appearance', () => {
    const r = hotWhites(draws, 0);
    expect(r.slice(0, 5).map((h) => [h.number, h.count])).toEqual([
      [1, 4],
      [2, 3],
      [8, 2], // last seen Jan 4
      [9, 2], // last seen Jan 3
      [3, 2], // last seen Jan 2
    ]);
    expect(r).toHaveLength(35);
    expect(r[0].expected).toBeCloseTo((4 * 4) / 35, 12);
    expect(r[0].lastSeen).toBe('2026-01-04');
  });

  it('only counts the most recent window of draws', () => {
    const r = hotWhites(draws, 2);
    expect(r[0]).toMatchObject({ number: 1, count: 2 });
    expect(r.find((h) => h.number === 3)?.count).toBe(0);
    expect(r[0].expected).toBeCloseTo((2 * 4) / 35, 12);
  });

  it('ranks Cash Balls', () => {
    const r = hotCashBalls(draws, 0);
    expect(r.slice(0, 2).map((h) => [h.number, h.count])).toEqual([
      [7, 2], // tie with 5, seen more recently
      [5, 2],
    ]);
    expect(r).toHaveLength(25);
  });
});

describe('pickFromPools', () => {
  it('only uses numbers from the pools and never repeats a white ball', () => {
    const whites = [3, 8, 15, 22, 29, 31];
    const cash = [4, 11];
    for (let i = 0; i < 500; i++) {
      const p = pickFromPools(whites, cash);
      expect(p.whites).toHaveLength(4);
      expect(new Set(p.whites).size).toBe(4);
      expect(p.whites.every((w) => whites.includes(w))).toBe(true);
      expect(cash).toContain(p.cashBall);
      expect([...p.whites].sort((a, b) => a - b)).toEqual(p.whites);
    }
  });

  it('returns the whole pool when it has exactly 4 numbers', () => {
    expect(pickFromPools([9, 2, 30, 14], [6]).whites).toEqual([2, 9, 14, 30]);
  });

  it('rejects pools that are too small', () => {
    expect(() => pickFromPools([1, 2, 3], [1])).toThrow(RangeError);
    expect(() => pickFromPools([1, 2, 3, 4], [])).toThrow(RangeError);
  });
});
