export const CubicleTypes = {
  CantileverWall: 'Cantilever-Wall',
  TwoAdjacentWalls: 'Two-Adjacent-Walls',
  TwoAdjacentWallsWithRoof: 'Two-Adjacent-Walls-With-Roof',
  ThreeWalls: 'Three-Walls',
  ThreeWallsWithRoof: 'Three-Walls-With-Roof',
  FourWalls: 'Four-Walls',
  FourWallsWithRoof: 'Four-Walls-With-Roof'
} as const;

export const TargetType = {
  FullWall: 'Full-Wall',
  Strip: 'Strip',
  Object: 'Object'
} as const;

export const TargetFaceType = {
  BackWall: 'Back-Wall',
  SideWall: 'Side-Wall',
  Roof: 'Roof'
} as const;

//  Iterable + display labels, derived automatically
export const CUBICLE_TYPES = Object.entries(CubicleTypes).map(([key, value]) => ({
  value,
  label: key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, s => s.toUpperCase())
}));

export const TARGET_TYPES = Object.entries(TargetType).map(([key, value]) => ({
  value,
  label: key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, s => s.toUpperCase())
}));

export const TARGET_FACES = Object.entries(TargetFaceType).map(([key, value]) => ({
  value,
  label: key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, s => s.toUpperCase())
}));
