import { interpolateSorted } from "./helpers";

export interface BackbonePoint {
  displacement: number;
  resistance: number;
  klm?: number;
}

function clonePoints(points: BackbonePoint[]): BackbonePoint[] {
  return points.map((point) => ({
    displacement: point.displacement,
    resistance: point.resistance,
    klm: point.klm ?? 1,
  }));
}

function extendCurve(points: BackbonePoint[]): BackbonePoint[] {
  if (points.length === 0) {
    return [];
  }
  const last = points[points.length - 1];
  return [
    ...points,
    {
      displacement: last.displacement * 1.2,
      resistance: last.resistance,
      klm: last.klm ?? 1,
    },
  ];
}

export class BackboneCurve {
  public readonly numInboundRegions: number;
  public readonly numReboundRegions: number;

  public inboundData: BackbonePoint[];
  public reboundData: BackbonePoint[];

  public xValues: number[] = [];
  public yValues: number[] = [];
  public klmValues: number[] = [];

  public midIndex = 0;
  public currentRegion = 1;

  public inboundStiffness = 0;
  public reboundStiffness = 0;

  private readonly originalInbound: BackbonePoint[];
  private readonly originalRebound: BackbonePoint[];
  private stiffnessCache = new Map<number, number>();
  private klmCache = new Map<number, number>();
  private backboneBuilt = false;

  constructor(inbound: BackbonePoint[], rebound: BackbonePoint[]) {
    if (!inbound.length || !rebound.length) {
      throw new Error(
        "inboundData and reboundData must be non-empty lists of BackbonePoint",
      );
    }

    this.originalInbound = clonePoints(inbound);
    this.originalRebound = clonePoints(rebound);

    this.inboundData = extendCurve(clonePoints(inbound));
    this.reboundData = extendCurve(clonePoints(rebound));

    this.numInboundRegions = inbound.length;
    this.numReboundRegions = rebound.length;

    this.buildBackbone();
  }

  public updateCurrentRegion(displacement: number): void {
    let region = 0;
    const pivot = this.xValues[this.midIndex];

    if (displacement >= pivot) {
      for (let i = this.midIndex + 1; i < this.xValues.length; i += 1) {
        region += 1;
        if (displacement < this.xValues[i]) {
          break;
        }
      }
    } else {
      for (let i = this.midIndex - 1; i >= 0; i -= 1) {
        region -= 1;
        if (displacement > this.xValues[i]) {
          break;
        }
      }
    }

    this.currentRegion = region;
  }

  public getStiffnessInRegion(region: number): number {
    const cached = this.stiffnessCache.get(region);
    if (cached !== undefined) {
      return cached;
    }

    let stiffness = 0;
    if (region > 0) {
      const idx = this.midIndex + region;
      const x2 = this.xValues[idx];
      const x1 = this.xValues[idx - 1];
      const y2 = this.yValues[idx];
      const y1 = this.yValues[idx - 1];
      const dx = x2 - x1;
      stiffness = Math.abs(dx) > 1e-10 ? (y2 - y1) / dx : 0;
    } else if (region < 0) {
      const idx = this.midIndex + region;
      const x2 = this.xValues[idx + 1];
      const x1 = this.xValues[idx];
      const y2 = this.yValues[idx + 1];
      const y1 = this.yValues[idx];
      const dx = x1 - x2;
      stiffness = Math.abs(dx) > 1e-10 ? (y1 - y2) / dx : 0;
    }

    this.stiffnessCache.set(region, stiffness);
    return stiffness;
  }

  public getKlmInRegion(): number {
    const klm = this.klmCache.get(this.currentRegion);
    if (klm === undefined) {
      throw new Error(`Region ${this.currentRegion} not found in klm cache`);
    }
    return klm;
  }

  public getAt(displacement: number): number {
    return interpolateSorted(this.xValues, this.yValues, displacement);
  }

  public shiftBackbone(displacement: number): void {
    const midValue = this.xValues[this.midIndex];
    const stiffness =
      displacement > midValue ? this.inboundStiffness : this.reboundStiffness;
    if (Math.abs(stiffness) < 1e-10) {
      return;
    }
    const dx = displacement - this.getAt(displacement) / stiffness - midValue;
    this.xValues = this.xValues.map((value) => value + dx);
  }

  public reset(): void {
    this.inboundData = extendCurve(clonePoints(this.originalInbound));
    this.reboundData = extendCurve(clonePoints(this.originalRebound));

    this.currentRegion = 1;
    this.stiffnessCache = new Map();
    this.klmCache = new Map();
    this.backboneBuilt = false;
    this.buildBackbone();
  }

  private buildBackbone(): void {
    if (this.backboneBuilt) {
      return;
    }

    const midPoint: BackbonePoint = {
      displacement: 0,
      resistance: 0,
      klm: 1,
    };

    const allPoints = [
      ...clonePoints(this.reboundData),
      midPoint,
      ...clonePoints(this.inboundData),
    ].sort((a, b) => a.displacement - b.displacement);

    this.xValues = allPoints.map((point) => point.displacement);
    this.yValues = allPoints.map((point) => point.resistance);
    this.klmValues = allPoints.map((point) => point.klm ?? 1);
    this.midIndex = allPoints.findIndex((point) => point === midPoint);

    this.stiffnessCache = new Map();
    this.klmCache = new Map();

    for (let i = 0; i < this.midIndex; i += 1) {
      const x1 = this.xValues[i];
      const x2 = this.xValues[i + 1];
      const y1 = this.yValues[i];
      const y2 = this.yValues[i + 1];
      const region = -(this.midIndex - i);
      const dx = x2 - x1;
      const stiffness = Math.abs(dx) > 1e-10 ? (y2 - y1) / dx : 0;
      this.stiffnessCache.set(region, stiffness);
      this.klmCache.set(region, this.klmValues[i]);
    }

    for (let i = this.midIndex; i < this.xValues.length - 1; i += 1) {
      const x1 = this.xValues[i];
      const x2 = this.xValues[i + 1];
      const y1 = this.yValues[i];
      const y2 = this.yValues[i + 1];
      const region = i - this.midIndex + 1;
      const dx = x2 - x1;
      const stiffness = Math.abs(dx) > 1e-10 ? (y2 - y1) / dx : 0;
      this.stiffnessCache.set(region, stiffness);
      this.klmCache.set(region, this.klmValues[i]);
    }

    this.inboundStiffness = this.getStiffnessInRegion(1);
    this.reboundStiffness = this.getStiffnessInRegion(-1);
    this.backboneBuilt = true;
  }
}
