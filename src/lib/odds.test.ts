import { describe, expect, it } from 'vitest';
import { OFFICIAL_OVERALL_ODDS, PRIZE_TIERS } from './game';
import {
  ALL_TIER_ODDS,
  ANY_PRIZE_ONE_IN,
  ANY_PRIZE_WAYS,
  TOTAL_COMBOS,
  WHITE_COMBOS,
  atLeastOnce,
  choose,
  expectedValue,
  whiteMatchWays,
  yearsToExpect,
} from './odds';

describe('choose', () => {
  it('computes binomial coefficients', () => {
    expect(choose(35, 4)).toBe(52_360);
    expect(choose(31, 4)).toBe(31_465);
    expect(choose(31, 3)).toBe(4_495);
    expect(choose(4, 2)).toBe(6);
    expect(choose(5, 0)).toBe(1);
    expect(choose(5, 5)).toBe(1);
  });

  it('returns 0 for impossible selections', () => {
    expect(choose(3, 4)).toBe(0);
    expect(choose(3, -1)).toBe(0);
  });
});

describe('ticket space', () => {
  it('has C(35,4) × 25 = 1,309,000 combinations (the official jackpot odds)', () => {
    expect(WHITE_COMBOS).toBe(52_360);
    expect(TOTAL_COMBOS).toBe(1_309_000);
  });

  it('partitions the white combinations by number of matches', () => {
    const ways = [0, 1, 2, 3, 4].map(whiteMatchWays);
    expect(ways).toEqual([31_465, 17_980, 2_790, 124, 1]);
    expect(ways.reduce((a, b) => a + b, 0)).toBe(WHITE_COMBOS);
  });
});

describe('prize tiers', () => {
  it('derives the winning-combination count of every tier', () => {
    expect(ALL_TIER_ODDS.map((t) => [t.tier.id, t.ways])).toEqual([
      ['4+CB', 1],
      ['4', 24],
      ['3+CB', 124],
      ['3', 2_976],
      ['2+CB', 2_790],
      ['2', 66_960],
      ['1+CB', 17_980],
      ['0+CB', 31_465],
    ]);
  });

  it.each(ALL_TIER_ODDS.map((t) => [t.tier.id, t] as const))('%s matches the published odds when rounded', (_id, t) => {
    expect(Math.round(t.oneIn)).toBe(t.tier.officialOdds);
    expect(t.matchesOfficial).toBe(true);
  });

  it('gives exact "1 in X" figures', () => {
    const byId = Object.fromEntries(ALL_TIER_ODDS.map((t) => [t.tier.id, t.oneIn]));
    expect(byId['4+CB']).toBe(1_309_000);
    expect(byId['4']).toBeCloseTo(54_541.667, 2);
    expect(byId['2']).toBeCloseTo(19.549, 3);
    expect(byId['0+CB']).toBeCloseTo(41.602, 3);
  });

  it('accounts for every ticket once winning and losing outcomes are added', () => {
    const losing = whiteMatchWays(1) * 24 + whiteMatchWays(0) * 24; // 1 white, or nothing, without the Cash Ball
    expect(ANY_PRIZE_WAYS + losing).toBe(TOTAL_COMBOS);
  });

  it('has overall odds of about 1 in 10.7', () => {
    expect(ANY_PRIZE_WAYS).toBe(122_320);
    expect(Math.round(ANY_PRIZE_ONE_IN * 10) / 10).toBe(OFFICIAL_OVERALL_ODDS);
  });

  it('lists each white/Cash Ball combination at most once', () => {
    const keys = PRIZE_TIERS.map((t) => `${t.whites}-${t.cashBall}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('expected value', () => {
  const ev = expectedValue();

  it('returns about 52 cents in cash per $1 ticket', () => {
    expect(ev.cash).toBeCloseTo(682_310 / 1_309_000, 10);
    expect(ev.cash).toBeCloseTo(0.5212, 4);
  });

  it('values Free Play at face value and recursively', () => {
    expect(ev.freePlayFace).toBeCloseTo(31_465 / 1_309_000, 10);
    expect(ev.totalFace).toBeCloseTo(713_775 / 1_309_000, 10);
    const pFree = 31_465 / 1_309_000;
    expect(ev.totalRecursive).toBeCloseTo(ev.cash / (1 - pFree), 10);
    expect(ev.totalRecursive).toBeGreaterThan(ev.cash);
    expect(ev.totalRecursive).toBeLessThan(ev.totalFace);
    expect(ev.lossFace).toBeCloseTo(1 - ev.totalFace, 10);
  });
});

describe('odds made tangible', () => {
  it('expects a jackpot about every 3,584 years of daily play', () => {
    expect(yearsToExpect(1 / TOTAL_COMBOS)).toBeCloseTo(1_309_000 / 365.25, 6);
    expect(Math.round(yearsToExpect(1 / TOTAL_COMBOS))).toBe(3_584);
  });

  it('computes the chance of at least one hit', () => {
    expect(atLeastOnce(0.5, 2)).toBeCloseTo(0.75, 12);
    expect(atLeastOnce(1 / TOTAL_COMBOS, 1826)).toBeCloseTo(0.001394, 5);
  });
});
