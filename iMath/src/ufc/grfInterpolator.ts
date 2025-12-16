/**
 * GRF Curve Interpolation Module
 *
 * Provides utilities for interpolating and evaluating GRF (Gas Response Function) curves
 * in log-log space, with support for extrapolation and curve extension.
 */

import type { Curve, GRFCurve } from './types';

/**
 * Generate logarithmically spaced points
 * Pure TypeScript replacement for numpy's logspace
 *
 * @param start - Starting exponent (base 10)
 * @param stop - Ending exponent (base 10)
 * @param num - Number of points to generate
 * @returns Array of logarithmically spaced values
 */
export function logspace(start: number, stop: number, num: number): number[] {
  if (num <= 0) {
    return [];
  }
  if (num === 1) {
    return [10 ** start];
  }
  const step = (stop - start) / (num - 1);
  return Array.from({ length: num }, (_, i) => 10 ** (start + step * i));
}

/**
 * Linear interpolation/extrapolation
 * Pure TypeScript replacement for scipy's interp1d
 *
 * @param xVals - X values (must be sorted in ascending order)
 * @param yVals - Y values corresponding to xVals
 * @param xTarget - Target x value to interpolate/extrapolate
 * @returns Interpolated/extrapolated y value
 */
export function linearInterp(xVals: number[], yVals: number[], xTarget: number): number {
  if (xVals.length !== yVals.length) {
    throw new Error('xVals and yVals must have the same length');
  }

  if (xVals.length === 0) {
    throw new Error('Empty data arrays');
  }

  if (xVals.length === 1) {
    return yVals[0];
  }

  // If xTarget is before first point, extrapolate using first two points
  if (xTarget <= xVals[0]) {
    const x0 = xVals[0];
    const x1 = xVals[1];
    const y0 = yVals[0];
    const y1 = yVals[1];
    const slope = (y1 - y0) / (x1 - x0);
    return y0 + slope * (xTarget - x0);
  }

  // If xTarget is after last point, extrapolate using last two points
  if (xTarget >= xVals[xVals.length - 1]) {
    const x0 = xVals[xVals.length - 2];
    const x1 = xVals[xVals.length - 1];
    const y0 = yVals[yVals.length - 2];
    const y1 = yVals[yVals.length - 1];
    const slope = (y1 - y0) / (x1 - x0);
    return y1 + slope * (xTarget - x1);
  }

  // Find the two points that bracket xTarget
  for (let i = 0; i < xVals.length - 1; i++) {
    if (xVals[i] <= xTarget && xTarget <= xVals[i + 1]) {
      const x0 = xVals[i];
      const x1 = xVals[i + 1];
      const y0 = yVals[i];
      const y1 = yVals[i + 1];
      // Linear interpolation
      const t = (xTarget - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }

  throw new Error(`Could not interpolate xTarget=${xTarget}`);
}

/**
 * Constructs a new GRF curve by interpolating (or extrapolating) between nearest existing curves
 * in log-log space. The new curve extends across the combined x-range of its parent curves.
 *
 * @param data - GRFCurve object containing multiple curves
 * @param curveName - Name/value of the curve to create (as string)
 * @param extendFactor - Factor to extend x-range (default 1.0)
 * @returns Curve object with interpolated data
 */
export function interpolateGRF(data: GRFCurve, curveName: string, extendFactor: number = 1.0): Curve {
  // --- Convert curve names to floats ---
  const existing: Array<[number, Curve]> = [];
  for (const c of data.curves) {
    const val = parseFloat(c.curveName);
    if (!isNaN(val)) {
      existing.push([val, c]);
    }
  }

  if (existing.length === 0) {
    throw new Error('No numeric curve names found for interpolation.');
  }

  if (existing.length === 1) {
    // Nothing to interpolate between; just return a copy of that single curve
    const [, singleCurve] = existing[0];
    return {
      curveName: String(curveName),
      xdata: [...singleCurve.xdata],
      ydata: [...singleCurve.ydata],
      numPoints: singleCurve.xdata.length
    };
  }

  existing.sort((a, b) => a[0] - b[0]);

  const paramNew = parseFloat(curveName);
  const params = existing.map(([p]) => p);

  // --- Identify bounding curves (supports extrapolation) ---
  let p1: number, c1: Curve, p2: number, c2: Curve;

  if (paramNew <= params[0]) {
    [p1, c1] = existing[0];
    [p2, c2] = existing[1];
  } else if (paramNew >= params[params.length - 1]) {
    [p1, c1] = existing[existing.length - 2];
    [p2, c2] = existing[existing.length - 1];
  } else {
    // Find bracketing curves
    [p1, c1] = existing[0];
    [p2, c2] = existing[1];
    for (let i = 0; i < existing.length - 1; i++) {
      [p1, c1] = existing[i];
      [p2, c2] = existing[i + 1];
      if (p1 <= paramNew && paramNew <= p2) {
        break;
      }
    }
  }

  // --- Determine extended x-range ---
  const xMin = Math.min(Math.min(...c1.xdata), Math.min(...c2.xdata)) / extendFactor;
  const xMax = Math.max(Math.max(...c1.xdata), Math.max(...c2.xdata)) * extendFactor;
  const xCommon = logspace(Math.log10(xMin), Math.log10(xMax), 400);

  // --- Helper: interpolate one curve in log-log space ---
  const interpCurve = (c: Curve): number[] => {
    // Filter positive values only
    const validData = c.xdata.map((x: number, i: number) => [x, c.ydata[i]] as [number, number]).filter(([x, y]: [number, number]) => x > 0 && y > 0);

    if (validData.length === 0) {
      throw new Error('Curve has no valid positive data');
    }

    // Sort by x
    validData.sort((a: [number, number], b: [number, number]) => a[0] - b[0]);
    const x = validData.map(([xi]: [number, number]) => xi);
    const y = validData.map(([, yi]: [number, number]) => yi);

    // Convert to log space
    const logX = x.map((xi: number) => Math.log10(xi));
    const logY = y.map((yi: number) => Math.log10(yi));

    // Interpolate for each point in xCommon
    const result: number[] = [];
    for (const xVal of xCommon) {
      const logXVal = Math.log10(xVal);
      const logYVal = linearInterp(logX, logY, logXVal);
      result.push(10 ** logYVal);
    }

    return result;
  };

  const y1 = interpCurve(c1);
  const y2 = interpCurve(c2);

  // --- Interpolation or extrapolation weight ---
  let w: number;
  if (p1 > 0 && p2 > 0 && paramNew > 0) {
    // Logarithmic interpolation for positive parameters
    w = (Math.log10(paramNew) - Math.log10(p1)) / (Math.log10(p2) - Math.log10(p1));
  } else {
    // Linear interpolation if zero present
    w = (paramNew - p1) / (p2 - p1);
  }

  // Allow extrapolation weight to go outside [0, 1]
  // (clipping would disable extrapolation)

  // --- Interpolate/extrapolate between curves ---
  const logYNew = y1.map((y1i, i) => Math.log10(y1i) * (1 - w) + Math.log10(y2[i]) * w);
  const yNew = logYNew.map(logYi => 10 ** logYi);

  // --- Construct and return new curve ---
  const newCurve: Curve = {
    curveName: String(curveName),
    xdata: xCommon,
    ydata: yNew,
    numPoints: xCommon.length
  };

  return newCurve;
}

/**
 * Evaluate y(xPoint) for a GRFCurve that contains a *single* Curve.
 *
 * - Uses log-log interpolation/extrapolation in x.
 * - If extendFactor > 1, it will build an extended x-grid
 *   [xMin/extendFactor, xMax*extendFactor] (log-spaced),
 *   interpolate the original curve onto that grid,
 *   and replace data.curves[0] with this extended curve.
 *
 * @param data - GRFCurve object (or array containing one) with a single curve
 * @param xPoint - Point at which to evaluate the curve
 * @param extendFactor - Factor to extend the curve range (default 1.0)
 * @returns Interpolated/extrapolated y value at xPoint
 */
export function evalGRFSingleAndCache(data: GRFCurve | GRFCurve[], xPoint: number, extendFactor: number = 1.0): number {
  // Handle both array input and direct GRFCurve input
  let dataObj: GRFCurve;
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error('Empty data list');
    }
    dataObj = data[0];
  } else {
    dataObj = data;
  }

  if (dataObj.curves.length === 0) {
    throw new Error('GRFCurve has no curves.');
  }

  // Always work from the (current) single curve
  const baseCurve = dataObj.curves[0];

  // Filter for positive values only
  const validData = baseCurve.xdata
    .map((x: number, i: number) => [x, baseCurve.ydata[i]] as [number, number])
    .filter(([x, y]: [number, number]) => x > 0 && y > 0);

  if (validData.length === 0) {
    throw new Error('Curve has no valid positive x/y values for log-log interpolation.');
  }

  // Sort by x
  validData.sort((a: [number, number], b: [number, number]) => a[0] - b[0]);
  const xdata = validData.map(([x]: [number, number]) => x);
  const ydata = validData.map(([, y]: [number, number]) => y);

  // Build interp in log-log space on the *original* grid
  const logX = xdata.map((x: number) => Math.log10(x));
  const logY = ydata.map((y: number) => Math.log10(y));

  // ------------------------------------------------------------------
  // 1) Evaluate y at the requested xPoint
  // ------------------------------------------------------------------
  const logYPoint = linearInterp(logX, logY, Math.log10(xPoint));
  const yPoint = 10.0 ** logYPoint;

  // ------------------------------------------------------------------
  // 2) Optionally build an extended curve and cache it back into data
  // ------------------------------------------------------------------
  if (extendFactor !== 1.0) {
    const xMin = Math.min(...xdata) / extendFactor;
    const xMax = Math.max(...xdata) * extendFactor;
    const xCommon = logspace(Math.log10(xMin), Math.log10(xMax), 400);

    const yCommon: number[] = [];
    for (const xVal of xCommon) {
      const logYVal = linearInterp(logX, logY, Math.log10(xVal));
      yCommon.push(10.0 ** logYVal);
    }

    const extendedCurve: Curve = {
      curveName: baseCurve.curveName + ' (extended)',
      xdata: xCommon,
      ydata: yCommon,
      numPoints: xCommon.length
    };

    // Replace the original curve with the extended one
    dataObj.curves[0] = extendedCurve;
  }

  return yPoint;
}
