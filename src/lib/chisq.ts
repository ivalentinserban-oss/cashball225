// Chi-square goodness-of-fit with an exact-enough p-value (regularized incomplete gamma).

function lnGamma(z: number): number {
  // Lanczos approximation (g = 7, n = 9).
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Lower regularized gamma P(a, x). */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    // Series expansion.
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 1000; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  return 1 - gammaQ(a, x);
}

/** Upper regularized gamma Q(a, x) = 1 − P(a, x). */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  if (x < a + 1) return 1 - gammaP(a, x);
  // Continued fraction (modified Lentz).
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** P(X ≥ x) for X ~ χ²(df). */
export function chiSquarePValue(x: number, df: number): number {
  return gammaQ(df / 2, x / 2);
}

export interface ChiSquareResult {
  statistic: number;
  df: number;
  pValue: number;
  /** Raw Pearson statistic before any correction. */
  pearson: number;
  /** Multiplier applied to the Pearson statistic (1 when none). */
  correction: number;
}

/**
 * Pearson chi-square test that every category is equally likely.
 *
 * `perDraw` is how many distinct categories each draw contributes. When several balls come out of the
 * same machine without replacement (4 whites from 35), the per-number counts are less variable than a
 * multinomial, and the raw statistic averages (n − k) instead of n − 1. Scaling by (n − 1)/(n − k)
 * restores the χ²(n − 1) reference distribution.
 */
export function chiSquareUniform(observed: readonly number[], perDraw = 1): ChiSquareResult {
  const n = observed.length;
  const total = observed.reduce((s, o) => s + o, 0);
  const expected = total / n;
  const pearson = observed.reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
  const correction = perDraw > 1 ? (n - 1) / (n - perDraw) : 1;
  const statistic = pearson * correction;
  const df = n - 1;
  return { statistic, df, pValue: chiSquarePValue(statistic, df), pearson, correction };
}
