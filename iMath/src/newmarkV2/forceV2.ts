interface DiscretizedCurve {
  t: Float32Array;
  f: Float32Array;
}

function interpolateSortedBatch(
  xValues: number[],
  yValues: number[],
  xArray: number[],
): number[] {
  const n = xValues.length;
  if (n !== yValues.length) {
    throw new Error("xValues and yValues must have equal length");
  }
  if (n < 2) {
    throw new Error("At least two points are required for interpolation");
  }

  const result = new Array<number>(xArray.length);
  const xMin = xValues[0];
  const xMax = xValues[n - 1];
  const slopeLeft =
    (yValues[1] - yValues[0]) / (xValues[1] - xValues[0]);
  const slopeRight =
    (yValues[n - 1] - yValues[n - 2]) /
    (xValues[n - 1] - xValues[n - 2]);

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

export class ForceCurveV2 {
  public readonly xValues: number[];
  public readonly yValues: number[];

  constructor(xValues: number[], yValues: number[]) {
    if (xValues.length !== yValues.length) {
      throw new Error("xValues and yValues must have equal length");
    }
    if (xValues.length < 2) {
      throw new Error("At least two points are required to define a curve");
    }

    this.xValues = [...xValues];
    this.yValues = [...yValues];
  }

  public discretizeCurve(steps: number, dt: number): DiscretizedCurve {
    if (steps <= 0) {
      throw new Error("steps must be greater than 0");
    }
    if (dt <= 0) {
      throw new Error("dt must be greater than 0");
    }

    const tValues = new Array<number>(steps);
    for (let i = 0; i < steps; i += 1) {
      tValues[i] = i * dt;
    }
    const fValues = interpolateSortedBatch(this.xValues, this.yValues, tValues);

    return { t: new Float32Array(tValues), f: new Float32Array(fValues) };
  }
}
