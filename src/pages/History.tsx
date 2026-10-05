import { useMemo, useState } from 'react';
import { DrawBalls } from '../components/Ball';
import { Card, ErrorBox, Loading, PageHeader, Pager } from '../components/ui';
import { useDraws } from '../lib/data';
import { fmtDate, fmtInt, fmtShortDate } from '../lib/format';
import type { Draw } from '../lib/game';

const PAGE_SIZE = 25;

type SortKey = 'date' | 'first' | 'last' | 'cash' | 'sum';
type Scope = 'any' | 'whites' | 'cash';

const SORTS: { id: SortKey; label: string; value: (d: Draw) => number | string }[] = [
  { id: 'date', label: 'Date', value: (d) => d.date },
  { id: 'first', label: 'Lowest white ball', value: (d) => d.whites[0] * 1e6 + d.whites[1] * 1e4 + d.whites[2] * 100 + d.whites[3] },
  { id: 'last', label: 'Highest white ball', value: (d) => d.whites[3] },
  { id: 'cash', label: 'Cash Ball', value: (d) => d.cashBall },
  { id: 'sum', label: 'Sum of whites', value: (d) => d.whites.reduce((a, b) => a + b, 0) },
];

interface Query {
  numbers: number[];
  dateParts: string[];
}

function parseQuery(q: string): Query {
  const numbers: number[] = [];
  const dateParts: string[] = [];
  for (const tok of q.toLowerCase().split(/[\s,]+/).filter(Boolean)) {
    if (/^\d{1,2}$/.test(tok)) numbers.push(Number(tok));
    else dateParts.push(tok);
  }
  return { numbers, dateParts };
}

function matches(d: Draw, q: Query, scope: Scope): boolean {
  for (const n of q.numbers) {
    const inWhites = d.whites.includes(n);
    const inCash = d.cashBall === n;
    if (scope === 'whites' ? !inWhites : scope === 'cash' ? !inCash : !inWhites && !inCash) return false;
  }
  if (q.dateParts.length) {
    const text = `${d.date} ${fmtDate(d.date)}`.toLowerCase();
    if (!q.dateParts.every((p) => text.includes(p))) return false;
  }
  return true;
}

export function HistoryPage() {
  const state = useDraws();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('any');
  const [sort, setSort] = useState<SortKey>('date');
  const [desc, setDesc] = useState(true);
  const [page, setPage] = useState(0);

  const draws = state.status === 'ready' ? state.data.draws : null;
  const rows = useMemo(() => {
    if (!draws) return [];
    const q = parseQuery(query);
    const value = SORTS.find((s) => s.id === sort)!.value;
    const filtered = draws.filter((d) => matches(d, q, scope));
    return filtered.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const c = va < vb ? -1 : va > vb ? 1 : a.date.localeCompare(b.date);
      return desc ? -c : c;
    });
  }, [draws, query, scope, sort, desc]);

  const update = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorBox message={state.message} />;

  const { data } = state;
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const shown = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const scopeBtn = (id: Scope, label: string) => (
    <button
      type="button"
      onClick={() => update(setScope)(id)}
      aria-pressed={scope === id}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${scope === id ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--ring)]' : 'text-ink-2'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Draw history">
        {fmtInt(data.count)} draws from {fmtShortDate(data.window.start)} to {fmtShortDate(data.window.end)}.
      </PageHeader>

      <Card>
        <label className="block text-sm font-medium text-ink" htmlFor="history-search">
          Search
        </label>
        <input
          id="history-search"
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => update(setQuery)(e.target.value)}
          placeholder="Numbers (7 21) or a date (2024-05, Oct 3)"
          className="mt-1.5 w-full rounded-lg bg-surface-2 px-3 py-2.5 text-base text-ink placeholder:text-muted focus:outline-2 focus:outline-accent"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-surface-2 p-1" role="group" aria-label="Numbers must appear in">
            {scopeBtn('any', 'Any ball')}
            {scopeBtn('whites', 'Whites')}
            {scopeBtn('cash', 'Cash Ball')}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="history-sort" className="text-sm text-ink-2">
              Sort
            </label>
            <select
              id="history-sort"
              value={sort}
              onChange={(e) => update(setSort)(e.target.value as SortKey)}
              className="rounded-lg bg-surface-2 px-2 py-2 text-sm text-ink"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => update(setDesc)(!desc)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-ink"
              aria-label={desc ? 'Descending, tap for ascending' : 'Ascending, tap for descending'}
              title={desc ? 'Descending' : 'Ascending'}
            >
              {desc ? '↓' : '↑'}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-2 text-xs text-muted" aria-live="polite">
          {rows.length === 0
            ? 'No draws match.'
            : `Showing ${fmtInt(page * PAGE_SIZE + 1)}–${fmtInt(Math.min(rows.length, (page + 1) * PAGE_SIZE))} of ${fmtInt(rows.length)}`}
        </div>
        {rows.length > 0 && (
          <table className="tabular w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Numbers</th>
                <th className="pb-2 text-right font-medium">Sum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((d) => (
                <tr key={d.date}>
                  <td className="py-2 pr-2 align-middle text-xs whitespace-nowrap text-ink-2">
                    {fmtDate(d.date)}
                    {d.winners && d.winners[0] > 0 && <span className="mt-0.5 block font-medium text-ink">Jackpot hit</span>}
                  </td>
                  <td className="py-2 align-middle">
                    <DrawBalls whites={d.whites} cashBall={d.cashBall} size="xs" />
                  </td>
                  <td className="py-2 text-right align-middle text-ink-2">{d.whites.reduce((a, b) => a + b, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pager page={page} pages={pages} onPage={setPage} />
      </Card>

      {data.missingDates.length > 0 && (
        <p className="text-xs text-muted">
          No published result found for: {data.missingDates.map(fmtShortDate).join(', ')}. These dates are left out rather than guessed.
        </p>
      )}
      <p className="text-xs text-muted">
        Sources:{' '}
        {data.sources.map((s, i) => (
          <span key={s.name}>
            {i > 0 && '; '}
            {s.name} ({fmtInt(s.draws)} draws, {s.role.toLowerCase()})
          </span>
        ))}
        . Updated {fmtShortDate(data.generatedAt.slice(0, 10))}.
      </p>
    </div>
  );
}
