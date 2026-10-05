import { useMemo, useState } from 'react';
import { Ball, DrawBalls, TierGlyph } from '../components/Ball';
import { Card, ErrorBox, Loading, PageHeader, Pager, StatTile } from '../components/ui';
import { useDraws } from '../lib/data';
import { fmtDate, fmtInt, fmtMoney, fmtNum, fmtShortDate, plural } from '../lib/format';
import { CASH_BALL_MAX, PRIZE_TIERS, WHITE_MAX, type Draw, tierLabel } from '../lib/game';
import { simulate, validateTicket } from '../lib/match';
import { ALL_TIER_ODDS, expectedValue } from '../lib/odds';
import { quickPick } from '../lib/random';

const PAGE_SIZE = 20;

/** Reads a ticket from "#/check?w=1,2,3,4&cb=5". */
function ticketFromHash(): { whites: number[]; cashBall: number | null } {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const whites = (q.get('w') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= WHITE_MAX);
  const cb = Number(q.get('cb'));
  return { whites: [...new Set(whites)].slice(0, 4).sort((a, b) => a - b), cashBall: Number.isInteger(cb) && cb >= 1 && cb <= CASH_BALL_MAX ? cb : null };
}

function PickerButton({ n, selected, cash, disabled, onClick }: { n: number; selected: boolean; cash?: boolean; disabled?: boolean; onClick: () => void }) {
  const on = cash ? 'bg-cash text-cash-ink shadow-none' : 'bg-accent text-white shadow-none';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${cash ? 'Cash Ball' : 'White ball'} ${n}`}
      className={`tabular flex aspect-square min-h-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
        selected ? on : 'bg-surface text-ink shadow-[inset_0_0_0_1.5px_var(--axis)] hover:bg-surface-2'
      } disabled:opacity-35`}
    >
      {n}
    </button>
  );
}

export function CheckPage() {
  const initial = useMemo(ticketFromHash, []);
  const [whites, setWhites] = useState<number[]>(initial.whites);
  const [cashBall, setCashBall] = useState<number | null>(initial.cashBall);
  const state = useDraws();

  const toggleWhite = (n: number) =>
    setWhites((w) => (w.includes(n) ? w.filter((x) => x !== n) : w.length < 4 ? [...w, n].sort((a, b) => a - b) : w));

  const error = validateTicket({ whites, cashBall });
  const ready = error === null;

  const lucky = () => {
    const p = quickPick();
    setWhites(p.whites);
    setCashBall(p.cashBall);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Check my numbers">
        See how one set of numbers would have done if you’d played it every night for the last five years.
      </PageHeader>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-h-9 items-center gap-1.5" aria-live="polite">
            {whites.map((w) => (
              <Ball key={w} n={w} size="md" />
            ))}
            {Array.from({ length: 4 - whites.length }, (_, i) => (
              <span key={i} className="h-9 w-9 rounded-full border-2 border-dashed border-line" />
            ))}
            <span className="w-1" />
            {cashBall ? <Ball n={cashBall} cash size="md" /> : <span className="h-9 w-9 rounded-full border-2 border-dashed border-cash/60" />}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={lucky} className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium text-ink hover:opacity-90">
            Random numbers
          </button>
          <button
            type="button"
            onClick={() => {
              setWhites([]);
              setCashBall(null);
            }}
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2"
          >
            Clear
          </button>
        </div>

        <h3 className="mt-5 text-sm font-medium text-ink">
          White balls <span className="text-muted">· pick 4 ({whites.length}/4)</span>
        </h3>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {Array.from({ length: WHITE_MAX }, (_, i) => i + 1).map((n) => (
            <PickerButton key={n} n={n} selected={whites.includes(n)} disabled={whites.length >= 4 && !whites.includes(n)} onClick={() => toggleWhite(n)} />
          ))}
        </div>

        <h3 className="mt-5 text-sm font-medium text-ink">
          Cash Ball <span className="text-muted">· pick 1</span>
        </h3>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {Array.from({ length: CASH_BALL_MAX }, (_, i) => i + 1).map((n) => (
            <PickerButton key={n} n={n} cash selected={cashBall === n} onClick={() => setCashBall(cashBall === n ? null : n)} />
          ))}
        </div>
        {!ready && (whites.length > 0 || cashBall) && <p className="mt-3 text-sm text-ink-2">{error}</p>}
      </Card>

      {ready &&
        (state.status === 'loading' ? (
          <Loading />
        ) : state.status === 'error' ? (
          <ErrorBox message={state.message} />
        ) : (
          <Results key={`${whites.join('-')}+${cashBall}`} whites={whites} cashBall={cashBall!} draws={state.data.draws} />
        ))}
    </div>
  );
}

function Results({ whites, cashBall, draws }: { whites: number[]; cashBall: number; draws: Draw[] }) {
  const sim = useMemo(() => simulate({ whites, cashBall }, draws), [whites, cashBall, draws]);
  const [page, setPage] = useState(0);
  const ev = expectedValue();
  const wins = useMemo(() => [...sim.wins].reverse(), [sim]);
  const pages = Math.ceil(wins.length / PAGE_SIZE);
  const shown = wins.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const mine = new Set(whites);
  const first = draws[0]?.date;
  const last = draws[draws.length - 1]?.date;

  return (
    <>
      <Card title="If you’d played these every night" subtitle={`${plural(sim.draws, 'draw')}, ${fmtShortDate(first)} – ${fmtShortDate(last)}, one $1 play each.`}>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Spent" value={fmtMoney(sim.cost)} />
          <StatTile label="Won" value={fmtMoney(sim.cashWon)} detail={sim.freePlays ? `+ ${plural(sim.freePlays, 'Free Play')}` : undefined} />
          <StatTile label="Winning nights" value={fmtInt(sim.wins.length)} detail={`1 in ${sim.wins.length ? fmtNum(sim.draws / sim.wins.length, 1) : '—'} draws`} />
          <StatTile
            label="Net (Free Plays at $1)"
            value={<span className={sim.net >= 0 ? 'text-good' : 'text-bad'}>{`${sim.net >= 0 ? '+' : '−'}${fmtMoney(Math.abs(sim.net))}`}</span>}
            detail={`${fmtNum((sim.totalValue / Math.max(1, sim.cost)) * 100, 1)}¢ back per $1`}
          />
        </div>
        <p className="mt-3 text-sm text-ink-2">
          For comparison, the math says a typical ticket returns about {fmtMoney(Math.round(ev.totalFace * sim.draws))} over {plural(sim.draws, 'play')}.
          Any set of numbers lands near that on average; the difference here is luck, not a property of the numbers.
        </p>
      </Card>

      <Card title="Wins by prize tier">
        <ul className="divide-y divide-line">
          {PRIZE_TIERS.map((t, i) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <span className="flex min-w-0 items-center gap-2.5">
                <TierGlyph whites={t.whites} cashBall={t.cashBall} />
                <span className="truncate text-sm text-ink">{tierLabel(t)}</span>
              </span>
              <span className="tabular shrink-0 text-right text-sm">
                <span className="font-semibold text-ink">{fmtInt(sim.tierCounts[i])}</span>
                <span className="text-muted"> × {t.prizeLabel}</span>
                <span className="block text-xs text-muted">expected {fmtNum(ALL_TIER_ODDS[i].probability * sim.draws, 1)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Winning draws" subtitle={sim.wins.length ? 'Newest first. Your matching numbers are highlighted.' : undefined}>
        {sim.wins.length === 0 ? (
          <p className="text-sm text-ink-2">These numbers wouldn’t have won anything in this period.</p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {shown.map((w) => (
                <li key={w.draw.date} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2.5 first:pt-0">
                  <div>
                    <div className="tabular text-xs text-ink-2">{fmtDate(w.draw.date)}</div>
                    <div className="mt-1">
                      <DrawBalls whites={w.draw.whites} cashBall={w.draw.cashBall} hitWhites={mine} hitCash={w.result.cashBallMatch} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-ink">{w.result.tier.prizeLabel}</div>
                    <div className="text-xs text-muted">{tierLabel(w.result.tier)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Pager page={page} pages={pages} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
