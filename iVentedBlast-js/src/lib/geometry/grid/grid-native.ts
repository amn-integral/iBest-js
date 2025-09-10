import * as THREE from 'three';


export interface GridOptions {
  /** Length of each axis to create grid lines along */
  sizex?: number;
  sizey?: number;
  sizez?: number;
  /** Spacing between grid lines */
  spacingx?: number;
  spacingy?: number;
  spacingz?: number;
  /** Show/hide grid lines on individual axes */
  showX?: boolean;
  showY?: boolean;
  showZ?: boolean;
  /** Line color */
  color?: number;
  /** Line opacity */
  opacity?: number;
  /** Line width */
  lineWidth?: number;

}

// Centralized defaults
const DEFAULT_GRID_OPTIONS: Required<GridOptions> = {
  sizex: 10,
  sizey: 10,
  sizez: 10,
  spacingx: 1,
  spacingy: 1,
  spacingz: 1,
  showX: true,
  showY: true,
  showZ: true,
  color: 0x999999,
  opacity: 0.4,
  lineWidth: 1,
};


const clampSpacing = (s: number) => Math.max(s, 1e-6);

export function createGrid(options: GridOptions = {}): THREE.Group {
  // Merge with defaults; `opts` is fully required at compile-time
  const opts: Required<GridOptions> = { ...DEFAULT_GRID_OPTIONS, ...options };

  const gridGroup = new THREE.Group();
  gridGroup.name = "3DGrid";

  const sx = clampSpacing(opts.spacingx);
  const sy = clampSpacing(opts.spacingy);
  const sz = clampSpacing(opts.spacingz);

  const makeMaterial = () =>
    new THREE.LineBasicMaterial({
      color: opts.color,
      transparent: opts.opacity < 1,
      opacity: opts.opacity,
      linewidth: opts.lineWidth, // (WebGL usually ignores)
      depthWrite: false,
    });

  const makeLines = (positions: number[]) => {
    if (!positions.length) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.computeBoundingSphere();
    return new THREE.LineSegments(geom, makeMaterial());
  };

  // X-parallel lines (vary Y/Z)
  if (opts.showX) {
    const positions: number[] = [];
    const yCount = Math.floor(opts.sizey / sy) + 1;
    const zCount = Math.floor(opts.sizez / sz) + 1;
    for (let i = 0; i < yCount; i++) {
      const y = 0 + i * sy;
      for (let k = 0; k < zCount; k++) {
        const z = 0 + k * sz;
        positions.push(0, y, z, opts.sizex, y, z);
      }
    }
    const lines = makeLines(positions);
    if (lines) {
      lines.name = "GridLinesX";
      gridGroup.add(lines);
    }
  }

  // Y-parallel lines (vary X/Z)
  if (opts.showY) {
    const positions: number[] = [];
    const xCount = Math.floor(opts.sizex / sx) + 1;
    const zCount = Math.floor(opts.sizez / sz) + 1;
    for (let j = 0; j < xCount; j++) {
      const x = 0 + j * sx;
      for (let k = 0; k < zCount; k++) {
        const z = 0 + k * sz;
        positions.push(x, 0, z, x, opts.sizey, z);
      }
    }
    const lines = makeLines(positions);
    if (lines) {
      lines.name = "GridLinesY";
      gridGroup.add(lines);
    }
  }

  // Z-parallel lines (vary X/Y)
  if (opts.showZ) {
    const positions: number[] = [];
    const xCount = Math.floor(opts.sizex / sx) + 1;
    const yCount = Math.floor(opts.sizey / sy) + 1;
    for (let j = 0; j < xCount; j++) {
      const x = 0 + j * sx;
      for (let i = 0; i < yCount; i++) {
        const y = 0 + i * sy;
        positions.push(x, y, 0, x, y, opts.sizez);
      }
    }
    const lines = makeLines(positions);
    if (lines) {
      lines.name = "GridLinesZ";
      gridGroup.add(lines);
    }
  }

  gridGroup.renderOrder = 1;
  return gridGroup;
}