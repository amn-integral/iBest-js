export const CubicleTypes = {
  CantileverWall: 'cantilever-wall',
  TwoAdjacentWalls: 'two-adjacent-walls',
  TwoAdjacentWallsWithRoof: 'two-adjacent-walls-with-roof',
  ThreeWalls: 'three-walls',
  ThreeWallsWithRoof: 'three-walls-with-roof',
  FourWalls: 'four-walls',
  FourWallsWithRoof: 'four-walls-with-roof'
} as const;

//  Iterable + display labels, derived automatically
export const CUBICLE_TYPES = Object.entries(CubicleTypes).map(([key, value]) => ({
  value,
  label: key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, s => s.toUpperCase())
}));
