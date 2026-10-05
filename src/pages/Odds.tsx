import { useMemo } from 'react';
import { TierGlyph } from '../components/Ball';
import { Card, PageHeader, StatTile } from '../components/ui';
import { useDraws } from '../lib/data';
import { fmtCents, fmtDate, fmtInt, fmtMoney, fmtNum, fmtOneIn, fmtPct, plural } from '../lib/format';
import { OFFICIAL_OVERALL_ODDS, TOP_PRIZE_LIABILITY_CAP, tierLabel } from '../lib/game';
import {
  ALL_TIER_ODDS,
  ANY_PRIZE_ONE_IN,
  ANY_PRIZE_PROBABILITY,
  ANY_PRIZE_WAYS,
  DAYS_PER_YEAR,
  TOTAL_COMBOS,
  atLeastOnce,
  expectedValue,
  yearsToExpect,
} from '../lib/odds';
import { jackpotSummary } from '../lib/stats';

const EV = expectedValue();

function waitText(p: number): string {
  const days = 1 / p;
  if (days < 60) return `every ${fmtNum(days, 1)} days`;
  const years = yearsToExpect(p);
  if (years < 2) return `every ${fmtNum(days / 30.44, 0)} months`;
  return `every ${fmtInt(years)} years`;
}

export function OddsPage() {
  const ways = (ids: string[]) => ALL_TIER_ODDS.filter((t) => ids.includes(t.tier.id)).reduce((s, t) => s + t.ways, 0);
  const jackpotP = 1 / TOTAL_COMBOS;
  const fiveYears = Math.round(5 * DAYS_PER_YEAR);
  const pFiveYears = atLeastOnce(jackpotP, fiveYears);
  const cashWays = ANY_PRIZE_WAYS - ways(['0+CB']);
  const totalCashPrizes = ALL_TIER_ODDS.reduce((s, t) => s + (t.tier.freePlay ? 0 : t.ways * t.tier.prize), 0);

  const tangible: { label: string; p: number }[] = [
    { label: 'Jackpot (4 whites + Cash Ball)', p: jackpotP },
    { label: 'All 4 white balls, with or without the Cash Ball', p: ways(['4+CB', '4']) / TOTAL_COMBOS },
    { label: '$225 or more (3 whites + Cash Ball or better)', p: ways(['4+CB', '4', '3+CB']) / TOTAL_COMBOS },
    { label: 'Any cash prize', p: cashWays / TOTAL_COMBOS },
    { label: 'Any prize, including a Free Play', p: ANY_PRIZE_PROBABILITY },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Odds & prizes">
        Pick 4 white balls from 1–35 and 1 Cash Ball from 1–25. $1 per play, drawn every night around 11:00 PM ET.
      </PageHeader>

      <section className="rounded-2xl bg-surface p-5 shadow-[0_0_0_1px_var(--ring)]">
        <div className="text-sm text-ink-2">Chance of the $225,000 top prize</div>
        <div className="mt-1 text-5xl font-semibold tracking-tight text-ink">1 in {fmtInt(TOTAL_COMBOS)}</div>
        <p className="mt-2 text-sm text-ink-2">
          There are C(35,4) × 25 = 52,360 × 25 = {fmtInt(TOTAL_COMBOS)} possible tickets, and exactly one of them matches all four white balls
          and the Cash Ball.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Odds of any prize" value={`1 in ${fmtNum(ANY_PRIZE_ONE_IN, 2)}`} detail={`${fmtPct(ANY_PRIZE_PROBABILITY)} · official ≈ 1 in ${OFFICIAL_OVERALL_ODDS}`} />
        <StatTile label="Average return per $1" value={fmtCents(EV.totalFace)} detail={`${fmtCents(EV.cash)} cash + ${fmtCents(EV.freePlayFace)} Free Plays`} />
        <StatTile label="Average loss per $1" value={fmtCents(EV.lossFace)} detail="before taxes" />
      </div>

      <Card title="Every prize tier" subtitle="Computed from first principles and checked against the Kentucky Lottery’s published odds.">
        <ul className="divide-y divide-line">
          {ALL_TIER_ODDS.map((t) => (
            <li key={t.tier.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <TierGlyph whites={t.tier.whites} cashBall={t.tier.cashBall} />
                  <span className="truncate text-sm font-medium text-ink">{tierLabel(t.tier)}</span>
                </div>
                <span className="shrink-0 text-base font-semibold text-ink">{t.tier.prizeLabel}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <span className="text-ink">
                  1 in <span className="font-semibold">{fmtOneIn(t.oneIn)}</span>
                </span>
                <span className="tabular text-ink-2">{fmtPct(t.probability)}</span>
                <span className={`text-xs ${t.matchesOfficial ? 'text-good' : 'text-bad'}`}>
                  {t.matchesOfficial ? '✓' : '✗'} official 1 in {fmtInt(t.tier.officialOdds)}
                </span>
              </div>
              <div className="mt-1 overflow-x-auto font-mono text-[11px] whitespace-nowrap text-muted">
                {t.formula} ⁄ {fmtInt(TOTAL_COMBOS)}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Free Play is a free ticket for a future drawing. Matching 1 white ball without the Cash Ball, or nothing at all, pays nothing. The
          top prize is capped at {fmtMoney(TOP_PRIZE_LIABILITY_CAP)} in total per drawing, so if more than four tickets hit it on the same night
          they share {fmtMoney(TOP_PRIZE_LIABILITY_CAP)}.
        </p>
      </Card>

      <Card title="How the math works">
        <div className="space-y-3 text-sm text-ink-2">
          <p>
            Your 4 white numbers split the 35 balls into <strong className="text-ink">4 “yours”</strong> and{' '}
            <strong className="text-ink">31 “not yours”</strong>. For the draw to match exactly <em>k</em> of yours, it picks <em>k</em> from your
            4 and the other 4 − <em>k</em> from the 31:
          </p>
          <div className="overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs whitespace-nowrap text-ink">
            ways(k whites) = C(4, k) × C(31, 4 − k)
          </div>
          <p>
            The Cash Ball comes from a separate machine: <strong className="text-ink">1</strong> way to match it, <strong className="text-ink">24</strong>{' '}
            ways to miss. Multiply, then divide by every possible ticket:
          </p>
          <div className="overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs whitespace-nowrap text-ink">
            P(tier) = C(4, k) × C(31, 4 − k) × (1 or 24) ⁄ (C(35, 4) × 25)
          </div>
          <p>
            Adding up every winning tier gives {fmtInt(ANY_PRIZE_WAYS)} winning tickets out of {fmtInt(TOTAL_COMBOS)}, or 1 in{' '}
            {fmtNum(ANY_PRIZE_ONE_IN, 2)}. The official table rounds each figure to a whole number; every tier above rounds to exactly the
            published value. (The $1 tier is really 1 in 19.55; the lottery shows it as 1 in 20.)
          </p>
        </div>
      </Card>

      <Card title="Expected value of a $1 ticket" subtitle="Each tier’s prize × its probability, added up.">
        <div className="overflow-x-auto">
          <table className="tabular w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 text-right font-medium">Prize</th>
                <th className="pb-2 text-right font-medium">Worth per ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ALL_TIER_ODDS.map((t) => (
                <tr key={t.tier.id}>
                  <td className="py-1.5 text-ink">{tierLabel(t.tier)}</td>
                  <td className="py-1.5 text-right text-ink-2">{t.tier.prizeLabel}</td>
                  <td className="py-1.5 text-right text-ink">{fmtCents(t.probability * t.tier.prize)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line font-semibold">
                <td className="pt-2 text-ink" colSpan={2}>
                  Total (Free Play at $1)
                </td>
                <td className="pt-2 text-right text-ink">{fmtCents(EV.totalFace)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-2">
          On average each $1 ticket returns {fmtCents(EV.cash)} in cash plus {fmtCents(EV.freePlayFace)} worth of Free Plays, so you lose about{' '}
          <strong className="text-ink">{fmtCents(EV.lossFace)}</strong> per play. Valuing a Free Play at what a ticket is actually worth (its
          own expected value) gives {fmtCents(EV.totalRecursive)}. Taxes on large prizes lower the real return further.
        </p>
      </Card>

      <Card title="What these odds feel like" subtitle="If you bought one ticket for every daily draw, on average you’d win…">
        <ul className="divide-y divide-line">
          {tangible.map((row) => (
            <li key={row.label} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
              <span className="text-sm text-ink-2">{row.label}</span>
              <span className="shrink-0 text-right text-sm font-semibold text-ink">{waitText(row.p)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 text-sm text-ink-2">
          <p>
            One jackpot every <strong className="text-ink">{fmtInt(yearsToExpect(jackpotP))} years</strong> of nightly play (using 365.25-day
            years). Play every night for five years ({fmtInt(fiveYears)} tickets) and your chance of hitting it even once is{' '}
            <strong className="text-ink">{fmtPct(pFiveYears)}</strong>, about 1 in {fmtInt(1 / pFiveYears)}.
          </p>
          <p>
            Buying every combination for one drawing would cost {fmtMoney(TOTAL_COMBOS)} and guarantee the jackpot, yet all the prizes
            together would pay back only {fmtMoney(totalCashPrizes)} in cash plus {fmtInt(ALL_TIER_ODDS[7].ways)} Free Plays.
          </p>
        </div>
      </Card>

      <JackpotHistory />
    </div>
  );
}

function JackpotHistory() {
  const state = useDraws();
  const summary = useMemo(() => (state.status === 'ready' ? jackpotSummary(state.data.draws) : null), [state]);
  if (state.status !== 'ready') return null;
  const { data } = state;
  if (!summary) {
    return (
      <Card title="Jackpots actually hit">
        <p className="text-sm text-ink-2">Winner counts aren’t in the dataset yet. Run the data refresh with payouts enabled to add them.</p>
      </Card>
    );
  }
  const years = summary.drawsWithData / DAYS_PER_YEAR;
  return (
    <Card title="Jackpots actually hit" subtitle={`Kentucky winner counts for ${plural(summary.drawsWithData, 'draw')} (${fmtDate(data.draws[0].date)} onward).`}>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Jackpot winners" value={fmtInt(summary.jackpotWinners)} detail={`on ${plural(summary.jackpotDraws.length, 'night')} in ${fmtNum(years, 1)} years`} />
        <StatTile label="Expected from sales" value={`≈ ${fmtNum(summary.expectedJackpots, 0)}`} detail={`from ≈ ${fmtInt(summary.estimatedPlays / summary.drawsWithData)} plays a night`} />
      </div>
      <p className="mt-3 text-sm text-ink-2">
        Across all players, about {fmtInt(summary.estimatedPlays / summary.drawsWithData)} plays a night means a jackpot somewhere in Kentucky
        roughly every {fmtInt(TOTAL_COMBOS / (summary.estimatedPlays / summary.drawsWithData))} days, even though any one player waits thousands
        of years. Plays are estimated from how many tickets won the three most common prizes, so treat the expected count as rough: people’s
        picks aren’t perfectly random.
      </p>
      {summary.jackpotDraws.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-accent-ink">Nights with a jackpot winner</summary>
          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {summary.jackpotDraws.map((j) => (
              <li key={j.date} className="tabular text-ink-2">
                {fmtDate(j.date)}
                {j.winners > 1 && <span className="text-ink"> · {j.winners} winners</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
