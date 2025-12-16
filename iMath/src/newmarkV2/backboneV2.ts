function interpolateSorted(xValues: number[], yValues: number[], x: number, n: number): [number, number] {
  // Handle out-of-bounds cases
  if (x < xValues[0]) {
    const resistance = yValues[0];
    const slope = 0;
    return [resistance, slope];
  }

  if (x > xValues[n - 1]) {
    const resistance = yValues[n - 1];
    const slope = 0;
    return [resistance, slope];
  }

  // Binary search for interval
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((hi + lo) / 2);
    if (xValues[mid] > x) hi = mid;
    else lo = mid;
  }

  // Prevent division by zero
  if (xValues[hi] === xValues[lo]) {
    throw new Error('Duplicate x-values detected, cannot interpolate.');
  }

  const slope = (yValues[hi] - yValues[lo]) / (xValues[hi] - xValues[lo]);
  const value = yValues[lo] + (x - xValues[lo]) * slope;

  return [value, slope];
}

// BackboneCurve class equivalent
export class BackboneCurveV2 {
  n: number = 0;
  maxResistance: number;
  minResistance: number;
  baseXValues: number[];
  baseYValues: number[];
  midIndex: number;
  inboundStiffness: number;
  reboundStiffness: number;
  lenX: number;
  xValues: number[];
  yValues: number[];

  constructor(resistance: number[], displacement: number[]) {
    this.yValues = [...resistance];
    this.xValues = [...displacement];
    this.maxResistance = Math.max(...this.yValues);
    this.minResistance = Math.min(...this.yValues);
    this.baseXValues = [...displacement];
    this.baseYValues = [...resistance];
    this.lenX = this.xValues.length;

    // Find midpoint index (first positive displacement)
    this.midIndex = 0;
    for (let i = 0; i < this.xValues.length; i++) {
      if (this.xValues[i] > 1e-6) {
        this.midIndex = i - 1;
        break;
      }
    }

    // Compute stiffnesses
    this.inboundStiffness = (this.yValues[this.midIndex + 1] - this.yValues[this.midIndex]) / (this.xValues[this.midIndex + 1] - this.xValues[this.midIndex]);
    this.reboundStiffness = (this.yValues[this.midIndex] - this.yValues[this.midIndex - 1]) / (this.xValues[this.midIndex] - this.xValues[this.midIndex - 1]);
  }

  getAt(u: number): [number, number] {
    const [resistance, slope] = interpolateSorted(this.xValues, this.yValues, u, this.lenX);
    return [resistance, slope];
  }

  shiftBackbone(x: number): void {
    if (x > this.xValues[this.midIndex]) {
      // On inbound curve
      const [resistance] = this.getAt(x);
      const dx = x - resistance / this.inboundStiffness - this.xValues[this.midIndex];
      this.xValues = this.xValues.map(val => val + dx);
    } else {
      // On rebound curve
      const [resistance] = this.getAt(x);
      const dx = x - resistance / this.reboundStiffness - this.xValues[this.midIndex];
      this.xValues = this.xValues.map(val => val + dx);
    }
  }

  resetBackbone(): void {
    this.n = 0;
    this.yValues = [...this.baseYValues];
    this.xValues = [...this.baseXValues];
  }
}
