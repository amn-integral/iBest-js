/**
 * Type definitions for GRF (Gas Response Function) curves
 */

/**
 * Represents a single curve with x-y data points
 */
export interface Curve {
  /** Name or identifier for this curve */
  curveName: string;
  /** X-axis data points */
  xdata: number[];
  /** Y-axis data points corresponding to xdata */
  ydata: number[];
  /** Number of data points in the curve */
  numPoints: number;
}

/**
 * Represents a complete GRF curve dataset containing multiple curves
 */
export interface GRFCurve {
  /** Source filename for this GRF data */
  filename: string;
  /** Label for the x-axis */
  xlabel: string;
  /** Label for the y-axis */
  ylabel: string;
  /** Array of curves in this dataset */
  curves: Curve[];
}
