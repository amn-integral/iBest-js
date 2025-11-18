export type PostData = {
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

export type ResultData = {
  inputs: PostData;
  pressure: number;
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
