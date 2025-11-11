export interface NewmarkResponseV2 {
  t: Float32Array;
  u: Float32Array;
  v: Float32Array;
  a: Float32Array;
  k: Float32Array;
  fs: Float32Array;
  p: Float32Array;
  steps: number;
  summary:{
    u: { min: number; max: number},
    fs: { min: number; max: number}
  }
}