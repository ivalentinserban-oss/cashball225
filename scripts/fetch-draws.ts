/**
 * Collects every Cash Ball 225 drawing for the last N years (default 5) and writes data/draws.json.
 *
 * Sources, in priority order:
 *   1. Kentucky Lottery official past-results endpoint (the JSON behind kylottery.com/apps/draw_games/pastwinning.html).
 *      The official site only exposes the most recent ~180 days.
 *   2. lottery.net year archive pages (https://www.lottery.net/kentucky/cash-ball/numbers/<year>) for everything older.
 *      Where both sources cover a date, they are cross-checked and any mismatch is reported.
 *   3. lottery.net per-draw payout pages, for Kentucky winner counts per prize tier (cached in data/payouts.json,
 *      so each draw is fetched once).
 *
 * Re-runnable: by default only fetches what is missing. Every request respects robots.txt and is rate limited.
 *
 * Usage: npm run fetch-draws -- [--full] [--years=5] [--no-payouts] [--max-payouts=N] [--retry-payouts]
 * Exit code 2 if any row fails validation or sources conflict on the same date.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { GAME_NAME, PRIZE_TIERS, type Draw, type Whites } from '../src/lib/game';
import { addDays, dateRange, minusYears, validateDrawRow } from '../src/lib/validate';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAWS_FILE = path.join(ROOT, 'data', 'draws.json');
const PAYOUTS_FILE = path.join(ROOT, 'data', 'payouts.json');

const USER_AGENT =
  'Mozilla/5.0 (compatible; CashBall225Stats/1.0; personal non-commercial statistics; one request per 1.5s)';
const MIN_DELAY_MS = 1500;

const OFFICIAL_ENDPOINT = 'https://www.kylottery.com/webhandlers/WinningNumbers.xhtml';
const OFFICIAL_PAGE = 'https://www.kylottery.com/apps/draw_games/pastwinning.html?game=13';
const ARCHIVE_BASE = 'https://www.lottery.net/kentucky/cash-ball/numbers';

// ---------------------------------------------------------------------------------------------- args

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string, fallback: number) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};
const FULL = flag('full');
const YEARS = option('years', 5);
const FETCH_PAYOUTS = !flag('no-payouts');
const MAX_PAYOUTS = option('max-payouts', Infinity);
const RETRY_PAYOUTS = flag('retry-payouts');

// ------------------------------------------------------------------------------------------- helpers

const etDate = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(ms),
  );

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...m: unknown[]) => console.log(...m);

const lastRequestAt = new Map<string, number>();
const robotsCache = new Map<string, { allow: string[]; disallow: string[] }>();

async function throttle(host: string) {
  const wait = (lastRequestAt.get(host) ?? 0) + MIN_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(host, Date.now());
}

/** Minimal robots.txt support: rules for `User-agent: *`, longest match wins, Allow beats Disallow on ties. */
async function robotsAllows(url: URL): Promise<boolean> {
  let rules = robotsCache.get(url.host);
  if (!rules) {
    rules = { allow: [], disallow: [] };
    await throttle(url.host);
    const res = await fetch(`${url.protocol}//${url.host}/robots.txt`, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) {
      let applies = false;
      let sawRule = false;
      for (const raw of (await res.text()).split(/\r?\n/)) {
        const line = raw.replace(/#.*/, '').trim();
        const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
        if (!m) continue;
        const [, key, value] = m;
        const k = key.toLowerCase();
        if (k === 'user-agent') {
          if (sawRule) {
            applies = false;
            sawRule = false;
          }
          if (value.trim() === '*') applies = true;
        } else if (k === 'allow' || k === 'disallow') {
          sawRule = true;
          if (applies && value) (k === 'allow' ? rules.allow : rules.disallow).push(value.trim());
        }
      }
    }
    robotsCache.set(url.host, rules);
  }
  const p = url.pathname + url.search;
  const longest = (list: string[]) => Math.max(-1, ...list.filter((r) => p.startsWith(r)).map((r) => r.length));
  return longest(rules.allow) >= longest(rules.disallow);
}

async function politeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const u = new URL(url);
  if (!(await robotsAllows(u))) throw new Error(`robots.txt disallows ${url}`);
  for (let attempt = 1; ; attempt++) {
    await throttle(u.host);
    const res = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) } });
    if (res.ok || attempt >= 3 || (res.status < 500 && res.status !== 429)) return res;
    const retryAfter = Number(res.headers.get('retry-after'));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000 * attempt ** 2;
    log(`  ${res.status} from ${u.host}, retrying in ${Math.round(backoff / 1000)}s`);
    await sleep(backoff);
  }
}

interface RawRow {
  date: string;
  whites: number[];
  cashBall: number;
  source: string;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function parseLongDate(text: string): string | null {
  // "December 31, 2025"
  const m = text.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

// ------------------------------------------------------------------------------------------- sources

async function fetchOfficial(): Promise<RawRow[]> {
  const res = await politeFetch(OFFICIAL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Referer: OFFICIAL_PAGE },
    body: JSON.stringify({ gameNumber: '13', infoRequest: '11' }),
  });
  if (!res.ok) throw new Error(`official endpoint returned HTTP ${res.status}`);
  const json = (await res.json()) as {
    DRAW_HISTORY?: { DRAW_DATE: number; DRAW_VALUES: { DRAW_NUMBER_POSITION: number; DRAW_VALUE: number }[]; SPECIAL_ARGS?: { CASHBALL?: number } }[];
  };
  if (!Array.isArray(json.DRAW_HISTORY)) throw new Error('official endpoint: unexpected response shape');
  return json.DRAW_HISTORY.map((d) => ({
    date: etDate(d.DRAW_DATE),
    whites: [...d.DRAW_VALUES].sort((a, b) => a.DRAW_NUMBER_POSITION - b.DRAW_NUMBER_POSITION).map((v) => Number(v.DRAW_VALUE)),
    cashBall: Number(d.SPECIAL_ARGS?.CASHBALL),
    source: 'kylottery.com',
  }));
}

async function fetchArchiveYear(year: number): Promise<RawRow[]> {
  const res = await politeFetch(`${ARCHIVE_BASE}/${year}`);
  if (!res.ok) throw new Error(`lottery.net ${year} returned HTTP ${res.status}`);
  const root = parse(await res.text());
  const rows: RawRow[] = [];
  for (const tr of root.querySelectorAll('tr')) {
    const dateCell = tr.querySelector('td.colour');
    if (!dateCell) continue;
    const date = parseLongDate(dateCell.text);
    const balls = tr.querySelectorAll('li.ball');
    if (!date || balls.length === 0) {
      rows.push({ date: date ?? `unparsed:${dateCell.text.trim()}`, whites: [], cashBall: NaN, source: 'lottery.net' });
      continue;
    }
    const num = (el: { text: string }) => Number(el.text.trim());
    rows.push({
      date,
      whites: balls.filter((b) => !b.classList.contains('cash-ball')).map(num),
      cashBall: num(balls.find((b) => b.classList.contains('cash-ball')) ?? { text: 'NaN' }),
      source: 'lottery.net',
    });
  }
  return rows;
}

type PayoutEntry = { winners: number[]; ezMatch?: number; total?: number; fetchedAt: string } | { unavailable: true; fetchedAt: string; reason?: string };

/** Payouts can lag the draw by a day or two; an empty table older than this is treated as permanently missing. */
const PAYOUT_GRACE_DAYS = 7;

const TIER_PATTERNS: RegExp[] = PRIZE_TIERS.map((t) => new RegExp(`^Match ${t.whites}${t.cashBall ? ' \\+ Cash Ball' : ''}$`, 'i'));

async function fetchPayout(date: string): Promise<PayoutEntry | null> {
  const [y, m, d] = date.split('-');
  const res = await politeFetch(`${ARCHIVE_BASE}/${m}-${d}-${y}`);
  const fetchedAt = new Date().toISOString();
  if (res.status === 404) return { unavailable: true, fetchedAt, reason: 'page not found' };
  if (!res.ok) throw new Error(`payout page ${date} returned HTTP ${res.status}`);
  const root = parse(await res.text());
  const winners: (number | undefined)[] = new Array(PRIZE_TIERS.length).fill(undefined);
  let ezMatch: number | undefined;
  let total: number | undefined;
  for (const tr of root.querySelectorAll('table tr')) {
    const cells = tr.querySelectorAll('td').map((c) => c.text.replace(/\s+/g, ' ').trim());
    if (cells.length < 3) continue;
    const count = Number(cells[cells.length - 1].replace(/,/g, ''));
    if (!Number.isFinite(count)) continue;
    const idx = TIER_PATTERNS.findIndex((re) => re.test(cells[0]));
    if (idx >= 0) winners[idx] = count;
    else if (/^EZ ?Match/i.test(cells[0])) ezMatch = count;
    else if (/^Totals?/i.test(cells[0])) total = count;
  }
  if (winners.some((w) => w === undefined) || !total) {
    // Recent draws may not have payouts posted yet (retry next run). lottery.net has no breakdowns for
    // draws before Feb 22, 2024, so an old empty table is recorded once instead of refetched every night.
    const old = date < addDays(etDate(Date.now()), -PAYOUT_GRACE_DAYS);
    return old ? { unavailable: true, fetchedAt, reason: 'no prize breakdown published' } : null;
  }
  return { winners: winners as number[], ezMatch, total, fetchedAt };
}

// ---------------------------------------------------------------------------------------------- main

interface DrawsFile {
  game: string;
  generatedAt: string;
  window: { start: string; end: string; years: number };
  expectedDraws: number;
  count: number;
  missingDates: string[];
  discrepancies: { date: string; kylottery: string; lotteryNet: string }[];
  invalidRows: { date: string; source: string; errors: string[] }[];
  payoutCoverage: number;
  sources: { name: string; url: string; role: string; draws: number }[];
  draws: Draw[];
}

const fmt = (r: { whites: number[]; cashBall: number }) => `${[...r.whites].sort((a, b) => a - b).join('-')} CB ${r.cashBall}`;

async function readJson<T>(file: string): Promise<T | null> {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

/** Pretty JSON with one draw per line so nightly diffs stay readable. */
function serialize(file: DrawsFile): string {
  const { draws, ...meta } = file;
  const head = JSON.stringify(meta, null, 2).replace(/\n}$/, '');
  return `${head},\n  "draws": [\n${draws.map((d) => `    ${JSON.stringify(d)}`).join(',\n')}\n  ]\n}\n`;
}

async function atomicWrite(file: string, content: string) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(`${file}.tmp`, content);
  await rename(`${file}.tmp`, file);
}

async function main() {
  const now = Date.now();
  const todayET = etDate(now);
  const start = minusYears(todayET, YEARS);
  log(`${GAME_NAME}: collecting draws from ${start} to ${todayET} (ET)`);

  const existing = FULL ? null : await readJson<DrawsFile>(DRAWS_FILE);
  const known = new Map<string, RawRow>();
  for (const d of existing?.draws ?? []) if (d.date >= start) known.set(d.date, d);

  const invalidRows: DrawsFile['invalidRows'] = [];
  const discrepancies: DrawsFile['discrepancies'] = [];
  const conflicts: string[] = [];

  /** Validate and de-duplicate rows from one source fetch. */
  const clean = (rows: RawRow[]) => {
    const byDate = new Map<string, RawRow>();
    for (const r of rows) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date < start) continue; // outside the window
      const errors = validateDrawRow(r);
      if (errors.length) {
        invalidRows.push({ date: r.date, source: r.source, errors });
        continue;
      }
      const row = { ...r, whites: [...r.whites].sort((a, b) => a - b) };
      const dup = byDate.get(r.date);
      if (dup && fmt(dup) !== fmt(row)) conflicts.push(`${r.date}: ${r.source} lists two different results (${fmt(dup)} / ${fmt(row)})`);
      byDate.set(r.date, row);
    }
    return byDate;
  };

  // 1. Official (recent ~180 days)
  let official = new Map<string, RawRow>();
  try {
    official = clean(await fetchOfficial());
    const dates = [...official.keys()].sort();
    log(`kylottery.com: ${official.size} draws (${dates[0]} → ${dates[dates.length - 1]})`);
  } catch (e) {
    log(`kylottery.com unavailable (${(e as Error).message}); falling back to lottery.net for recent draws`);
  }

  // Expected window end: the newest draw anybody reports, but never earlier than yesterday ET.
  const newest = [...official.keys(), ...known.keys()].sort().pop() ?? '';
  let end = newest > addDays(todayET, -1) ? newest : addDays(todayET, -1);

  // 2. Archive years: everything on --full, otherwise only years with dates we still lack
  //    (always including the current year, which is how new draws arrive when the official site is down).
  const needed = dateRange(start, end).filter((d) => !official.has(d) && !known.has(d));
  const years = new Set<number>(needed.map((d) => Number(d.slice(0, 4))));
  if (FULL) for (let y = Number(start.slice(0, 4)); y <= Number(todayET.slice(0, 4)); y++) years.add(y);
  if (official.size === 0) years.add(Number(todayET.slice(0, 4)));

  const archive = new Map<string, RawRow>();
  for (const year of [...years].sort()) {
    try {
      const rows = clean(await fetchArchiveYear(year));
      rows.forEach((r, d) => archive.set(d, r));
      log(`lottery.net ${year}: ${rows.size} draws`);
    } catch (e) {
      log(`lottery.net ${year} failed: ${(e as Error).message}`);
    }
  }
  const archiveNewest = [...archive.keys()].sort().pop() ?? '';
  if (archiveNewest > end) end = archiveNewest;

  // 3. Merge with cross-checks. Priority: official > archive > previously saved.
  const merged = new Map<string, RawRow>();
  for (const date of dateRange(start, end)) {
    const o = official.get(date);
    const a = archive.get(date);
    const k = known.get(date);
    if (o && a && fmt(o) !== fmt(a)) discrepancies.push({ date, kylottery: fmt(o), lotteryNet: fmt(a) });
    const pick = o ?? a ?? k;
    if (k && pick && pick !== k && fmt(k) !== fmt(pick)) conflicts.push(`${date}: saved result ${fmt(k)} now reported as ${fmt(pick)} by ${pick.source}`);
    if (pick) merged.set(date, pick);
  }
  const allDates = dateRange(start, end);
  const missingDates = allDates.filter((d) => !merged.has(d));

  // 4. Payouts (winner counts per tier), cached per draw.
  const payouts = (await readJson<Record<string, PayoutEntry>>(PAYOUTS_FILE)) ?? {};
  for (const d of Object.keys(payouts)) if (d < start) delete payouts[d];
  if (FETCH_PAYOUTS) {
    const todo = [...merged.keys()]
      .filter((d) => !payouts[d] || (RETRY_PAYOUTS && 'unavailable' in payouts[d]))
      .sort()
      .reverse()
      .slice(0, MAX_PAYOUTS);
    if (todo.length) log(`Fetching payout pages for ${todo.length} draws (~${Math.ceil((todo.length * MIN_DELAY_MS) / 60000)} min)…`);
    let done = 0;
    for (const date of todo) {
      try {
        const p = await fetchPayout(date);
        if (p) payouts[date] = p;
      } catch (e) {
        log(`  payout ${date} failed: ${(e as Error).message}`);
      }
      if (++done % 50 === 0) {
        log(`  ${done}/${todo.length} payout pages`);
        await atomicWrite(PAYOUTS_FILE, `${JSON.stringify(sortKeys(payouts), null, 0)}\n`);
      }
    }
    await atomicWrite(PAYOUTS_FILE, `${JSON.stringify(sortKeys(payouts), null, 0)}\n`);
  }

  const draws: Draw[] = [...merged.values()]
    .sort((x, y) => x.date.localeCompare(y.date))
    .map((r) => {
      const p = payouts[r.date];
      const draw: Draw = { date: r.date, whites: r.whites as Whites, cashBall: r.cashBall, source: r.source };
      if (p && 'winners' in p) draw.winners = p.winners;
      return draw;
    });

  const count = (src: string) => draws.filter((d) => d.source === src).length;
  const out: DrawsFile = {
    game: GAME_NAME,
    generatedAt: new Date(now).toISOString(),
    window: { start, end, years: YEARS },
    expectedDraws: allDates.length,
    count: draws.length,
    missingDates,
    discrepancies,
    invalidRows,
    payoutCoverage: draws.filter((d) => d.winners).length,
    sources: [
      { name: 'Kentucky Lottery (official)', url: OFFICIAL_PAGE, role: 'Winning numbers for the most recent ~180 days', draws: count('kylottery.com') },
      { name: 'lottery.net archive', url: `${ARCHIVE_BASE}/<year>`, role: 'Winning numbers older than the official 180-day window; per-draw winner counts', draws: count('lottery.net') },
    ],
    draws,
  };
  // Keep the old timestamp when nothing else changed, so the nightly job doesn't commit no-op updates.
  const unchanged = existing && serialize({ ...out, generatedAt: existing.generatedAt }) === serialize(existing);
  if (unchanged) out.generatedAt = existing.generatedAt;
  else await atomicWrite(DRAWS_FILE, serialize(out));

  // 5. Report
  log('');
  log(unchanged ? `No changes to ${path.relative(ROOT, DRAWS_FILE)}` : `Saved ${path.relative(ROOT, DRAWS_FILE)}`);
  log(`  Draws:          ${out.count} of ${out.expectedDraws} expected`);
  log(`  Date range:     ${draws[0]?.date} → ${draws[draws.length - 1]?.date}`);
  log(`  Sources:        kylottery.com ${count('kylottery.com')}, lottery.net ${count('lottery.net')}`);
  log(`  Missing dates:  ${missingDates.length ? missingDates.join(', ') : 'none'}`);
  log(`  Cross-check:    ${discrepancies.length ? `${discrepancies.length} mismatches` : 'official and archive agree on every overlapping date'}`);
  for (const d of discrepancies) log(`    ${d.date}: kylottery.com ${d.kylottery} vs lottery.net ${d.lotteryNet}`);
  log(`  Invalid rows:   ${invalidRows.length || 'none'}`);
  for (const r of invalidRows) log(`    ${r.date} (${r.source}): ${r.errors.join('; ')}`);
  log(`  Payout data:    ${out.payoutCoverage} of ${out.count} draws`);
  if (conflicts.length) {
    log(`  Conflicts:      ${conflicts.length}`);
    for (const c of conflicts) log(`    ${c}`);
  }

  if (invalidRows.length || conflicts.length) process.exitCode = 2;

  // Draws happen every night; if the newest one is several days old, the sources have likely changed or blocked us.
  const newestDraw = draws[draws.length - 1]?.date ?? '';
  if (newestDraw < addDays(todayET, -3)) {
    log(`  STALE: newest draw is ${newestDraw || 'none'}; no new results for 3+ days. Check the sources.`);
    process.exitCode = 3;
  }
}

function sortKeys<T>(o: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
