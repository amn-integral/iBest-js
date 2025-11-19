import { CubicleType, TargetFaceType } from './types';

export interface CubicleRequest {
  cubicle_type: CubicleType;
  target_face: TargetFaceType;
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
    impulse: Map<string, number>;
    parameters: Map<string, number>;
  };
  message?: string;
}

export async function fetchCubicleData(data: CubicleRequest): Promise<CubicleResponse> {
  // API URL can be configured via Django template (window.APP_CONFIG)
  const apiUrl = (window as any).APP_CONFIG?.API_BASE_URL || '/api/iCubicle/';
  console.log('API URL:', apiUrl);
  console.log('Request Data:', data);
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
    const result = await response.json();

    if (!response.ok) {
      // If response has an error message, use it; otherwise use status text
      return {
        success: false,
        message: result.message || result.error || `HTTP ${response.status}: ${response.statusText}`
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
