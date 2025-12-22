import type { CubicleType, TargetFaceType } from '../types';

export interface CubicleRequest {
  cubicle_type: CubicleType;
  target_wall: TargetFaceType;
  Lc: number;
  Wc: number;
  Hc: number;
  Utilization?: number;
  X: number;
  Y: number;
  Z: number;
  Wo: number;
  Ho: number;
  W: number;
  Wf: number;
}

export interface CubicleResponse {
  success: boolean;
  result?: {
    CalculatedParams: CubicleCalculatedParams;
    ShockPressureSteps: Record<number, GRFPipelineCurve[]>;
    GasPressureSteps: Record<number, GRFPipelineCurve[]>;
    ShockImpulseSteps: Record<number, GRFPipelineCurve[]>;
    GasImpulseSteps: Record<number, GRFPipelineCurve[]>;
    FinalChart: {
      curves: Array<{ curve_name: string; xdata: number[]; ydata: number[]; num_points: number }>;
      filename: string;
      xlabel: string;
      ylabel: string;
    };
    InputParams?: CubicleInputType;
  };
  message?: string;
}

export interface GRFPipelineCurve {
  curves: Array<{
    curve_name: string;
    xdata: number[];
    ydata: number[];
    num_points: number;
  }>;
  filename: string;
  xlabel: string;
  ylabel: string;
  filters?: Record<string, number>;
}

export interface CubicleCalculatedParams {
  Ra: number;
  N: number;
  h_over_H: number;
  l_over_L: number;
  Ra_over_W_cube_root: number;
  Ig_over_W_cube_root: number;
  ir_over_W_cube_root: number;
  L_over_Ra: number;
  L_over_H: number;
  W_over_Vf: number;
  A_over_Vf_cube_root_squared: number;
  Wf_over_W_cube_root: number;
  A: number;
  Ps: number;
  Is: number;
  Ts: number;
  Pg: number;
  Ig: number;
  Tg: number;
}

export interface CubicleInputType {
  cubicle_type: string;
  target_wall: number;
  Lc: number;
  Wc: number;
  Hc: number;
  Utilization: number;
  X: number;
  Y: number;
  Z: number;
  Wo: number;
  Ho: number;
  W: number;
  Wf: number;
}
