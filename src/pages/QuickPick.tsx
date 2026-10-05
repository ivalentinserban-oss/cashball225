import { useState } from 'react';
import { PickList, Segmented } from '../components/PickList';
import { Card, IndependenceNote, PageHeader } from '../components/ui';
import { fmtInt } from '../lib/format';
import { quickPick, type QuickPick } from '../lib/random';
import { TOTAL_COMBOS } from '../lib/odds';

const COUNTS = [1, 5, 10] as const;

export function QuickPickPage() {
  const [count, setCount] = useState<(typeof COUNTS)[number]>(5);
  const [picks, setPicks] = useState<QuickPick[]>([]);

  return (
    <div className="space-y-4">
      <PageHeader title="Quick pick">Random numbers from your device’s secure random generator.</PageHeader>

      <IndependenceNote>
        Every one of the {fmtInt(TOTAL_COMBOS)} possible tickets has the same 1 in {fmtInt(TOTAL_COMBOS)} jackpot chance, including 1-2-3-4 with
        Cash Ball 1. Random picks don’t improve your odds; they just save you choosing.
      </IndependenceNote>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented options={COUNTS} value={count} onChange={setCount} label="How many plays" />
          <button
            type="button"
            onClick={() => setPicks(Array.from({ length: count }, () => quickPick()))}
            className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:flex-none"
          >
            Generate {count === 1 ? 'a pick' : `${count} picks`}
          </button>
        </div>
        <PickList key={picks.map((p) => p.whites.join('-') + p.cashBall).join()} picks={picks} />
      </Card>

      <p className="text-xs text-muted">
        Picks use <code>crypto.getRandomValues</code> with rejection sampling, so every number is equally likely. This page only generates
        numbers; it doesn’t buy tickets.
      </p>
    </div>
  );
}
