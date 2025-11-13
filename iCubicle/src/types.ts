import { CubicleTypes } from './constants';

//  Type automatically inferred from values above
export type CubicleType = (typeof CubicleTypes)[keyof typeof CubicleTypes];
