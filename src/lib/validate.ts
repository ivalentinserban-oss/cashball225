import { CASH_BALL_MAX, WHITE_MAX, WHITE_PICKS } from './game';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n);
}

export function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Returns a list of problems with a draw row; empty means valid. */
export function validateDrawRow(row: { date: string; whites: number[]; cashBall: number }): string[] {
  const errors: string[] = [];
  if (!isValidIsoDate(row.date)) errors.push(`invalid date "${row.date}"`);
  if (!Array.isArray(row.whites) || row.whites.length !== WHITE_PICKS) {
    errors.push(`expected ${WHITE_PICKS} white balls, got ${Array.isArray(row.whites) ? row.whites.length : 'none'}`);
  } else {
    for (const w of row.whites) {
      if (!isInt(w) || w < 1 || w > WHITE_MAX) errors.push(`white ball ${w} outside 1–${WHITE_MAX}`);
    }
    if (new Set(row.whites).size !== row.whites.length) errors.push(`repeated white ball in [${row.whites.join(', ')}]`);
  }
  if (!isInt(row.cashBall) || row.cashBall < 1 || row.cashBall > CASH_BALL_MAX) {
    errors.push(`Cash Ball ${row.cashBall} outside 1–${CASH_BALL_MAX}`);
  }
  return errors;
}

/** Inclusive list of YYYY-MM-DD dates between start and end. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const stop = new Date(`${end}T00:00:00Z`).getTime();
  while (d.getTime() <= stop) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Same calendar day `years` earlier (Feb 29 falls back to Feb 28). */
export function minusYears(date: string, years: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y - years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}
