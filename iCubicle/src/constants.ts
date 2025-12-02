export const CubicleTypes = {
  CantileverWall: 'Cantilever-Wall',
  TwoAdjacentWalls: 'Two-Adjacent-Walls',
  TwoAdjacentWallsWithRoof: 'Two-Adjacent-Walls-With-Roof',
  ThreeAdjacentWalls: 'Three-Adjacent-Walls',
  ThreeAdjacentWallsWithRoof: 'Three-Adjacent-Walls-With-Roof',
  FourAdjacentWalls: 'Four-Adjacent-Walls',
  FourAdjacentWallsWithRoof: 'Four-Adjacent-Walls-With-Roof'
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

export enum WallEnum {
  FLOOR = 0,
  WALL_1 = 1,
  WALL_2 = 2,
  WALL_3 = 3,
  WALL_4 = 4,
  ROOF = 5
}

export const CONFIG_OPTIONS = {
  [CubicleTypes.CantileverWall]: {
    Options_A: [WallEnum.WALL_1, WallEnum.FLOOR]
  },
  [CubicleTypes.TwoAdjacentWalls]: {
    Options_A: [WallEnum.WALL_1, WallEnum.WALL_2, WallEnum.FLOOR],
    Options_B: [WallEnum.WALL_1, WallEnum.WALL_4, WallEnum.FLOOR]
  },
  [CubicleTypes.TwoAdjacentWallsWithRoof]: {
    Options_A: [WallEnum.WALL_1, WallEnum.WALL_2, WallEnum.ROOF, WallEnum.FLOOR],
    Options_B: [WallEnum.WALL_1, WallEnum.WALL_4, WallEnum.ROOF, WallEnum.FLOOR]
  },
  [CubicleTypes.ThreeAdjacentWalls]: {
    Options_A: [WallEnum.WALL_1, WallEnum.WALL_2, WallEnum.WALL_4, WallEnum.FLOOR],
    Options_B: [WallEnum.WALL_1, WallEnum.WALL_2, WallEnum.WALL_3, WallEnum.FLOOR],
    Options_C: [WallEnum.WALL_1, WallEnum.WALL_4, WallEnum.WALL_3, WallEnum.FLOOR]
  },
  [CubicleTypes.ThreeAdjacentWallsWithRoof]: {
    Options_A: [WallEnum.WALL_1, WallEnum.WALL_2, WallEnum.WALL_4, WallEnum.FLOOR, WallEnum.ROOF],
    Options_B: [WallEnum.WALL_1, WallEnum.WALL_2, WallEnum.WALL_3, WallEnum.FLOOR, WallEnum.ROOF],
    Options_C: [WallEnum.WALL_1, WallEnum.WALL_4, WallEnum.WALL_3, WallEnum.FLOOR, WallEnum.ROOF]
  },
  [CubicleTypes.FourAdjacentWalls]: {
    Options_A: [WallEnum.WALL_1, WallEnum.WALL_2, WallEnum.WALL_3, WallEnum.WALL_4, WallEnum.FLOOR]
  },
  [CubicleTypes.FourAdjacentWallsWithRoof]: {
    Options_A: [WallEnum.WALL_1, WallEnum.WALL_2, WallEnum.WALL_3, WallEnum.WALL_4, WallEnum.FLOOR, WallEnum.ROOF]
  }
};

export const CUBICLE_CONFIGURATIONS = Object.entries(CONFIG_OPTIONS).map(([cubicleType, options]) => ({
  cubicleType,
  options: Object.entries(options).map(([optionName, walls]) => ({
    value: optionName,
    label: optionName.replace('_', ' '),
    walls: walls
  }))
}));
