interface CubicleRequest {
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

async function fetchCubicleData(data: CubicleRequest): Promise<CubicleResponse> {
  const API_ROUTE = '/api/cubicle';

  try {
    const response = await fetch(API_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    return result as CubicleResponse;
  } catch (error) {
    return {
      success: false,
      message: String(error)
    };
  }
}
