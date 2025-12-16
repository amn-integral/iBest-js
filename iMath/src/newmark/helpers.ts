export function interpolateSorted(xValues: number[], yValues: number[], x: number, extend = true): number {
  const n = xValues.length;
  if (n !== yValues.length) {
    throw new Error('xValues and yValues must have equal length');
  }
  if (n < 2) {
    throw new Error('At least two points are required for interpolation');
  }

  const xMin = xValues[0];
  const xMax = xValues[n - 1];

  if (x < xMin) {
    if (!extend) {
      throw new Error(`x=${x} must be >= ${xMin}`);
    }
    const slope = (yValues[1] - yValues[0]) / (xValues[1] - xValues[0]);
    return yValues[0] + (x - xMin) * slope;
  }

  if (x > xMax) {
    if (!extend) {
      throw new Error(`x=${x} must be <= ${xMax}`);
    }
    const slope = (yValues[n - 1] - yValues[n - 2]) / (xValues[n - 1] - xValues[n - 2]);
    return yValues[n - 1] + (x - xMax) * slope;
  }

  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (hi + lo) >> 1;
    if (xValues[mid] > x) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const xLo = xValues[lo];
  const xHi = xValues[hi];

  if (xHi === xLo) {
    return yValues[lo];
  }

  const slope = (yValues[hi] - yValues[lo]) / (xHi - xLo);
  return yValues[lo] + (x - xLo) * slope;
}

export function interpolateSortedBatch(xValues: number[], yValues: number[], xArray: number[]): number[] {
  const n = xValues.length;
  if (n !== yValues.length) {
    throw new Error('xValues and yValues must have equal length');
  }
  if (n < 2) {
    throw new Error('At least two points are required for interpolation');
  }

  const result = new Array<number>(xArray.length);
  const xMin = xValues[0];
  const xMax = xValues[n - 1];
  const slopeLeft = (yValues[1] - yValues[0]) / (xValues[1] - xValues[0]);
  const slopeRight = (yValues[n - 1] - yValues[n - 2]) / (xValues[n - 1] - xValues[n - 2]);

  for (let idx = 0; idx < xArray.length; idx += 1) {
    const val = xArray[idx];

    if (val < xMin) {
      result[idx] = yValues[0] + (val - xMin) * slopeLeft;
      continue;
    }

    if (val > xMax) {
      result[idx] = yValues[n - 1] + (val - xMax) * slopeRight;
      continue;
    }

    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (hi + lo) >> 1;
      if (xValues[mid] > val) {
        hi = mid;
      } else {
        lo = mid;
      }
    }

    const xLo = xValues[lo];
    const xHi = xValues[hi];
    if (xHi === xLo) {
      result[idx] = yValues[lo];
    } else {
      const slope = (yValues[hi] - yValues[lo]) / (xHi - xLo);
      result[idx] = yValues[lo] + (val - xLo) * slope;
    }
  }

  return result;
}

export function resampleCurve(xValues: number[], yValues: number[], step: number): { x: number[]; y: number[] } {
  if (step <= 0) {
    throw new Error('step must be greater than 0');
  }

  const xMin = xValues[0];
  const xMax = xValues[xValues.length - 1];
  const xSamples: number[] = [];
  const ySamples: number[] = [];

  for (let x = xMin; x <= xMax + 1e-10; x += step) {
    xSamples.push(x);
    ySamples.push(interpolateSorted(xValues, yValues, x));
  }

  return { x: xSamples, y: ySamples };
}

export function fastInterpolate(xSamples: number[], ySamples: number[], step: number, x: number): number {
  const xMin = xSamples[0];
  const xMax = xSamples[xSamples.length - 1];

  if (x < xMin || x > xMax) {
    throw new Error(`x must lie between ${xMin} and ${xMax}`);
  }

  let i = Math.floor((x - xMin) / step);
  if (i >= xSamples.length - 1) {
    i = xSamples.length - 2;
  }

  const xLo = xSamples[i];
  const xHi = xSamples[i + 1];
  const yLo = ySamples[i];
  const yHi = ySamples[i + 1];
  const slope = (yHi - yLo) / (xHi - xLo);

  return yLo + (x - xLo) * slope;
}
