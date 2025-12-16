/**
 * GRF Pipeline Module
 *
 * Provides a pipeline-based workflow for processing GRF curves with operations like:
 * - Data fetching and filtering
 * - Interpolation at specific parameter values
 * - Combining curves by common parameters
 */

import type { GRFCurve } from './types';
import { extractFiltersFromFilename } from './utils';
import { interpolateGRF, evalGRFSingleAndCache } from './grfInterpolator';

/**
 * Extended GRFCurve with filter metadata
 */
export interface FilteredGRFCurve extends GRFCurve {
  filters?: Record<string, number | string>;
}

/**
 * Pipeline for processing GRF curves through multiple transformation steps
 *
 * @example
 * ```ts
 * const pipeline = new GRFPipeline(['curve1.GRF', 'curve2.GRF']);
 * await pipeline.getData(['N', 'l/L', 'h/H']);
 * pipeline.filterData('N', 2.0);
 * pipeline.interpolate(5.33, 'Za');
 * const result = pipeline.evaluate(6.0);
 * ```
 */
export class GRFPipeline {
  /** Map of pipeline steps to their data */
  private data: Map<number, Record<string, FilteredGRFCurve>>;

  /** Current step count in the pipeline */
  private pipelineStepCount: number;

  /** List of curve names to process */
  private curveNames: string[];

  /** Function to fetch GRF data by name */
  private fetchGRFData: (name: string) => Promise<GRFCurve> | GRFCurve;

  /**
   * Create a new GRF processing pipeline
   *
   * @param curveNames - Array of curve names/identifiers to process
   * @param fetchGRFData - Function to fetch GRF data by name (async or sync)
   */
  constructor(curveNames: string[], fetchGRFData: (name: string) => Promise<GRFCurve> | GRFCurve) {
    this.curveNames = curveNames;
    this.fetchGRFData = fetchGRFData;
    this.data = new Map();
    this.pipelineStepCount = 0;
  }

  /**
   * Fetch GRF data for all curve names and extract filter metadata
   *
   * @param filterList - List of filter keys to extract from filenames
   */
  async getData(filterList: string[]): Promise<void> {
    this.pipelineStepCount++;
    this.data.set(this.pipelineStepCount, {});

    const stepData = this.data.get(this.pipelineStepCount)!;

    for (const name of this.curveNames) {
      const grfCurve = await this.fetchGRFData(name);
      const filteredCurve: FilteredGRFCurve = {
        ...grfCurve,
        filters: extractFiltersFromFilename(grfCurve.filename, filterList)
      };
      filteredCurve.filename = JSON.stringify(filteredCurve.filters);
      stepData[name] = filteredCurve;
    }
  }

  /**
   * Filter curves by a specific parameter value
   *
   * @param filterKey - The filter parameter to match
   * @param filterValue - The value to filter by
   */
  filterData(filterKey: string, filterValue: number | string): void {
    this.pipelineStepCount++;
    const previousData = this.data.get(this.pipelineStepCount - 1)!;

    const filtered: Record<string, FilteredGRFCurve> = {};

    for (const [key, value] of Object.entries(previousData)) {
      if (value.filters?.[filterKey] === filterValue) {
        filtered[key] = value;
      }
    }

    this.data.set(this.pipelineStepCount, filtered);
  }

  /**
   * Interpolate all curves at a specific parameter value
   *
   * @param interpolationValue - The value to interpolate at
   * @param interpolationName - Name of the parameter being interpolated
   */
  interpolate(interpolationValue: number, interpolationName: string): void {
    this.pipelineStepCount++;
    const previousData = this.data.get(this.pipelineStepCount - 1)!;
    const newData: Record<string, FilteredGRFCurve> = {};

    for (const [cname, grfCurve] of Object.entries(previousData)) {
      const interpolatedCurve = interpolateGRF(grfCurve, String(interpolationValue));
      interpolatedCurve.curveName = String(interpolationValue);

      const newGrfCurve: FilteredGRFCurve = {
        filename: `${grfCurve.filename}\nInterpolated at ${interpolationName}=${interpolationValue}`,
        xlabel: grfCurve.xlabel,
        ylabel: grfCurve.ylabel,
        curves: [interpolatedCurve],
        filters: { ...grfCurve.filters }
      };

      newData[cname] = newGrfCurve;
    }

    this.data.set(this.pipelineStepCount, newData);
  }

  /**
   * Combine curves by grouping them by a common parameter
   *
   * @param combineKey - The parameter to use as the legend/grouping key
   * @param nameAppend - Text to append to the combined curve filename
   */
  combineBy(combineKey: string, nameAppend: string): void {
    this.pipelineStepCount++;
    const previousData = this.data.get(this.pipelineStepCount - 1)!;
    const newData: Record<string, FilteredGRFCurve> = {};
    const nameSet = new Set<string>();

    for (const grfCurve of Object.values(previousData)) {
      // Assert single curve per GRF
      if (grfCurve.curves.length !== 1) {
        throw new Error(`Expected single curve in GRFCurve, got ${grfCurve.curves.length}`);
      }

      const legend = grfCurve.filters?.[combineKey];

      // Create a copy of filters without the combine key
      const newFilters = { ...grfCurve.filters };
      delete newFilters[combineKey];

      const filename = JSON.stringify(newFilters);
      const fullFilename = `${filename}\n${nameAppend}\nLegend for ${combineKey}`;

      // Update the curve's name to be the legend value
      const curve = { ...grfCurve.curves[0] };
      curve.curveName = String(legend);

      if (nameSet.has(filename)) {
        // Add curve to existing GRF
        newData[filename].curves.push(curve);
      } else {
        // Create new GRF entry
        newData[filename] = {
          filename: fullFilename,
          xlabel: grfCurve.xlabel,
          ylabel: grfCurve.ylabel,
          curves: [curve],
          filters: newFilters
        };
        nameSet.add(filename);
      }
    }

    this.data.set(this.pipelineStepCount, newData);
  }

  /**
   * Evaluate the current pipeline result at a specific x-point
   *
   * @param xPoint - The x-value at which to evaluate
   * @param extendFactor - Optional factor to extend curve range (default 1.0)
   * @returns The interpolated y-value
   */
  evaluate(xPoint: number, extendFactor: number = 1.0): number {
    const currentData = this.data.get(this.pipelineStepCount);
    if (!currentData) {
      throw new Error('No data available at current pipeline step');
    }

    const curves = Object.values(currentData);
    if (curves.length === 0) {
      throw new Error('No curves available for evaluation');
    }

    return evalGRFSingleAndCache(curves, xPoint, extendFactor);
  }

  /**
   * Get the current step count
   */
  getCurrentStep(): number {
    return this.pipelineStepCount;
  }

  /**
   * Get data at a specific pipeline step
   *
   * @param step - The step number to retrieve (defaults to current step)
   * @returns The data at the specified step
   */
  getDataAtStep(step?: number): Record<string, FilteredGRFCurve> | undefined {
    const targetStep = step ?? this.pipelineStepCount;
    return this.data.get(targetStep);
  }

  /**
   * Get all curves from the current pipeline step as an array
   */
  getCurrentCurves(): FilteredGRFCurve[] {
    const currentData = this.data.get(this.pipelineStepCount);
    return currentData ? Object.values(currentData) : [];
  }

  /**
   * Reset the pipeline to start over
   */
  reset(): void {
    this.data.clear();
    this.pipelineStepCount = 0;
  }
}
