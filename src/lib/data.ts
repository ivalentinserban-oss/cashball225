import { useEffect, useState } from 'react';
import type { Draw } from './game';

/** Shape of data/draws.json, written by scripts/fetch-draws.ts. */
export interface DrawsFile {
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

export type DrawsState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: DrawsFile };

let cache: Promise<DrawsFile> | null = null;

function load(): Promise<DrawsFile> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/draws.json`).then((r) => {
    if (!r.ok) throw new Error(`Could not load draw data (HTTP ${r.status})`);
    return r.json() as Promise<DrawsFile>;
  });
  cache.catch(() => (cache = null));
  return cache;
}

export function useDraws(): DrawsState {
  const [state, setState] = useState<DrawsState>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ status: 'ready', data }),
      (e: Error) => live && setState({ status: 'error', message: e.message }),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}
