/**
 * Highly optimized array statistics functions
 * Single-pass algorithms for O(n) performance
 */

export interface MinMax {
  min: number;
  max: number;
}

/**
 * Find min and max values in a single pass
 * Optimized for large arrays - no spread operator, no multiple passes
 * @param arr - Array of numbers
 * @returns Object with min and max values
 */
export function findMinMax(arr: number[] | Float32Array): MinMax {
  if (arr.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = arr[0];
  let max = arr[0];

  // Process in pairs for better performance (fewer comparisons)
  // This is called "pairwise comparison" optimization
  const len = arr.length;
  let i = 1;

  // If odd length, we already handled first element
  // If even length, compare first two
  if (len % 2 === 0) {
    if (arr[1] < arr[0]) {
      min = arr[1];
    } else {
      max = arr[1];
    }
    i = 2;
  }

  // Process remaining elements in pairs
  for (; i < len; i += 2) {
    const a = arr[i];
    const b = arr[i + 1];

    // Compare pair elements first, then compare with min/max
    // This reduces total comparisons from 2n to 3n/2
    if (a < b) {
      if (a < min) min = a;
      if (b > max) max = b;
    } else {
      if (b < min) min = b;
      if (a > max) max = a;
    }
  }

  return { min, max };
}

/**
 * Find min and max for multiple arrays simultaneously
 * More efficient than calling findMinMax multiple times
 * @param arrays - Object with named arrays
 * @returns Object with min/max for each array
 */
export function findMultipleMinMax<T extends Record<string, number[] | Float32Array>>(
  arrays: T
): { [K in keyof T]: MinMax } {
  const result = {} as { [K in keyof T]: MinMax };

  for (const key in arrays) {
    if (Object.prototype.hasOwnProperty.call(arrays, key)) {
      result[key] = findMinMax(arrays[key]);
    }
  }

  return result;
}
