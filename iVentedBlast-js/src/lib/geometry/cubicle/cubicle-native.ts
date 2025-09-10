import * as THREE from 'three';
import { makePlane } from '../plane/plane-native';
import type { CubicleOptions, Side } from '../types';
import { createNodesFromVectors } from '../nodes/nodes-native';

const ALL_SIDES: Side[] = ['floor', 'roof', 'front', 'back', 'left', 'right'];

/**
 * Build a cubicle aligned to +X,+Y,+Z:
 * spans (0,0,0) → (l,b,h).
 * Uses `makePlane` for each side; holes and side selection supported.
 */
export function makeCubicle(opts: CubicleOptions): THREE.Group {
  const { l, b, h, openings = {},  material } = opts;
  const sides: Side[] = opts.sides ?? ALL_SIDES;

  const group = new THREE.Group();
  group.name = 'CubicleNative';

  // helpers
  const has = (side: Side) => sides.includes(side);
  const hole = (side: Side) => openings[side];

  const nodes = [];
  // Floor (XY at z=0) normal +Z
  if (has('floor')) {
    const floorPlane = makePlane({
      width: l, height: b,
      normal: new THREE.Vector3(0, 0, -1),
      pos: new THREE.Vector3(l, 0, 0),
      uHint: new THREE.Vector3(-1, 0, 0),
      material,
      opening: hole('floor'),
      name: 'Floor'
    })

    group.add(
      floorPlane.mesh
    );
    nodes.push(...floorPlane.nodes, ...(floorPlane.openingNodes ?? []));
  }


  // Roof (XY at z=h) normal +Z
  if (has('roof')) {
    const roofPlane =
      makePlane({
        width: l, height: b,
        normal: new THREE.Vector3(0, 0, 1),
        pos: new THREE.Vector3(0, 0, h),
        uHint: new THREE.Vector3(1, 0, 0),
        material,
        opening: hole('roof'),
        name: 'Roof'
      })
    group.add(roofPlane.mesh);
    nodes.push(...roofPlane.nodes, ...(roofPlane.openingNodes ?? [])
    );
  }

  // Front (YZ at x=0) normal +X, size b × h
  if (has('front')) {
    const frontPlane =
      makePlane({
        width: b, height: h,
        normal: new THREE.Vector3(-1, 0, 0),
        pos: new THREE.Vector3(0, b, 0),
        uHint: new THREE.Vector3(0, -1, 0),
        material,
        opening: hole('front'),
        name: 'Front'
      })
    group.add(
      frontPlane.mesh
    );
    nodes.push(...frontPlane.nodes, ...(frontPlane.openingNodes ?? []));
  }

  // Back (YZ at x=l) normal −X, size b × h
  if (has('back')) {
    const backPlane = makePlane({
      width: b,
      height: h,
      normal: new THREE.Vector3(1, 0, 0),
      pos: new THREE.Vector3(l, 0, 0),
      uHint: new THREE.Vector3(0, 1, 0),
      material,
      opening: hole('back'),
      name: 'Back'
    })
    group.add(
      backPlane.mesh
    );
    nodes.push(...backPlane.nodes, ...(backPlane.openingNodes ?? []));
  }

  // Left (XZ at y=0) normal +Y, size l × h
  if (has('left')) {
    const leftPlane = makePlane({
      width: l, height: h,
      normal: new THREE.Vector3(0, -1, 0),
      pos: new THREE.Vector3(0, 0, 0),
      uHint: new THREE.Vector3(1, 0, 0),
      material,
      opening: hole('left'),
      name: 'Left'
    })
    group.add(
      leftPlane.mesh
    );
    nodes.push(...leftPlane.nodes, ...(leftPlane.openingNodes ?? []));
  }

  // Right (XZ at y=b) normal −Y, size l × h
  if (has('right')) {
    const rightPlane = makePlane({
      width: l, height: h,
      normal: new THREE.Vector3(0, 1, 0),
      pos: new THREE.Vector3(l, b, 0),
      uHint: new THREE.Vector3(-1, 0, 0),
      material,
      opening: hole('right'),
      name: 'Right' 
    });
    group.add(rightPlane.mesh);
    nodes.push(...rightPlane.nodes, ...(rightPlane.openingNodes ?? []));
  }

  const GRID = 1e-6;     // pick a grid that matches your unit precision
  const ZERO_TOL = 1e-12;

  console.log(`Cubicle: ${nodes.length} total nodes`);
  // Get set of all the nodes where each node is THREE.Vector3

  const nodesUnique = uniqueVectorsByTol(nodes, GRID, ZERO_TOL);

  const nodeGroup = createNodesFromVectors(nodesUnique, { color: 0xffffff });
  group.add(nodeGroup);

  console.log(`Cubicle: ${nodesUnique.length} unique nodes`);


  return group;
}

// Snap very small numbers to 0 (fixes ±0 and 1e-16 style noise)
function snapZero(n: number, zeroTol = 1e-12): number {
  return Math.abs(n) < zeroTol ? 0 : n;
}

// Quantize a number to a grid (e.g., 1e-6 -> micrometer if units are meters)
function quantize(n: number, grid = 1e-6): number {
  return Math.round(n / grid) * grid;
}

// Apply both (zero snap, then quantize). Works well in practice.
function sanitizeCoord(n: number, grid = 1e-6, zeroTol = 1e-12): number {
  return quantize(snapZero(n, zeroTol), grid);
}

// Make a stable hash key for a Vector3 using tolerance
function vecKey(v: THREE.Vector3, grid = 1e-6, zeroTol = 1e-12): string {
  const x = sanitizeCoord(v.x, grid, zeroTol);
  const y = sanitizeCoord(v.y, grid, zeroTol);
  const z = sanitizeCoord(v.z, grid, zeroTol);
  return `${x}|${y}|${z}`;
}

// Deduplicate by tolerance (O(n))
export function uniqueVectorsByTol(
  vectors: THREE.Vector3[],
  grid = 1e-6,
  zeroTol = 1e-12
): THREE.Vector3[] {
  const seen = new Set<string>();
  const out: THREE.Vector3[] = [];
  for (const v of vectors) {
    const key = vecKey(v, grid, zeroTol);
    if (!seen.has(key)) {
      seen.add(key);
      // store a sanitized clone so your output is also “clean”
      const [x, y, z] = key.split('|').map(Number);
      out.push(new THREE.Vector3(x, y, z));
    }
  }
  return out;
}
