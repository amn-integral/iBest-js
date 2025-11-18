import { type InitialConditions, type SolverSettings, type NewmarkResponseV2 } from '@integralrsg/imath';

export type BackboneRow = {
  id: number;
  displacement: string;
  resistance: string;
  klm: string;
};

export type BackboneNumeric = {
  displacement: number;
  resistance: number;
  klm: number;
};

export type ForceRow = {
  id: number;
  time: string;
  force: string;
};

export type ForceNumeric = {
  time: number;
  force: number;
};

export type SolverSummary = {
  maxDisplacement: number;
  runtimeMs: number;
  steps: number;
};

export interface SolverWorkerInputV2 {
  mass: number;
  klm: number;
  resistance: number[];
  displacement: number[];
  dampingRatio: number;
  force: number[];
  time: number[];
  initialConditions: InitialConditions;
  solverSettings: SolverSettings;
  gravity_effect: boolean;
  added_weight: number;
  gravity_constant: number;
}

export interface SolverWorkerOutputV2 {
  success: true;
  response: NewmarkResponseV2;
  runtimeMs: number;
}

export interface SolverWorkerErrorV2 {
  success: false;
  error: string;
}
