/** Splits an amount across weights in thousandths; the remainder goes on the last line. */
export function allocate(total: number, weights: number[]): number[] {
  const t = Math.round(total * 1000);
  const w = weights.reduce((a, b) => a + b, 0);
  if (w === 0) return weights.map(() => 0);
  const parts = weights.map((x) => Math.floor((t * x) / w));
  parts[parts.length - 1] += t - parts.reduce((a, b) => a + b, 0);
  return parts.map((p) => p / 1000);
}
