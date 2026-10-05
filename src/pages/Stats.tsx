import { useMemo } from 'react';
import { Ball } from '../components/Ball';
import { DataTable, DistributionChart, FrequencyChart, Legend } from '../components/Charts';
import { Card, ErrorBox, IndependenceNote, Loading, PageHeader, StatTile } from '../components/ui';
import { chiSquareUniform, type ChiSquareResult } from '../lib/chisq';
import { useDraws } from '../lib/data';
import { fmtInt, fmtNum, fmtShortDate } from '../lib/format';
import { CASH_BALL_MAX, WHITE_MAX, type Draw } from '../lib/game';
import {
  EXPECTED_MEAN_SUM,
  LOW_MAX,
  cashBallFrequencies,
  expectedPairCount,
  gapStats,
  highLowSplit,
  meanSum,
  oddEvenSplit,
  pairCounts,
  sumDistribution,
  whiteFrequencies,
  type GapStats,
  type NumberFrequency,
} from '../lib/stats';

const toRows = (f: NumberFrequency[], prefix: string) => f.map((x) => ({ key: x.number, label: `${prefix} ${x.number}`, count: x.count, expected: x.expected }));

function computeStats(draws: Draw[]) {
  const whites = whiteFrequencies(draws);
  const cash = cashBallFrequencies(draws);
  const pairs = pairCounts(draws).sort((a, b) => b.count - a.count || a.a - b.a || a.b - b.b);
  return {
    whites,
    cash,
    whiteChi: chiSquareUniform(whites.map((w) => w.count), 4),
    cashChi: chiSquareUniform(cash.map((c) => c.count)),
    whiteGaps: gapStats(draws, WHITE_MAX, (d) => d.whites),
    cashGaps: gapStats(draws, CASH_BALL_MAX, (d) => [d.cashBall]),
    pairs,
    pairExpected: expectedPairCount(draws.length),
    oddEven: oddEvenSplit(draws),
    highLow: highLowSplit(draws),
    sums: sumDistribution(draws, 5),
    meanSum: meanSum(draws),
  };
}

export default function StatsPage() {
  const state = useDraws();
  const stats = useMemo(() => (state.status === 'ready' ? computeStats(state.data.draws) : null), [state]);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorBox message={state.message} />;
  const { data } = state;
  const s = stats!;
  const n = data.draws.length;

  const sortedWhites = [...s.whites].sort((a, b) => b.count - a.count || a.number - b.number);
  const sortedCash = [...s.cash].sort((a, b) => b.count - a.count || a.number - b.number);

  return (
    <div className="space-y-4">
      <PageHeader title="Five years of draws">
        What actually came out of the machines from {fmtShortDate(data.window.start)} to {fmtShortDate(data.window.end)}.
      </PageHeader>

      <IndependenceNote />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Draws" value={fmtInt(n)} detail={`of ${fmtInt(data.expectedDraws)} nights`} />
        <StatTile label="White balls" value={fmtInt(n * 4)} detail="drawn in total" />
        <StatTile label="Missing" value={fmtInt(data.missingDates.length)} detail={data.missingDates.length ? data.missingDates.map(fmtShortDate).join(', ') : 'none'} />
      </div>

      <Card title="White balls (1–35)" subtitle={`Each number should come up about ${fmtNum(s.whites[0].expected, 1)} times in ${fmtInt(n)} draws.`}>
        <Legend />
        <FrequencyChart rows={toRows(s.whites, 'White ball')} expected={s.whites[0].expected} ticks={[1, 5, 10, 15, 20, 25, 30, 35]} name="white ball" />
        <ExtremeRow label="Most drawn" items={sortedWhites.slice(0, 5)} />
        <ExtremeRow label="Least drawn" items={sortedWhites.slice(-5).reverse()} />
        <DataTable rows={toRows(s.whites, 'Ball')} first="Ball" />
      </Card>

      <Card title="Cash Ball (1–25)" subtitle={`Each number should come up about ${fmtNum(s.cash[0].expected, 1)} times.`}>
        <Legend />
        <FrequencyChart rows={toRows(s.cash, 'Cash Ball')} expected={s.cash[0].expected} ticks={[1, 5, 10, 15, 20, 25]} name="Cash Ball number" />
        <ExtremeRow label="Most drawn" items={sortedCash.slice(0, 3)} cash />
        <ExtremeRow label="Least drawn" items={sortedCash.slice(-3).reverse()} cash />
        <DataTable rows={toRows(s.cash, 'Cash Ball')} first="Cash Ball" />
      </Card>

      <Card title="Is the draw random?" subtitle="A chi-square goodness-of-fit test asks: are these counts further from “perfectly even” than chance would usually produce?">
        <div className="space-y-4">
          <ChiResult name="White balls" result={s.whiteChi} />
          <ChiResult name="Cash Ball" result={s.cashChi} />
        </div>
        <p className="mt-4 text-xs text-muted">
          The white-ball statistic is scaled by 34/31 because four different balls come out of the same machine each night, which makes the
          counts a little steadier than independent picks. Without that adjustment the test would be slightly too lenient. A p-value is the
          chance that a fair machine produces counts at least this uneven; below 0.05 is the usual “worth a second look” line, and about 1 in
          20 fair tests land there by luck alone.
        </p>
      </Card>

      <Card title="Longest gaps" subtitle="Draws in a row a number didn’t appear. Long gaps are normal and don’t make a number “due”.">
        <div className="grid gap-5 sm:grid-cols-2">
          <GapTable title="White balls" gaps={s.whiteGaps} typical={WHITE_MAX / 4} />
          <GapTable title="Cash Ball" gaps={s.cashGaps} typical={CASH_BALL_MAX} cash />
        </div>
      </Card>

      <Card title="Most common pairs" subtitle={`Two white balls drawn together. Any specific pair should appear about ${fmtNum(s.pairExpected, 1)} times.`}>
        <ol className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {s.pairs.slice(0, 10).map((p, i) => (
            <li key={`${p.a}-${p.b}`} className="flex items-center justify-between border-b border-line py-2">
              <span className="flex items-center gap-2">
                <span className="tabular w-4 text-right text-xs text-muted">{i + 1}</span>
                <Ball n={p.a} />
                <Ball n={p.b} />
              </span>
              <span className="tabular text-sm">
                <span className="font-semibold text-ink">{p.count}</span>
                <span className="text-muted"> times</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-ink-2">
          With {fmtInt(s.pairs.length)} possible pairs, a handful will always land well above average by chance; the busiest pair here appeared{' '}
          {s.pairs[0].count} times. At the other end, {fmtInt(s.pairs.filter((p) => p.count <= Math.floor(s.pairExpected / 2)).length)} pairs showed
          up {Math.floor(s.pairExpected / 2)} times or fewer, and the rarest only {s.pairs[s.pairs.length - 1].count}.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Odd / even" subtitle="How many of the 4 whites were odd (18 of the 35 numbers are odd).">
          <Legend observed="Draws" />
          <DistributionChart rows={s.oddEven.map((r) => ({ key: `${r.k} odd`, label: r.label, count: r.count, expected: r.expected }))} name="odd and even splits" />
          <DataTable rows={s.oddEven.map((r) => ({ key: r.k, label: r.label, count: r.count, expected: r.expected }))} first="Split" />
        </Card>
        <Card title="High / low" subtitle={`How many of the 4 whites were high (${LOW_MAX + 1}–35) vs low (1–${LOW_MAX}).`}>
          <Legend observed="Draws" />
          <DistributionChart rows={s.highLow.map((r) => ({ key: `${r.k} high`, label: r.label, count: r.count, expected: r.expected }))} name="high and low splits" />
          <DataTable rows={s.highLow.map((r) => ({ key: r.k, label: r.label, count: r.count, expected: r.expected }))} first="Split" />
        </Card>
      </div>

      <Card title="Sum of the white balls" subtitle={`Sums run from 10 to 134. The average draw sums to ${fmtNum(s.meanSum, 1)}; a fair draw averages ${EXPECTED_MEAN_SUM}.`}>
        <Legend observed="Draws" />
        <DistributionChart
          rows={s.sums.map((b) => ({ key: b.from, label: `Sum ${b.from}–${b.to}`, count: b.count, expected: b.expected }))}
          name="white-ball sums in bins of 5"
          height={220}
          tickInterval={3}
        />
        <p className="mt-2 text-xs text-muted">Bars group sums in fives (10–14, 15–19, …). Middle sums are common simply because many more combinations add up to them.</p>
        <DataTable rows={s.sums.map((b) => ({ key: b.from, label: `${b.from}–${b.to}`, count: b.count, expected: b.expected }))} first="Sum" />
      </Card>
    </div>
  );
}

function ExtremeRow({ label, items, cash = false }: { label: string; items: NumberFrequency[]; cash?: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="w-24 text-xs text-ink-2">{label}</span>
      {items.map((f) => (
        <span key={f.number} className="inline-flex items-center gap-1">
          <Ball n={f.number} cash={cash} size="sm" />
          <span className="tabular text-xs text-ink-2">{f.count}</span>
        </span>
      ))}
    </div>
  );
}

function ChiResult({ name, result }: { name: string; result: ChiSquareResult }) {
  const p = result.pValue;
  const verdict =
    p >= 0.05
      ? { tone: 'text-good', head: 'Looks random', body: `Counts at least this uneven would turn up about ${fmtNum(p * 100, 0)}% of the time from a perfectly fair machine. Nothing unusual here.` }
      : p >= 0.001
        ? {
            tone: 'text-ink',
            head: 'A bit unusual',
            body: `A fair machine would produce counts this uneven about ${fmtNum(p * 100, 1)}% of the time. That happens by luck in roughly 1 test in ${fmtInt(1 / p)}, so on its own it isn’t evidence of a bias, and it wouldn’t tell you what comes next.`,
          }
        : {
            tone: 'text-bad',
            head: 'Very unusual',
            body: `Counts this uneven would be rare from a fair machine (p < 0.001). That’s worth checking the data for errors before reading anything into it.`,
          };
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{name}</h3>
        <span className="tabular text-xs text-muted">
          χ² = {fmtNum(result.statistic, 1)}, df = {result.df}, p = {p < 0.001 ? '< 0.001' : fmtNum(p, 3)}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-2">
        <strong className={`font-semibold ${verdict.tone}`}>{verdict.head}.</strong> {verdict.body}
      </p>
    </div>
  );
}

function GapTable({ title, gaps, typical, cash = false }: { title: string; gaps: GapStats[]; typical: number; cash?: boolean }) {
  const longest = [...gaps].sort((a, b) => b.longestGap - a.longestGap || a.number - b.number).slice(0, 5);
  const current = [...gaps].sort((a, b) => b.currentGap - a.currentGap || a.number - b.number).slice(0, 3);
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-0.5 text-xs text-muted">Average gap between appearances: {fmtNum(typical, typical % 1 ? 2 : 0)} draws.</p>
      <table className="tabular mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-1 font-medium">Ball</th>
            <th className="pb-1 text-right font-medium">Longest gap</th>
            <th className="pb-1 text-right font-medium">Ended</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {longest.map((g) => (
            <tr key={g.number}>
              <td className="py-1.5">
                <Ball n={g.number} cash={cash} size="xs" />
              </td>
              <td className="py-1.5 text-right font-semibold text-ink">{g.longestGap} draws</td>
              <td className="py-1.5 text-right text-xs text-ink-2">{g.longestGapEnded ? fmtShortDate(g.longestGapEnded) : 'ongoing'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-ink-2">
        Currently absent longest:{' '}
        {current.map((g, i) => (
          <span key={g.number}>
            {i > 0 && ', '}
            {g.number} ({g.currentGap} draws)
          </span>
        ))}
        .
      </p>
    </div>
  );
}
