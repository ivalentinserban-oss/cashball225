import { describe, expect, it } from 'vitest';
import { PRIZE_TIERS, type Draw, type Whites } from './game';
import { matchTicket, simulate, validateTicket } from './match';
import { ALL_TIER_ODDS } from './odds';

const draw = (whites: Whites, cashBall: number, date = '2026-01-01'): Draw => ({ date, whites, cashBall, source: 'test' });
const DRAW = draw([3, 16, 24, 31], 7);

const tierId = (whites: number[], cashBall: number) => matchTicket({ whites, cashBall }, DRAW).tier?.id ?? null;

describe('matchTicket', () => {
  it.each([
    [[3, 16, 24, 31], 7, '4+CB'],
    [[31, 24, 16, 3], 7, '4+CB'], // order doesn't matter
    [[3, 16, 24, 31], 8, '4'],
    [[3, 16, 24, 1], 7, '3+CB'],
    [[3, 16, 24, 1], 8, '3'],
    [[3, 16, 2, 1], 7, '2+CB'],
    [[3, 16, 2, 1], 8, '2'],
    [[3, 4, 2, 1], 7, '1+CB'],
    [[5, 4, 2, 1], 7, '0+CB'],
  ])('%j + CB %i wins tier %s', (whites, cb, expected) => {
    expect(tierId(whites, cb)).toBe(expected);
  });

  it('pays nothing for one white without the Cash Ball', () => {
    expect(tierId([3, 4, 2, 1], 8)).toBeNull();
  });

  it('pays nothing for no matches at all', () => {
    expect(tierId([5, 4, 2, 1], 8)).toBeNull();
  });

  it('keeps the two machines separate', () => {
    // Cash Ball 7 is not a white ball, and white 16 is not the Cash Ball.
    expect(matchTicket({ whites: [7, 1, 2, 4], cashBall: 16 }, DRAW)).toMatchObject({ whiteMatches: 0, cashBallMatch: false, tier: null });
  });

  it('reproduces every tier count when all 1,309,000 possible tickets are checked against one draw', () => {
    const counts = PRIZE_TIERS.map(() => 0);
    let losers = 0;
    for (let a = 1; a <= 35; a++)
      for (let b = a + 1; b <= 35; b++)
        for (let c = b + 1; c <= 35; c++)
          for (let d = c + 1; d <= 35; d++)
            for (let cb = 1; cb <= 25; cb++) {
              const r = matchTicket({ whites: [a, b, c, d], cashBall: cb }, DRAW);
              if (r.tierIndex >= 0) counts[r.tierIndex]++;
              else losers++;
            }
    expect(counts).toEqual(ALL_TIER_ODDS.map((t) => t.ways));
    expect(losers + counts.reduce((x, y) => x + y, 0)).toBe(1_309_000);
  });
});

describe('simulate', () => {
  const draws = [
    draw([3, 16, 24, 31], 7, '2026-01-01'), // jackpot
    draw([3, 16, 24, 30], 2, '2026-01-02'), // 3 whites: $50
    draw([1, 2, 4, 5], 7, '2026-01-03'), // CB only: Free Play
    draw([1, 2, 4, 5], 9, '2026-01-04'), // nothing
    draw([3, 16, 1, 2], 7, '2026-01-05'), // 2 + CB: $25
  ];
  const sim = simulate({ whites: [3, 16, 24, 31], cashBall: 7 }, draws);

  it('totals the cost, cash and Free Plays', () => {
    expect(sim.draws).toBe(5);
    expect(sim.cost).toBe(5);
    expect(sim.cashWon).toBe(225_000 + 50 + 25);
    expect(sim.freePlays).toBe(1);
    expect(sim.totalValue).toBe(225_076);
    expect(sim.net).toBe(225_071);
  });

  it('lists each winning draw with its tier', () => {
    expect(sim.wins.map((w) => [w.draw.date, w.result.tier.id])).toEqual([
      ['2026-01-01', '4+CB'],
      ['2026-01-02', '3'],
      ['2026-01-03', '0+CB'],
      ['2026-01-05', '2+CB'],
    ]);
    expect(sim.tierCounts).toEqual([1, 0, 0, 1, 1, 0, 0, 1]);
  });

  it('handles an empty history', () => {
    expect(simulate({ whites: [1, 2, 3, 4], cashBall: 1 }, [])).toMatchObject({ cost: 0, net: 0, wins: [] });
  });
});

describe('validateTicket', () => {
  it('accepts a legal play', () => {
    expect(validateTicket({ whites: [1, 2, 3, 35], cashBall: 25 })).toBeNull();
  });
  it.each([
    [{ whites: [1, 2, 3, null], cashBall: 5 }, /4 white/],
    [{ whites: [1, 2, 3, 36], cashBall: 5 }, /1 and 35/],
    [{ whites: [0, 2, 3, 4], cashBall: 5 }, /1 and 35/],
    [{ whites: [1, 2, 3, 3], cashBall: 5 }, /different/],
    [{ whites: [1, 2, 3, 4], cashBall: 26 }, /Cash Ball/],
    [{ whites: [1, 2, 3, 4], cashBall: null }, /Cash Ball/],
  ])('rejects %j', (t, msg) => {
    expect(validateTicket(t)).toMatch(msg);
  });
});
