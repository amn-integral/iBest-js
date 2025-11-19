import { CubicleTypes, TargetType, TargetFaceType } from './constants';
//  Type automatically inferred from values above
export type CubicleType = (typeof CubicleTypes)[keyof typeof CubicleTypes];
export type TargetType = (typeof TargetType)[keyof typeof TargetType];
export type TargetFaceType = (typeof TargetFaceType)[keyof typeof TargetFaceType];
