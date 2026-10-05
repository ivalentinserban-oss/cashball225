// Cash Ball 225 game definition, verified against the official Kentucky Lottery
// "Odds & Prizes" and "How to Play" pages (play.kylottery.com/en-us/playnow/cashball.html).

export const GAME_NAME = 'Cash Ball 225';
export const WHITE_MAX = 35;
export const WHITE_PICKS = 4;
export const CASH_BALL_MAX = 25;
export const TICKET_PRICE = 1;
/** Maximum total top-prize liability per drawing; above this the top prize is shared pari-mutuel. */
export const TOP_PRIZE_LIABILITY_CAP = 1_000_000;

export type Whites = [number, number, number, number];

export interface Draw {
  /** Draw date (Eastern Time), YYYY-MM-DD. */
  date: string;
  /** The four white balls, ascending. */
  whites: Whites;
  cashBall: number;
  /** Where this row came from: "kylottery.com" or "lottery.net". */
  source: string;
  /** Kentucky winner counts per prize tier, in PRIZE_TIERS order (when known). */
  winners?: number[];
}

export interface PrizeTier {
  id: string;
  /** Number of white balls matched. */
  whites: number;
  /** Whether the Cash Ball must match. */
  cashBall: boolean;
  /** Cash value in dollars. Free Play is valued at the $1 ticket it replaces. */
  prize: number;
  prizeLabel: string;
  /** Published odds, "1 in X", exactly as shown on the official site. */
  officialOdds: number;
  freePlay?: boolean;
}

/** Official prize table, in the order the Kentucky Lottery publishes it. */
export const PRIZE_TIERS: readonly PrizeTier[] = [
  { id: '4+CB', whites: 4, cashBall: true, prize: 225_000, prizeLabel: '$225,000', officialOdds: 1_309_000 },
  { id: '4', whites: 4, cashBall: false, prize: 2_250, prizeLabel: '$2,250', officialOdds: 54_542 },
  { id: '3+CB', whites: 3, cashBall: true, prize: 225, prizeLabel: '$225', officialOdds: 10_556 },
  { id: '3', whites: 3, cashBall: false, prize: 50, prizeLabel: '$50', officialOdds: 440 },
  { id: '2+CB', whites: 2, cashBall: true, prize: 25, prizeLabel: '$25', officialOdds: 469 },
  { id: '2', whites: 2, cashBall: false, prize: 1, prizeLabel: '$1', officialOdds: 20 },
  { id: '1+CB', whites: 1, cashBall: true, prize: 5, prizeLabel: '$5', officialOdds: 73 },
  { id: '0+CB', whites: 0, cashBall: true, prize: 1, prizeLabel: 'Free Play', officialOdds: 42, freePlay: true },
];

/** Official "overall odds of winning any prize": approximately 1 in 10.7. */
export const OFFICIAL_OVERALL_ODDS = 10.7;

export function tierLabel(t: Pick<PrizeTier, 'whites' | 'cashBall'>): string {
  if (t.whites === 0) return 'Cash Ball only';
  const w = `${t.whites} white${t.whites === 1 ? '' : 's'}`;
  return t.cashBall ? `${w} + Cash Ball` : w;
}
