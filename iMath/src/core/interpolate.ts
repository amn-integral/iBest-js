/** Linear interpolation: get y for a given x from (xs, ys). */
export function interpLinear(x: number, xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n !== ys.length || n < 2) {
    throw new Error('xs and ys must have same length ≥ 2');
  }
  // exact hits at ends
  if (x <= xs[0]) return ys[0] + (ys[1] - ys[0]) * ((x - xs[0]) / (xs[1] - xs[0]));
  if (x >= xs[n - 1]) {
    const i = n - 2;
    return ys[i] + (ys[i + 1] - ys[i]) * ((x - xs[i]) / (xs[i + 1] - xs[i]));
  }
  // binary search for i such that xs[i] <= x < xs[i+1]
  let lo = 0,
    hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] === x) return ys[mid];
    if (xs[mid] < x) lo = mid;
    else hi = mid;
  }
  const i = lo,
    x0 = xs[i],
    x1 = xs[i + 1];
  const y0 = ys[i],
    y1 = ys[i + 1];
  const t = (x - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}
