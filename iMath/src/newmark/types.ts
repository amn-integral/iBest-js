export interface BackbonePoint {
  displacement: number;
  resistance: number;
  klm?: number;
}

export interface InitialConditions {
  u0: number;
  v0: number;
}

export interface SolverSettings {
  t: number;
  dt?: number;
  auto?: boolean;
}

export interface NewmarkParameters {
  gamma: number;
  beta: number;
}

export interface NewmarkResponse {
  time: number[];
  displacement: number[];
  velocity: number[];
  acceleration: number[];
  stiffness: number[];
  restoringForce: number[];
  appliedForce: number[];
}