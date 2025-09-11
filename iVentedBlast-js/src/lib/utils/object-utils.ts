import { Scene, Group, Mesh, Material, Object3D, MeshBasicMaterial, SphereGeometry  } from "three";
import { colors, palette } from "../colors";
import { createGrid } from "../geometry";

export function removeGroup(scene: Scene, group: Group | null) {
  if (!group) return;
  scene.remove(group);
  group.traverse((obj) => {
    if ((obj as Mesh).geometry) (obj as Mesh).geometry.dispose?.();
    if ((obj as Mesh).material) {
      const mat = (obj as Mesh).material as Material | Material[];
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
      else mat.dispose?.();
    }
  });
};


// Removes a single object from the scene and disposes its geometry and material
export function removeObject(scene: Scene, obj: Object3D | null) {
  if (!obj) return;
  scene.remove(obj);
  if ((obj as any).geometry) (obj as any).geometry.dispose?.();
  if ((obj as any).material) {
    const mat = (obj as any).material as Material | Material[];
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
    else mat.dispose?.();
  }
}

// Adds a red sphere at the center of the cubicle to represent the charge location
export function addChargeSphere(scene: Scene, dims: { l: number; b: number; h: number }, chargeRef: React.RefObject<Mesh | null>) {
  // Remove previous sphere if it exists
  removeObject(scene, chargeRef.current);
  chargeRef.current = null;
  const chargeSphere = new Mesh(
    new SphereGeometry(0.25, 16, 16),
    new MeshBasicMaterial({ color: palette.red })
  );
  chargeSphere.position.set(dims.l / 2, dims.b / 2, dims.h / 2);
  scene.add(chargeSphere);
  chargeRef.current = chargeSphere;
}

// Adds a grid helper to the scene based on cubicle dimensions
export function addGrid(scene: Scene, dims: { l: number; b: number; h: number }, gridRef: React.RefObject<Group | null>) {
  // Remove previous grid if it exists
  removeObject(scene, gridRef.current);
  gridRef.current = null;
  const grid = createGrid({ sizex: dims.l, sizey: dims.b, sizez: dims.h, color: colors.grid });
  scene.add(grid);
}