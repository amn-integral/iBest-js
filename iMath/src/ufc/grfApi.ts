/**
 * GRF API Client
 * 
 * Provides functions to fetch GRF curve data from the backend API
 */

import type { Curve, GRFCurve } from "./types";

/**
 * Configuration for the GRF API
 */
export interface GRFApiConfig {
  /** Base URL for the API (default: http://127.0.0.1:8000) */
  baseUrl?: string;
  /** Endpoint path (default: /api/grf/data/) */
  endpoint?: string;
}

/**
 * Default API configuration
 * Uses Vite environment variables with fallbacks
 */
const DEFAULT_CONFIG: Required<GRFApiConfig> = {
  baseUrl: import.meta.env.VITE_GRF_API_BASE_URL || "http://127.0.0.1:8000",
  endpoint: import.meta.env.VITE_GRF_API_ENDPOINT || "/api/grf/data/",
};

/**
 * Response structure from the GRF API
 */
interface GRFApiResponse {
  filename: string;
  xlabel: string;
  ylabel: string;
  curves: Array<{
    curve_name: string;
    xdata: number[];
    ydata: number[];
    num_points: number;
  }>;
}

/**
 * Fetch GRF curve data from the API
 * 
 * @param filename - The GRF filename to fetch (e.g., "02_154.GRF")
 * @param config - Optional API configuration
 * @returns Promise resolving to GRFCurve data
 * 
 * @example
 * ```ts
 * const data = await getGRFApi("02_154.GRF");
 * console.log(data.curves.length);
 * ```
 */
export async function getGRFApi(
  filename: string = "02_154.GRF",
  config?: GRFApiConfig
): Promise<GRFCurve> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const url = `${cfg.baseUrl}${cfg.endpoint}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename }),
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data: GRFApiResponse = await response.json();

    // Transform API response to GRFCurve type
    const grfCurve: GRFCurve = {
      filename: data.filename,
      xlabel: data.xlabel,
      ylabel: data.ylabel,
      curves: data.curves.map(
        (curve): Curve => ({
          curveName: curve.curve_name,
          xdata: curve.xdata,
          ydata: curve.ydata,
          numPoints: curve.num_points,
        })
      ),
    };

    return grfCurve;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch GRF data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Configure the default API settings
 * 
 * @param config - New default configuration
 */
export function configureGRFApi(config: GRFApiConfig): void {
  if (config.baseUrl !== undefined) {
    DEFAULT_CONFIG.baseUrl = config.baseUrl;
  }
  if (config.endpoint !== undefined) {
    DEFAULT_CONFIG.endpoint = config.endpoint;
  }
}
