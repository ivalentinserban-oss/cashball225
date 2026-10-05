import { useState } from 'react';
import { DrawBalls } from '../components/Ball';
import { Card, IndependenceNote, PageHeader } from '../components/ui';
import { fmtInt } from '../lib/format';
import { quickPick, type QuickPick } from '../lib/random';
import { TOTAL_COMBOS } from '../lib/odds';

const COUNTS = [1, 5, 10];

const asText = (p: QuickPick) => `${p.whites.join(' ')}  CB ${p.cashBall}`;

export function QuickPickPage() {
  const [count, setCount] = useState(5);
  const [picks, setPicks] = useState<QuickPick[]>([]);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    setPicks(Array.from({ length: count }, () => quickPick()));
    setCopied(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(picks.map(asText).join('\n'));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Quick pick">Random numbers from your device’s secure random generator.</PageHeader>

      <IndependenceNote>
        Every one of the {fmtInt(TOTAL_COMBOS)} possible tickets has the same 1 in {fmtInt(TOTAL_COMBOS)} jackpot chance, including 1-2-3-4 with
        Cash Ball 1. Random picks don’t improve your odds; they just save you choosing.
      </IndependenceNote>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-surface-2 p-1" role="group" aria-label="How many plays">
            {COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCount(c)}
                aria-pressed={count === c}
                className={`min-w-11 rounded-md px-3 py-1.5 text-sm font-medium ${count === c ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--ring)]' : 'text-ink-2'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <button type="button" onClick={generate} className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:flex-none">
            Generate {count === 1 ? 'a pick' : `${count} picks`}
          </button>
        </div>

        {picks.length > 0 && (
          <>
            <ol className="mt-4 divide-y divide-line">
              {picks.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="flex items-center gap-3">
                    <span className="tabular w-5 text-right text-xs text-muted">{i + 1}</span>
                    <DrawBalls whites={p.whites} cashBall={p.cashBall} size="md" />
                  </span>
                  <a
                    href={`#/check?w=${p.whites.join(',')}&cb=${p.cashBall}`}
                    className="rounded-md px-2 py-1.5 text-xs font-medium text-accent-ink hover:bg-surface-2"
                    aria-label={`Check ${asText(p)} against past draws`}
                  >
                    Past 5 yrs
                  </a>
                </li>
              ))}
            </ol>
            <button type="button" onClick={copy} className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium text-ink">
              {copied ? 'Copied' : 'Copy all'}
            </button>
          </>
        )}
      </Card>

      <p className="text-xs text-muted">
        Picks use <code>crypto.getRandomValues</code> with rejection sampling, so every number is equally likely. This page only generates
        numbers; it doesn’t buy tickets.
      </p>
    </div>
  );
}
