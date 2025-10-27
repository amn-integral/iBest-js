/**
 * Web Worker for running the Newmark solver
 * This prevents UI blocking during long computations
 */

import {
  BackboneCurve,
  ForceCurve,
  newmarkSolver,
  averageAcceleration,
  findMultipleMinMax,
  type InitialConditions,
  type SolverSettings,
  type NewmarkParameters,
  type NewmarkResponse,
} from "@integralrsg/imath";

export interface SolverWorkerInput {
  mass: number;
  dampingRatio: number;
  totalTime: number;
  timeStep?: number;
  autoStep: boolean;
  orientation: "Vertical" | "Horizontal";
  gravity: number;
  length: number;
  inboundValidRows: Array<{
    displacement: number;
    resistance: number;
    klm: number;
  }>;
  reboundValidRows: Array<{
    displacement: number;
    resistance: number;
    klm: number;
  }>;
  forceValidRows: Array<{ time: number; force: number }>;
}

export interface SolverWorkerOutput {
  success: true;
  response: NewmarkResponse;
  bounds: {
    displacement: { min: number; max: number };
    velocity: { min: number; max: number };
    acceleration: { min: number; max: number };
    restoringForce: { min: number; max: number };
    appliedForce: { min: number; max: number };
  };
  rotationBounds: { min: number; max: number };
  rotationArray: number[];
  maxDisplacement: number;
  finalDisplacement: number;
  runtimeMs: number;
  totalPoints: number;
}

export interface SolverWorkerError {
  success: false;
  error: string;
}

// Worker message handler
self.onmessage = function (e: MessageEvent<SolverWorkerInput>) {
  const input = e.data;

  try {
    const start = performance.now();

    // Create backbone curve
    const backbone = new BackboneCurve(
      input.inboundValidRows,
      input.reboundValidRows
    );

    // Create force curve
    const force = new ForceCurve(
      input.forceValidRows.map((sample) => sample.time),
      input.forceValidRows.map((sample) => sample.force)
    );

    // Solver settings
    const initialConditions: InitialConditions = { u0: 0, v0: 0 };
    const solverSettings: SolverSettings = input.autoStep
      ? { t: input.totalTime, auto: true }
      : { t: input.totalTime, dt: input.timeStep!, auto: false };
    const newmarkParams: NewmarkParameters = averageAcceleration;

    // Run the solver
    const response: NewmarkResponse = newmarkSolver(
      input.mass,
      backbone,
      input.dampingRatio,
      force,
      initialConditions,
      solverSettings,
      newmarkParams,
      input.orientation === "Vertical" ? false : true, // gravity_effect
      0.0, // added_weight
      input.gravity
    );

    const runtime = performance.now() - start;

    // Calculate bounds efficiently
    const bounds = findMultipleMinMax({
      displacement: response.displacement,
      velocity: response.velocity,
      acceleration: response.acceleration,
      restoringForce: response.restoringForce,
      appliedForce: response.appliedForce,
    });

    // Calculate rotation array and bounds
    const rotationArray = response.displacement.map((disp) => {
      const angleRad = Math.atan(disp / input.length);
      return angleRad * (180 / Math.PI);
    });
    const rotationBounds = findMultipleMinMax({ rotation: rotationArray });

    const totalPoints = response.time.length;
    const maxDisplacement = bounds.displacement.max;
    const finalDisplacement = response.displacement[totalPoints - 1];

    const result: SolverWorkerOutput = {
      success: true,
      response,
      bounds,
      rotationBounds: rotationBounds.rotation,
      rotationArray,
      maxDisplacement,
      finalDisplacement,
      runtimeMs: runtime,
      totalPoints,
    };

    self.postMessage(result);
  } catch (error) {
    const errorResult: SolverWorkerError = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown solver error",
    };
    self.postMessage(errorResult);
  }
};
