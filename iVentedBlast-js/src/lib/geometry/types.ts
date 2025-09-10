import * as THREE from 'three';

/** Which face of the cubicle */
export type Side = 'floor' | 'roof' | 'front' | 'back' | 'left' | 'right';

/** Single rectangular opening in plane-local coords */
export type HoleOpening = {
  /** opening width */
  w: number;
  /** opening height */
  h: number;
  /** optional left offset; centered if omitted */
  x?: number;
  /** optional bottom offset; centered if omitted */
  y?: number;
};

/** Options for creating a single plane */
export type PlaneOptions = {
  /** plane width and height in its local XY (0..width, 0..h) */
  width: number;
  height: number;

  /** orientation (plane normal) and anchor position for local (0,0) corner */
  normal: THREE.Vector3;
  pos: THREE.Vector3;
  uHint?: THREE.Vector3; // Used to orient the text on the plane

  /** optional material for the plane */
  material?: THREE.Material;

  /**
   * Optional rectangular opening (or multiple).
   * If x/y are omitted, the opening is centered by default.
   */
  opening?: HoleOpening | HoleOpening[];

  name?: string;
};

/** Result from creating a plane */
export type PlaneResult = {
  /** The plane mesh */
  mesh: THREE.Mesh;
  /** Corner and edge node positions */
  nodes: THREE.Vector3[];
  /** Opening corner positions (for opening nodes) */
  openingNodes?: THREE.Vector3[];
};

/** Options for creating a full cubicle */
export type CubicleOptions = {
  /** inner dimensions: length (X), breadth/width (Y), height (Z) */
  l: number;
  b: number;
  h: number;

  /** which sides to draw; default = all six */
  sides?: Side[];

  /**
   * holes to cut on specific sides.
   * Opening coords are in that side's LOCAL plane:
   * - front/back (YZ): x→Y [0..b], y→Z [0..h]
   * - left/right (XZ): x→X [0..l], y→Z [0..h]
   * - floor/roof (XY): x→X [0..l], y→Y [0..b]
   */
  openings?: Partial<Record<Side, HoleOpening | HoleOpening[]>>;

  /** shared material for all planes (fallback provided) */
  material?: THREE.Material;

  /** slide specific sides along their normal */
  offsets?: Partial<Record<Side, number>>;
};
