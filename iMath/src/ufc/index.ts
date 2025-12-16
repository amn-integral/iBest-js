/**
 * UFC (Unified Facilities Criteria) Module
 *
 * Provides utilities for working with GRF (Gas Response Function) curves,
 * including interpolation, evaluation, and utility functions.
 */

// Export types
export type { Curve, GRFCurve } from './types';
export type { FilteredGRFCurve } from './grfPipeline';
export type { GRFApiConfig } from './grfApi';

// Export GRF API functions
export { getGRFApi, configureGRFApi } from './grfApi';

// Export GRF interpolation functions
export { logspace, linearInterp, interpolateGRF, evalGRFSingleAndCache } from './grfInterpolator';

// Export pipeline class
export { GRFPipeline } from './grfPipeline';

// Export utility functions
export { extractFiltersFromFilename, breakLine, newLine } from './utils';
