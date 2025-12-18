import { BackboneCurveV2, ForceCurveV2, newmarkSolverV2, type NewmarkResponseV2 } from '@integralrsg/imath';

import type { SolverWorkerInputV2, SolverWorkerErrorV2, SolverWorkerOutputV2 } from '../types';

// Enable debugging for development
const DEBUG = false; // Set to false for production

function debugLog(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[SolverWorkerV2] ${message}`, data || '');
  }
}

// Worker message handler
self.onmessage = function (e: MessageEvent<SolverWorkerInputV2>) {
  const input = e.data;
  debugLog('Worker received input:', {
    mass: input.mass,
    klm: input.klm,
    dampingRatio: input.dampingRatio,
    resistanceLength: input.resistance.length,
    displacementLength: input.displacement.length,
    forceLength: input.force.length,
    timeLength: input.time.length
  });

  try {
    const start = performance.now();

    const backbone = new BackboneCurveV2(input.resistance, input.displacement);

    // Create force curve
    const force = new ForceCurveV2(input.time, input.force);

    // Run the solver
    const response: NewmarkResponseV2 = newmarkSolverV2(
      input.mass,
      input.klm,
      backbone,
      input.dampingRatio,
      force,
      input.initialConditions,
      input.solverSettings,
      input.gravity_effect,
      input.added_weight,
      input.gravity_constant
    );

    // Add validation for the Web Worker result
    if (!response) {
      throw new Error('Web Worker returned invalid response');
    }
    const runtime = performance.now() - start;
    const tLength = response.t.length;
    const uLength = response.u.length;
    // Add validation that arrays have data
    if (!tLength || !uLength) {
      throw new Error('Solver returned empty data arrays');
    }

    if (tLength !== uLength) {
      throw new Error('Time and displacement data arrays have mismatched lengths');
    }

    const result: SolverWorkerOutputV2 = {
      success: true,
      response,
      runtimeMs: runtime
    };

    self.postMessage(result);
  } catch (error) {
    const errorResult: SolverWorkerErrorV2 = { success: false, error: error instanceof Error ? error.message : String(error) };
    self.postMessage(errorResult);
  }
};
