import { interpolateSorted, interpolateSortedBatch } from "./helpers";

interface DiscretizedCurve {
  t: number[];
  f: number[];
}

export class ForceCurve {
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

  public getAt(x: number): number {
    return interpolateSorted(this.xValues, this.yValues, x);
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

    return { t: tValues, f: fValues };
  }
}
