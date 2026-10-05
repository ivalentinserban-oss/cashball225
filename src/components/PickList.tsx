import { useState } from 'react';
import { DrawBalls } from './Ball';
import type { QuickPick } from '../lib/random';

const asText = (p: QuickPick) => `${p.whites.join(' ')}  CB ${p.cashBall}`;

/** Generated picks with a link to check each against past draws, plus copy-all. */
export function PickList({ picks }: { picks: QuickPick[] }) {
  const [copied, setCopied] = useState(false);
  if (picks.length === 0) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(picks.map(asText).join('\n'));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
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
  );
}

/** Segmented control used for small option sets. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  format = String,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  format?: (v: T) => string;
}) {
  return (
    <div className="inline-flex rounded-lg bg-surface-2 p-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`min-w-11 rounded-md px-3 py-1.5 text-sm font-medium ${value === o ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--ring)]' : 'text-ink-2'}`}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}
