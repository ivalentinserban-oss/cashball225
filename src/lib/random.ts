export type Rng = (buf: Uint32Array<ArrayBuffer>) => void;

const cryptoRng: Rng = (b) => {
  crypto.getRandomValues(b);
};

/** Uniform integer in [0, max) from crypto.getRandomValues, using rejection sampling to avoid modulo bias. */
export function secureRandomInt(max: number, rng: Rng = cryptoRng): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError('max must be an integer in 1..2^32');
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(new ArrayBuffer(4));
  for (;;) {
    rng(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

export interface QuickPick {
  whites: number[];
  cashBall: number;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** Four distinct whites (sorted) from `whitePool` and one Cash Ball from `cashPool`, each uniformly at random. */
export function pickFromPools(whitePool: readonly number[], cashPool: readonly number[], rng?: Rng): QuickPick {
  const pool = [...new Set(whitePool)];
  if (pool.length < 4) throw new RangeError('The white-ball pool needs at least 4 numbers');
  if (cashPool.length === 0) throw new RangeError('The Cash Ball pool is empty');
  // Partial Fisher–Yates shuffle: the first 4 slots end up a uniform random 4-subset.
  for (let i = 0; i < 4; i++) {
    const j = i + secureRandomInt(pool.length - i, rng);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { whites: pool.slice(0, 4).sort((a, b) => a - b), cashBall: cashPool[secureRandomInt(cashPool.length, rng)] };
}

/** Four distinct whites from 1–35 (sorted) and one Cash Ball from 1–25. */
export function quickPick(rng?: Rng): QuickPick {
  return pickFromPools(range(35), range(25), rng);
}
