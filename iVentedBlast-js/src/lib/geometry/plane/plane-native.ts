import * as THREE from "three";
import type { PlaneOptions, PlaneResult, HoleOpening } from "../types";

function defaultMaterial(): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color: 0x8080b3,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  });
}

function addOpening(
  shape: THREE.Shape,
  w: number,
  h: number,
  o: HoleOpening
): { x0: number; y0: number; x1: number; y1: number } | null {
  // clamp size to panel
  const ow = Math.max(0, Math.min(o.w, w));
  const oh = Math.max(0, Math.min(o.h, h));

  // center by default when x/y are undefined
  let x0 = o.x ?? (w - ow) / 2;
  let y0 = o.y ?? (h - oh) / 2;

  // keep hole inside panel
  x0 = Math.max(0, Math.min(x0, w - ow));
  y0 = Math.max(0, Math.min(y0, h - oh));

  const x1 = x0 + ow;
  const y1 = y0 + oh;
  if (ow > 0 && oh > 0 && x1 > x0 && y1 > y0) {
    const p = new THREE.Path();
    p.moveTo(x0, y0);
    p.lineTo(x1, y0);
    p.lineTo(x1, y1);
    p.lineTo(x0, y1);
    p.lineTo(x0, y0);
    shape.holes.push(p);
    return { x0, y0, x1, y1 };
  }
  return null;
}

/**
 * Make a rectangular plane (local 0,0 → width,h), oriented by `normal`,
 * anchored at `pos`, then shifted by `offset * normal`.
 * Supports an optional centered (by default) rectangular opening.
 * Returns both the mesh and calculated node positions.
 */
export function makePlane(opts: PlaneOptions): PlaneResult {
  const { width, height, normal, pos, material, opening } = opts;

  // Outer shape in local XY
  const S = new THREE.Shape();
  S.moveTo(0, 0);
  S.lineTo(width, 0);
  S.lineTo(width, height);
  S.lineTo(0, height);
  S.lineTo(0, 0);

  // Opening(s) and collect opening info
  const openings: Array<{ x0: number; y0: number; x1: number; y1: number }> =
    [];
  if (opening) {
    const list = Array.isArray(opening) ? opening : [opening];
    for (const o of list) {
      const openingInfo = addOpening(S, width, height, o);
      if (openingInfo) openings.push(openingInfo);
    }
  }

  // Flat panel (thickness not requested in this API)
  const geo = new THREE.ShapeGeometry(S);
  const mat = material ?? defaultMaterial();
  const mesh = new THREE.Mesh(geo, mat);

  // Orient (local +Z → target normal)
  const n = normal.clone();
  if (n.lengthSq() < 1e-12) n.set(0, 0, 1); // guard against zero-length
  n.normalize();
  if (opts.uHint) {
    // u = projection of uHint onto the plane (perp to n)
    let u = opts.uHint.clone().projectOnPlane(n).normalize();
    if (u.lengthSq() < 1e-12) {
      // fallback if hint nearly parallel to n
      u = new THREE.Vector3(1, 0, 0).projectOnPlane(n).normalize();
      if (u.lengthSq() < 1e-12) u.set(0, 1, 0);
    }
    const v = new THREE.Vector3().crossVectors(n, u).normalize(); // v = n × u
    const basis = new THREE.Matrix4().makeBasis(u, v, n); // X=u, Y=v, Z=n
    mesh.quaternion.setFromRotationMatrix(basis);
  } else {
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  }

  // Calculate final position (corner at pos, plus offset along normal)
  const finalPos = pos.clone();
  mesh.position.copy(finalPos);

  mesh.updateMatrixWorld(true);

  // Helper: local (0..w, 0..h, z=0) → world (no centering subtraction)
  const localToWorld = (lx: number, ly: number): THREE.Vector3 => {
    return mesh.localToWorld(new THREE.Vector3(lx, ly, 0));
  };

  // Corner nodes (bottom-left, bottom-right, top-right, top-left)
  const nodes: THREE.Vector3[] = [];
  const corners: [number, number][] = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  corners.forEach(([x, y]) => nodes.push(localToWorld(x, y)));

  // Opening corner nodes (bl, br, tr, tl for each opening)
  const openingNodes: THREE.Vector3[] = [];
  openings.forEach(({ x0, y0, x1, y1 }) => {
    openingNodes.push(localToWorld(x0, y0)); // bottom-left
    openingNodes.push(localToWorld(x1, y0)); // bottom-right
    openingNodes.push(localToWorld(x1, y1)); // top-right
    openingNodes.push(localToWorld(x0, y1)); // top-left
  });

  const label = opts.name;
  // —— Face label (optional): same plane orientation, offset along normal ——
  if (label) {
    const labelMesh = makeLabelPlane(
      label,
      DEFAULT_TextOptions.size,
      DEFAULT_TextOptions.color
    );
    // center in local (0..width, 0..height) frame, and lift along local +Z
    labelMesh.position.set(width / 2, height / 2, DEFAULT_TextOptions.offset);
    mesh.add(labelMesh);
  }
  return {
    mesh,
    nodes,
    openingNodes: openingNodes.length > 0 ? openingNodes : undefined,
  };
}

const DEFAULT_TextOptions = {
  size: 1.0,
  color: "0x000000",
  opacity: 1,
  offset: 0.01,
};

/** Canvas → texture for numeric label */
function makeTextTexture(text: string, color = "#000000", px = 180) {
  // measure
  const mcan = document.createElement("canvas");
  const mctx = mcan.getContext("2d")!;
  mctx.font = `bold ${px}px sans-serif`;
  const w = mctx.measureText(text).width;
  const pad = px * 0.4;
  const tw = THREE.MathUtils.ceilPowerOfTwo(w + pad);
  const th = THREE.MathUtils.ceilPowerOfTwo(px + pad);

  // draw
  const can = document.createElement("canvas");
  can.width = tw;
  can.height = th;
  const ctx = can.getContext("2d")!;
  ctx.clearRect(0, 0, tw, th);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${px}px sans-serif`;
  ctx.fillText(text, tw / 2, th / 2);

  const tex = new THREE.CanvasTexture(can);
  tex.flipY = true; // important: not mirrored
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  return { texture: tex, width: tw, height: th };
}

/** A plane mesh that shows the number; oriented like the face (local +Z) */
function makeLabelPlane(text: string, worldHeight = 0.6, color = "#000000") {
  const { texture, width, height } = makeTextTexture(text, color);
  const aspect = width / height; // wider words → wider plane
  const geo = new THREE.PlaneGeometry(worldHeight * aspect, worldHeight);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide, // only front → no mirrored-from-behind
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = `FaceLabel_${text}`;
  // (optional) avoid z-fighting if you use tiny offsets
  // mesh.renderOrder = 2;
  return mesh;
}
