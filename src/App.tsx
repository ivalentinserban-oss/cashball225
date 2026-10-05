import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Loading } from './components/ui';
import { OddsPage } from './pages/Odds';
import { CheckPage } from './pages/Check';
import { HistoryPage } from './pages/History';
import { QuickPickPage } from './pages/QuickPick';
import { HotNumbersPage } from './pages/HotNumbers';

// Charts (Recharts) are only needed on the stats page, so they load on demand.
const StatsPage = lazy(() => import('./pages/Stats'));

type Route = 'odds' | 'stats' | 'check' | 'history' | 'pick' | 'hot';

const ROUTES: { id: Route; label: string; short?: string; icon: ReactNode }[] = [
  {
    id: 'odds',
    label: 'Odds',
    icon: <path d="M5 19 19 5M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />,
  },
  { id: 'stats', label: 'Stats', icon: <path d="M4 20h16M7 16v-5m5 5V6m5 10v-8" /> },
  { id: 'check', label: 'Check', icon: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-4-9 3 3 5-6" /> },
  { id: 'history', label: 'History', icon: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /> },
  {
    id: 'pick',
    label: 'Quick pick',
    short: 'Pick',
    icon: <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3.5 4.5h.01m7 0h.01M12 12h.01m-3.5 3.5h.01m7 0h.01" />,
  },
  {
    id: 'hot',
    label: 'Hot numbers',
    short: 'Hot',
    icon: <path d="M12 21c-3.9 0-7-2.9-7-6.6 0-2.6 1.5-4.4 3-5.9.3 1.6 1.2 2.7 2.4 3.1-.3-3.3 1-6.3 3.6-8.6.3 2.6 1.7 4.4 3.1 6 1.2 1.4 1.9 3 1.9 5.2C19 18 15.9 21 12 21Z" />,
  },
];

function readRoute(): Route {
  const id = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return (ROUTES.find((r) => r.id === id)?.id ?? 'odds') as Route;
}

function useRoute(): Route {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

type ThemePref = 'system' | 'light' | 'dark';

function useTheme(): [ThemePref, (t: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(() => {
    try {
      return (localStorage.getItem('theme') as ThemePref) || 'system';
    } catch {
      return 'system';
    }
  });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && mq.matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    apply();
    try {
      localStorage.setItem('theme', pref);
    } catch {
      /* storage unavailable */
    }
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
  return [pref, setPref];
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function ThemeToggle() {
  const [pref, setPref] = useTheme();
  const next: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
  const label = { system: 'Theme: match system', light: 'Theme: light', dark: 'Theme: dark' }[pref];
  return (
    <button
      onClick={() => setPref(next[pref])}
      className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2"
      aria-label={`${label}. Tap to change.`}
      title={label}
    >
      <Icon>
        {pref === 'light' && <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-14v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />}
        {pref === 'dark' && <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />}
        {pref === 'system' && <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-18v18" />}
      </Icon>
    </button>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-line pt-5 pb-4 text-xs leading-relaxed text-muted">
      <p className="text-ink-2">
        <strong className="font-semibold text-ink">Play for fun, not as a plan.</strong> If gambling stops being fun, help is free and confidential:
        call{' '}
        <a href="tel:+18004262537" className="font-semibold text-accent-ink underline underline-offset-2">
          1-800-GAMBLER
        </a>{' '}
        (1-800-426-2537). Must be 18 or older to play.
      </p>
      <p className="mt-2">
        Independent project, not affiliated with or endorsed by the Kentucky Lottery Corporation. Winning numbers can contain errors; the
        Kentucky Lottery’s official results always prevail.
      </p>
    </footer>
  );
}

export default function App() {
  const route = useRoute();
  const page = {
    odds: <OddsPage />,
    stats: <StatsPage />,
    check: <CheckPage />,
    history: <HistoryPage />,
    pick: <QuickPickPage />,
    hot: <HotNumbersPage />,
  }[route];

  return (
    <div className="min-h-dvh bg-page">
      <header className="sticky top-0 z-20 border-b border-line bg-page/90 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <a href="#/odds" className="flex items-center gap-2 font-semibold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cash text-[10px] font-bold text-cash-ink">225</span>
            Cash Ball 225
          </a>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {ROUTES.map((r) => (
              <a
                key={r.id}
                href={`#/${r.id}`}
                aria-current={route === r.id ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${route === r.id ? 'bg-accent-wash text-accent-ink' : 'text-ink-2 hover:bg-surface-2'}`}
              >
                {r.label}
              </a>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-5 pb-28 md:pb-10">
        <Suspense fallback={<Loading />}>{page}</Suspense>
        <Footer />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-6">
          {ROUTES.map((r) => (
            <a
              key={r.id}
              href={`#/${r.id}`}
              aria-current={route === r.id ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${route === r.id ? 'text-accent-ink' : 'text-muted'}`}
            >
              <Icon>{r.icon}</Icon>
              {r.short ?? r.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
