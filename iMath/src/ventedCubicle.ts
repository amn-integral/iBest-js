import { interpLinear } from "./core/interpolate";

export function calculateScaledDistance(Z: number, R: number): number {
  return R / Z ** (1 / 3);
}

export function summaryText(Z: number, R: number): string {
  const scaledDistance = calculateScaledDistance(Z, R);
  return `The scaled distance is ${scaledDistance}.`;
}

export type CubicleProps = {
  cubicleType: string;
  fullyVentedType?: string;
  l: number;
  b: number;
  h: number;
  openingFace?: string;
  openingWidth?: number;
  openingHeight?: number;
  chargeWeight: number;
  chargeStandoff: number;
  chargeAngle: number;
  pMax: number;
  iMax: number;
};

export type Curve = {
    curve_name: string;
    xdata: number[];
    ydata: number[];
    num_points: number;
};

export type GrfCurve = {
    curves: Curve[];
    filename: string;
    xlabel: string;
    ylabel: string;
};

export interface ResultProps {
  volume: number;
  length: number;
  breadth: number;
  height: number;
  W: number;
  R: number;
  Z: number;
  W_Vol: number;
  Pso_front: number;
  Pso_back: number;
  Pso_side: number;
}

export async function runVentedAnalysis(
  cubicleProps: CubicleProps,
  p_02_168: GrfCurve
): Promise<ResultProps> {
  const { l, b, h } = cubicleProps;
  
  const vol = l * b * h; 

  const Z  = calculateScaledDistance(cubicleProps.chargeWeight, cubicleProps.chargeStandoff); 

  const front_curve = p_02_168.curves.find(c => c.curve_name === "Front");
  const back_curve = p_02_168.curves.find(c => c.curve_name === "Back");
  const side_curve = p_02_168.curves.find(c => c.curve_name === "Side");

  const Pso_front = interpLinear(Z, front_curve!.xdata, front_curve!.ydata);
  const Pso_back = interpLinear(Z, back_curve!.xdata, back_curve!.ydata);
  const Pso_side = interpLinear(Z, side_curve!.xdata, side_curve!.ydata);

  return {
    volume: vol, 
    length: l,
    breadth: b,
    height: h,
    W: cubicleProps.chargeWeight,
    R: cubicleProps.chargeStandoff,
    Z : Z,
    W_Vol : (cubicleProps.chargeWeight / vol).toFixed(2) as unknown as number,
    Pso_front: Pso_front,
    Pso_back: Pso_back,
    Pso_side: Pso_side
  };
}
