import { CASH_BALL_MAX, PRIZE_TIERS, TICKET_PRICE, WHITE_MAX, WHITE_PICKS, type PrizeTier } from './game';

/** Binomial coefficient C(n, k), exact for the small values used here. */
export function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/** Total number of distinct tickets: C(35,4) × 25. */
export const WHITE_COMBOS = choose(WHITE_MAX, WHITE_PICKS); // 52,360
export const TOTAL_COMBOS = WHITE_COMBOS * CASH_BALL_MAX; // 1,309,000

/** Number of ways to match exactly k of your whites: C(4,k) × C(31, 4−k). */
export function whiteMatchWays(k: number): number {
  return choose(WHITE_PICKS, k) * choose(WHITE_MAX - WHITE_PICKS, WHITE_PICKS - k);
}

/** Number of ways the Cash Ball matches (1) or misses (24). */
export function cashBallWays(match: boolean): number {
  return match ? 1 : CASH_BALL_MAX - 1;
}

export interface TierOdds {
  tier: PrizeTier;
  /** Winning combinations out of TOTAL_COMBOS. */
  ways: number;
  probability: number;
  /** "1 in X". */
  oneIn: number;
  /** Human-readable formula for the number of winning combinations. */
  formula: string;
  /** Our exact figure rounded the way the lottery rounds published odds. */
  matchesOfficial: boolean;
}

export function tierOdds(tier: PrizeTier): TierOdds {
  const k = tier.whites;
  const ways = whiteMatchWays(k) * cashBallWays(tier.cashBall);
  const probability = ways / TOTAL_COMBOS;
  const oneIn = TOTAL_COMBOS / ways;
  const formula = `C(4,${k}) × C(31,${4 - k}) × ${tier.cashBall ? '1' : '24'} = ${choose(4, k)} × ${choose(31, 4 - k).toLocaleString('en-US')} × ${
    tier.cashBall ? 1 : 24
  } = ${ways.toLocaleString('en-US')}`;
  return { tier, ways, probability, oneIn, formula, matchesOfficial: Math.round(oneIn) === tier.officialOdds };
}

export const ALL_TIER_ODDS: TierOdds[] = PRIZE_TIERS.map(tierOdds);

/** Winning combinations of any prize tier (including Free Play). */
export const ANY_PRIZE_WAYS = ALL_TIER_ODDS.reduce((s, t) => s + t.ways, 0);
export const ANY_PRIZE_PROBABILITY = ANY_PRIZE_WAYS / TOTAL_COMBOS;
export const ANY_PRIZE_ONE_IN = TOTAL_COMBOS / ANY_PRIZE_WAYS;

export interface ExpectedValue {
  /** Expected cash prizes per $1 ticket, excluding Free Play. */
  cash: number;
  /** Expected Free Play tickets per ticket, valued at $1 face value. */
  freePlayFace: number;
  /** cash + freePlayFace. */
  totalFace: number;
  /**
   * Free Play valued at what a free ticket is actually worth (its own EV, recursively):
   * V = cash + p(free) × V  ⇒  V = cash / (1 − p(free)).
   */
  totalRecursive: number;
  /** Expected loss per $1 ticket at face value. */
  lossFace: number;
}

export function expectedValue(): ExpectedValue {
  let cash = 0;
  let pFree = 0;
  for (const t of ALL_TIER_ODDS) {
    if (t.tier.freePlay) pFree += t.probability;
    else cash += t.probability * t.tier.prize;
  }
  const freePlayFace = pFree * TICKET_PRICE;
  return {
    cash,
    freePlayFace,
    totalFace: cash + freePlayFace,
    totalRecursive: cash / (1 - pFree),
    lossFace: TICKET_PRICE - (cash + freePlayFace),
  };
}

export const DAYS_PER_YEAR = 365.25;

/** Expected waiting time, in years, for an event with per-draw probability p when playing one ticket per daily draw. */
export function yearsToExpect(p: number): number {
  return 1 / p / DAYS_PER_YEAR;
}

/** Probability of at least one success in n independent draws. */
export function atLeastOnce(p: number, n: number): number {
  return 1 - Math.pow(1 - p, n);
}
