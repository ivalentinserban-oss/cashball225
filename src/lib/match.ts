import { PRIZE_TIERS, TICKET_PRICE, type Draw, type PrizeTier } from './game';

export interface Ticket {
  whites: number[];
  cashBall: number;
}

export interface MatchResult {
  whiteMatches: number;
  cashBallMatch: boolean;
  /** Index into PRIZE_TIERS, or -1 for no prize. */
  tierIndex: number;
  tier: PrizeTier | null;
}

/** Which prize tier (if any) a ticket wins against a draw. */
export function matchTicket(ticket: Ticket, draw: Pick<Draw, 'whites' | 'cashBall'>): MatchResult {
  const drawn = new Set(draw.whites);
  const whiteMatches = ticket.whites.reduce((n, w) => n + (drawn.has(w) ? 1 : 0), 0);
  const cashBallMatch = ticket.cashBall === draw.cashBall;
  const tierIndex = PRIZE_TIERS.findIndex((t) => t.whites === whiteMatches && t.cashBall === cashBallMatch);
  return { whiteMatches, cashBallMatch, tierIndex, tier: tierIndex >= 0 ? PRIZE_TIERS[tierIndex] : null };
}

export interface Win {
  draw: Draw;
  result: MatchResult & { tier: PrizeTier };
}

export interface Simulation {
  draws: number;
  cost: number;
  /** Cash prizes won (Free Play excluded). */
  cashWon: number;
  freePlays: number;
  /** Cash + Free Plays at $1 face value. */
  totalValue: number;
  /** totalValue − cost. */
  net: number;
  wins: Win[];
  /** Win count per PRIZE_TIERS index. */
  tierCounts: number[];
}

/**
 * Plays the same ticket on every draw. Free Plays are counted at their $1 face value
 * (the ticket you would otherwise have paid for the next night).
 */
export function simulate(ticket: Ticket, draws: readonly Draw[]): Simulation {
  const tierCounts = PRIZE_TIERS.map(() => 0);
  const wins: Win[] = [];
  let cashWon = 0;
  let freePlays = 0;
  for (const draw of draws) {
    const result = matchTicket(ticket, draw);
    if (!result.tier) continue;
    tierCounts[result.tierIndex]++;
    if (result.tier.freePlay) freePlays++;
    else cashWon += result.tier.prize;
    wins.push({ draw, result: result as Win['result'] });
  }
  const cost = draws.length * TICKET_PRICE;
  const totalValue = cashWon + freePlays * TICKET_PRICE;
  return { draws: draws.length, cost, cashWon, freePlays, totalValue, net: totalValue - cost, wins, tierCounts };
}

/** Returns an error message, or null if the ticket is a legal Cash Ball 225 play. */
export function validateTicket(t: { whites: (number | null)[]; cashBall: number | null }): string | null {
  const whites = t.whites.filter((w): w is number => w !== null && Number.isFinite(w));
  if (whites.length !== 4) return 'Pick 4 white balls.';
  if (whites.some((w) => !Number.isInteger(w) || w < 1 || w > 35)) return 'White balls must be between 1 and 35.';
  if (new Set(whites).size !== 4) return 'White balls must all be different.';
  if (t.cashBall === null || !Number.isInteger(t.cashBall) || t.cashBall < 1 || t.cashBall > 25) return 'Pick a Cash Ball between 1 and 25.';
  return null;
}
