import { useMemo, useState, type ReactNode } from 'react';
import { Ball } from '../components/Ball';
import { PickList, Segmented } from '../components/PickList';
import { Card, ErrorBox, IndependenceNote, Loading, PageHeader } from '../components/ui';
import { useDraws } from '../lib/data';
import { fmtInt, fmtNum, fmtShortDate } from '../lib/format';
import { hotCashBalls, hotWhites, type HotNumber } from '../lib/hot';
import { TOTAL_COMBOS } from '../lib/odds';
import { pickFromPools, type QuickPick } from '../lib/random';

const WINDOWS = [50, 100, 365, 0] as const;
const WHITE_POOLS = [6, 8, 10, 12] as const;
const CASH_POOLS = [1, 3, 5] as const;
const COUNTS = [1, 5, 10] as const;

const windowLabel = (w: number) => (w === 0 ? 'All' : String(w));

export function HotNumbersPage() {
  const state = useDraws();
  const [span, setSpan] = useState<(typeof WINDOWS)[number]>(100);
  const [whitePool, setWhitePool] = useState<(typeof WHITE_POOLS)[number]>(8);
  const [cashPool, setCashPool] = useState<(typeof CASH_POOLS)[number]>(3);
  const [count, setCount] = useState<(typeof COUNTS)[number]>(5);
  const [picks, setPicks] = useState<QuickPick[]>([]);

  const draws = state.status === 'ready' ? state.data.draws : null;
  const ranked = useMemo(() => (draws ? { whites: hotWhites(draws, span), cash: hotCashBalls(draws, span) } : null), [draws, span]);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorBox message={state.message} />;

  const { whites, cash } = ranked!;
  const hotW = whites.slice(0, whitePool);
  const hotC = cash.slice(0, cashPool);
  const used = span === 0 ? draws!.length : Math.min(span, draws!.length);
  const since = draws![draws!.length - used].date;

  const generate = () => {
    const w = hotW.map((h) => h.number);
    const c = hotC.map((h) => h.number);
    setPicks(Array.from({ length: count }, () => pickFromPools(w, c)));
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Hot numbers">Generate picks from the numbers drawn most often lately.</PageHeader>

      <IndependenceNote>
        A number that came up a lot recently is no more likely to come up next. A ticket built from hot numbers has the same 1 in{' '}
        {fmtInt(TOTAL_COMBOS)} jackpot odds as any other ticket; this is just a fun way to choose.
      </IndependenceNote>

      <Card>
        <div className="space-y-3">
          <Control label="Look at the last">
            <Segmented options={WINDOWS} value={span} onChange={setSpan} label="Draws to look at" format={windowLabel} />
            <span className="text-sm text-ink-2">draws</span>
          </Control>
          <Control label="Pick from the top">
            <Segmented options={WHITE_POOLS} value={whitePool} onChange={setWhitePool} label="White balls to pick from" />
            <span className="text-sm text-ink-2">white balls</span>
          </Control>
          <Control label="and the top">
            <Segmented options={CASH_POOLS} value={cashPool} onChange={setCashPool} label="Cash Balls to pick from" />
            <span className="text-sm text-ink-2">Cash Ball{cashPool === 1 ? '' : 's'}</span>
          </Control>
        </div>
        <p className="mt-3 text-xs text-muted">
          {fmtInt(used)} draws since {fmtShortDate(since)}. Ties go to the number drawn more recently.
        </p>
      </Card>

      <Card title="Hot white balls" subtitle={`An average number came up ${fmtNum(whites[0].expected, 1)} times in this stretch.`}>
        <HotRow items={hotW} />
      </Card>

      <Card title="Hot Cash Balls" subtitle={`An average Cash Ball came up ${fmtNum(cash[0].expected, 1)} times.`}>
        <HotRow items={hotC} cash />
      </Card>

      <Card title="Generate hot picks" subtitle={`4 different white balls from the top ${whitePool}, and a Cash Ball from the top ${cashPool}, chosen at random.`}>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented options={COUNTS} value={count} onChange={setCount} label="How many plays" />
          <button type="button" onClick={generate} className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:flex-none">
            Generate {count === 1 ? 'a pick' : `${count} picks`}
          </button>
        </div>
        <PickList key={picks.map((p) => p.whites.join('-') + p.cashBall).join()} picks={picks} />
      </Card>
    </div>
  );
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-32 text-sm text-ink">{label}</span>
      {children}
    </div>
  );
}

function HotRow({ items, cash = false }: { items: HotNumber[]; cash?: boolean }) {
  return (
    <ol className="flex flex-wrap gap-x-3 gap-y-3">
      {items.map((h) => (
        <li key={h.number} className="flex w-10 flex-col items-center gap-1">
          <Ball n={h.number} cash={cash} size="md" />
          <span className="tabular text-xs text-ink-2">×{h.count}</span>
        </li>
      ))}
    </ol>
  );
}
