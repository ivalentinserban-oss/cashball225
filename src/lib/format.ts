const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat('en-US', opts);

export const fmtInt = (n: number) => nf({ maximumFractionDigits: 0 }).format(n);

export const fmtNum = (n: number, digits = 1) => nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

/** "1 in X" figure: whole numbers above 100, two decimals below. */
export const fmtOneIn = (x: number) => (x >= 100 ? fmtInt(x) : fmtNum(x, 2));

/** Percent with enough significant digits for tiny probabilities. */
export function fmtPct(p: number): string {
  const pct = p * 100;
  if (pct === 0) return '0%';
  if (pct >= 1) return `${fmtNum(pct, 2)}%`;
  return `${nf({ maximumSignificantDigits: 3 }).format(pct)}%`;
}

export function fmtMoney(n: number): string {
  const cents = Math.abs(n) < 100 && !Number.isInteger(n);
  return nf({ style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(n);
}

export const fmtCents = (dollars: number) => `${fmtNum(dollars * 100, 1)}¢`;

const dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const shortDateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** Formats a YYYY-MM-DD draw date without shifting it through the local time zone. */
export const fmtDate = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));
export const fmtShortDate = (iso: string) => shortDateFmt.format(new Date(`${iso}T00:00:00Z`));

export const plural = (n: number, one: string, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`;
