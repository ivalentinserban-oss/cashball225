type Size = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<Size, string> = {
  xs: 'h-6 w-6 text-[11px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-lg',
};

/** A white ball or the Cash Ball. `hit` highlights a number that matched the player's ticket. */
export function Ball({ n, cash = false, size = 'sm', hit = false, dim = false }: { n: number; cash?: boolean; size?: Size; hit?: boolean; dim?: boolean }) {
  const base = `tabular inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZES[size]}`;
  const look = cash
    ? `bg-cash text-cash-ink ${hit ? 'ring-[3px] ring-accent ring-offset-2 ring-offset-surface' : ''}`
    : hit
      ? 'bg-accent text-white'
      : 'bg-surface text-ink shadow-[inset_0_0_0_1.5px_var(--axis)]';
  return (
    <span className={`${base} ${look} ${dim ? 'opacity-45' : ''}`} aria-label={`${cash ? 'Cash Ball ' : ''}${n}${hit ? ' (match)' : ''}`}>
      {n}
    </span>
  );
}

export function DrawBalls({ whites, cashBall, size = 'sm', hitWhites, hitCash }: { whites: readonly number[]; cashBall: number; size?: Size; hitWhites?: ReadonlySet<number>; hitCash?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {whites.map((w) => (
        <Ball key={w} n={w} size={size} hit={hitWhites?.has(w)} dim={hitWhites !== undefined && !hitWhites.has(w)} />
      ))}
      <span className="w-0.5" />
      <Ball n={cashBall} cash size={size} hit={hitCash} dim={hitCash === false} />
    </span>
  );
}

/** Glyph for a prize tier: filled dots for matched whites, plus the Cash Ball when required. */
export function TierGlyph({ whites, cashBall }: { whites: number; cashBall: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} className={`h-3 w-3 rounded-full ${i < whites ? 'bg-ink' : 'shadow-[inset_0_0_0_1.5px_var(--axis)]'}`} />
      ))}
      <span className={`ml-1 h-3 w-3 rounded-full ${cashBall ? 'bg-cash' : 'shadow-[inset_0_0_0_1.5px_var(--axis)]'}`} />
    </span>
  );
}
