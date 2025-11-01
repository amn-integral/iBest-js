// export type InitialConditions = {
//     u0: number; // Initial displacement
//     v0: number; // Initial velocity
// }

// export type SolverSettings = {
//     t: number; // Total time
//     dt: number // Time step (if auto is false)
//     auto: boolean; // Whether to use automatic time stepping
// };

// export type NewmarkParameters = {
//     gamma: number;
//     beta: number;
// };

export interface NewmarkResponseV2 {
  t: Float32Array;
  u: Float32Array;
  v: Float32Array;
  a: Float32Array;
  k: Float32Array;
  fs: Float32Array;
  p: Float32Array;
  summary:{
    u: { min: number; max: number},
    fs: { min: number; max: number}
  }
}