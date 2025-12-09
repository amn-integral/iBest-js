import { CubicleType, TargetFaceType } from '../types';

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
    Params: Map<string, number>;
    Chart: {
      curves: Array<{ curve_name: string; xdata: number[]; ydata: number[]; num_points: number }>;
      filename: string;
      xlabel: string;
      ylabel: string;
    };
  };
  message?: string;
}
