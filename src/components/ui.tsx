import type { ReactNode } from 'react';

export function Card({ title, subtitle, children, className = '', id }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-2xl bg-surface p-4 shadow-[0_0_0_1px_var(--ring)] sm:p-5 ${className}`}>
      {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
      {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      {(title || subtitle) && <div className="mt-3" />}
      {children}
    </section>
  );
}

export function StatTile({ label, value, detail }: { label: ReactNode; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface p-3 shadow-[0_0_0_1px_var(--ring)]">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-muted">{detail}</div>}
    </div>
  );
}

/** The "past draws don't predict future draws" note. */
export function IndependenceNote({ children }: { children?: ReactNode }) {
  return (
    <aside className="rounded-xl border border-note-line bg-note-bg px-4 py-3 text-sm text-ink" role="note">
      <strong className="font-semibold">Every draw is independent.</strong>{' '}
      {children ?? (
        <>
          The machines have no memory, so a number that came up often (or rarely) is exactly as likely as any other next time. These
          charts describe the past; they can’t tell you what comes next.
        </>
      )}
    </aside>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {children && <p className="mt-1 text-sm text-ink-2">{children}</p>}
    </header>
  );
}

export function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading draw data">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />
      ))}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-bad/40 bg-surface p-4 text-sm text-ink" role="alert">
      {message}. If you’re offline, open the app once while online so it can cache the data.
    </div>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn = 'min-w-11 rounded-lg px-3 py-2 text-sm font-medium shadow-[0_0_0_1px_var(--ring)] disabled:opacity-40 bg-surface text-ink';
  return (
    <nav className="mt-3 flex items-center justify-between gap-2" aria-label="Pagination">
      <button className={btn} onClick={() => onPage(0)} disabled={page === 0} aria-label="First page">
        «
      </button>
      <button className={btn} onClick={() => onPage(page - 1)} disabled={page === 0}>
        Prev
      </button>
      <span className="tabular text-sm text-ink-2">
        {page + 1} / {pages}
      </span>
      <button className={btn} onClick={() => onPage(page + 1)} disabled={page >= pages - 1}>
        Next
      </button>
      <button className={btn} onClick={() => onPage(pages - 1)} disabled={page >= pages - 1} aria-label="Last page">
        »
      </button>
    </nav>
  );
}
