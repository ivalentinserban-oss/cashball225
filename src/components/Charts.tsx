import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtInt, fmtNum } from '../lib/format';

const AXIS_TICK = { fontSize: 10, fill: 'var(--muted)' };
const GRID = <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={1} />;

export function Legend({ observed = 'Times drawn', expected = 'Expected if fair' }: { observed?: string; expected?: string }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--series-1)]" aria-hidden="true" />
        {observed}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded bg-[var(--series-2)]" aria-hidden="true" />
        {expected}
      </span>
    </div>
  );
}

function TooltipBox({ title, observed, expected }: { title: ReactNode; observed: number; expected: number }) {
  const diff = expected ? ((observed - expected) / expected) * 100 : 0;
  return (
    <div className="rounded-lg bg-surface px-3 py-2 text-xs shadow-[0_0_0_1px_var(--ring),0_4px_16px_rgba(0,0,0,0.12)]">
      <div className="text-ink-2">{title}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="h-0.5 w-3 rounded bg-[var(--series-1)]" />
        <span className="tabular text-sm font-semibold text-ink">{fmtInt(observed)}</span>
        <span className="text-ink-2">drawn</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-3 rounded bg-[var(--series-2)]" />
        <span className="tabular font-semibold text-ink">{fmtNum(expected, 1)}</span>
        <span className="text-ink-2">expected ({diff >= 0 ? '+' : ''}{fmtNum(diff, 1)}%)</span>
      </div>
    </div>
  );
}

interface Row {
  key: string | number;
  label: string;
  count: number;
  expected: number;
}

/** Observed counts as bars, with a constant expected value as a reference line. */
export function FrequencyChart({ rows, expected, ticks, name }: { rows: Row[]; expected: number; ticks: (string | number)[]; name: string }) {
  return (
    <div role="img" aria-label={`Bar chart of how often each ${name} was drawn, against an expected ${fmtNum(expected, 1)} each. Table below.`}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap="18%">
          {GRID}
          <XAxis dataKey="key" ticks={ticks} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} interval={0} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as Row;
              return <TooltipBox title={r.label} observed={r.count} expected={r.expected} />;
            }}
          />
          <Bar dataKey="count" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} activeBar={{ fill: 'var(--accent-ink)' }} />
          <ReferenceLine y={expected} stroke="var(--series-2)" strokeWidth={2} ifOverflow="extendDomain" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Observed counts as bars, with a varying expected value as a line with dots. */
export function DistributionChart({ rows, name, height = 200, tickInterval = 0 }: { rows: Row[]; name: string; height?: number; tickInterval?: number }) {
  return (
    <div role="img" aria-label={`Chart of ${name}: observed counts against the counts expected from a fair draw. Table below.`}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap="18%">
          {GRID}
          <XAxis dataKey="key" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} interval={tickInterval} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as Row;
              return <TooltipBox title={r.label} observed={r.count} expected={r.expected} />;
            }}
          />
          <Bar dataKey="count" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} activeBar={{ fill: 'var(--accent-ink)' }} />
          <Line
            dataKey="expected"
            type="linear"
            stroke="var(--series-2)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--series-2)', stroke: 'var(--surface)', strokeWidth: 2 }}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The table twin every chart carries, collapsed by default. */
export function DataTable({ rows, first = 'Value' }: { rows: Row[]; first?: string }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-accent-ink">Show as table</summary>
      <div className="mt-2 max-h-72 overflow-y-auto">
        <table className="tabular w-full text-xs">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">{first}</th>
              <th className="py-1 text-right font-medium">Drawn</th>
              <th className="py-1 text-right font-medium">Expected</th>
              <th className="py-1 text-right font-medium">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="py-1 text-ink">{r.label}</td>
                <td className="py-1 text-right text-ink">{fmtInt(r.count)}</td>
                <td className="py-1 text-right text-ink-2">{fmtNum(r.expected, 1)}</td>
                <td className="py-1 text-right text-ink-2">
                  {r.count - r.expected >= 0 ? '+' : ''}
                  {fmtNum(r.count - r.expected, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
