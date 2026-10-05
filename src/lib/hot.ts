import { CASH_BALL_MAX, WHITE_MAX, WHITE_PICKS, type Draw } from './game';

export interface HotNumber {
  number: number;
  /** Times drawn in the window. */
  count: number;
  /** Average count per number in the window if every number came up equally often. */
  expected: number;
  lastSeen: string | null;
}

/**
 * Ranks numbers by how often they were drawn in the most recent `window` draws (0 = all draws).
 * Ties go to the number seen more recently, then the lower number.
 */
export function rankByFrequency(draws: readonly Draw[], window: number, max: number, pick: (d: Draw) => readonly number[], perDraw: number): HotNumber[] {
  const recent = window > 0 ? draws.slice(-window) : draws;
  const counts = new Array<number>(max + 1).fill(0);
  const last = new Array<string | null>(max + 1).fill(null);
  for (const d of recent)
    for (const n of pick(d)) {
      counts[n]++;
      if (!last[n] || d.date > last[n]!) last[n] = d.date;
    }
  const expected = (recent.length * perDraw) / max;
  return Array.from({ length: max }, (_, i) => i + 1)
    .map((n) => ({ number: n, count: counts[n], expected, lastSeen: last[n] }))
    .sort((a, b) => b.count - a.count || (b.lastSeen ?? '').localeCompare(a.lastSeen ?? '') || a.number - b.number);
}

export const hotWhites = (draws: readonly Draw[], window: number) => rankByFrequency(draws, window, WHITE_MAX, (d) => d.whites, WHITE_PICKS);

export const hotCashBalls = (draws: readonly Draw[], window: number) => rankByFrequency(draws, window, CASH_BALL_MAX, (d) => [d.cashBall], 1);
