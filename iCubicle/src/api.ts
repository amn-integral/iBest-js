import { CubicleType, TargetFaceType } from './types';

interface AppConfig {
  API_BASE_URL?: string;
}

declare global {
  interface Window {
    APP_CONFIG?: AppConfig;
  }
}

export interface CubicleRequest {
  cubicle_type: CubicleType;
  target_wall: TargetFaceType;
  wall_list: TargetFaceType[];
  Lc: number;
  Wc: number;
  Hc: number;
  X: number;
  Y: number;
  Z: number;
  Wo: number;
  Ho: number;
  W: number;
}

interface CubicleResponse {
  success: boolean;
  result?: {
    pressure: number;
    impulse: Record<string, number>;
    parameters: Record<string, number>;
    pressure_curves: Record<number, Array<{ curve_name: string; xdata: number[]; ydata: number[]; num_points: number }>>;
    impulse_curves: Record<number, Array<{ curve_name: string; xdata: number[]; ydata: number[]; num_points: number }>>;
  };
  message?: string;
}

export async function fetchCubicleData(data: CubicleRequest): Promise<CubicleResponse> {
  // API URL can be configured via Django template (window.APP_CONFIG)
  // In development, use relative path to leverage Vite proxy
  const apiUrl: string = window.APP_CONFIG?.API_BASE_URL || '/api/iCubicle/';
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });

    // Try to parse JSON response even if status is not ok
    const result: unknown = await response.json();

    console.log('Response Data:', result);
    if (!response.ok) {
      // If response has an error message, use it; otherwise use status text
      let message = `HTTP ${response.status}: ${response.statusText}`;
      if (typeof result === 'object' && result !== null) {
        const errorResult = result as { message?: string; error?: string };
        message = errorResult.message || errorResult.error || message;
      }
      return {
        success: false,
        message
      };
    }
    return result as CubicleResponse;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}
