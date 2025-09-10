import * as THREE from 'three';
import { colors } from '../../colors';


export interface AxesOptions {
  /** Length of each axis */
  size?: number;
  /** Show/hide individual axes */
  showX?: boolean;
  showY?: boolean;
  showZ?: boolean;
  /** Show sphere markers at axis ends */
  showMarkers?: boolean;
}

export function createAxes(options: AxesOptions = {}): THREE.Group {
  const {
    size = 2.5,
    showX = true,
    showY = true,
    showZ = true,
    showMarkers = true
  } = options;

  const axesGroup = new THREE.Group();

  if (showX) {
    // X axis line (red)
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(size, 0, 0)
    ]);
    const xLine = new THREE.Line(xGeometry, new THREE.LineBasicMaterial({
      color: colors.axes.x,
      linewidth: 3
    }));
    axesGroup.add(xLine);

    // X axis arrow tip
    const xArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.2, 6), // Reduced from 8 segments to 6
      new THREE.MeshBasicMaterial({ color: colors.axes.x })
    );
    xArrow.position.set(size, 0, 0);
    xArrow.rotation.z = -Math.PI / 2;
    axesGroup.add(xArrow);

    // X axis marker sphere
    if (showMarkers) {
      const xMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.12),
        new THREE.MeshBasicMaterial({ color: colors.axes.x })
      );
      xMarker.position.set(size + 0.3, 0, 0);
      axesGroup.add(xMarker);
    }
  }

  if (showY) {
    // Y axis line (green)
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, size, 0)
    ]);
    const yLine = new THREE.Line(yGeometry, new THREE.LineBasicMaterial({
      color: colors.axes.y,
      linewidth: 3
    }));
    axesGroup.add(yLine);

    // Y axis arrow tip
    const yArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.2, 6), // Reduced from 8 segments to 6
      new THREE.MeshBasicMaterial({ color: colors.axes.y })
    );
    yArrow.position.set(0, size, 0);
    axesGroup.add(yArrow);

    // Y axis marker sphere
    if (showMarkers) {
      const yMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.12),
        new THREE.MeshBasicMaterial({ color: colors.axes.y })
      );
      yMarker.position.set(0, size + 0.3, 0);
      axesGroup.add(yMarker);
    }
  }

  if (showZ) {
    // Z axis line (blue)
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, size)
    ]);
    const zLine = new THREE.Line(zGeometry, new THREE.LineBasicMaterial({
      color: colors.axes.z,
      linewidth: 3
    }));
    axesGroup.add(zLine);

    // Z axis arrow tip
    const zArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.2, 6), // Reduced from 8 segments to 6
      new THREE.MeshBasicMaterial({ color: colors.axes.z })
    );
    zArrow.position.set(0, 0, size);
    zArrow.rotation.x = Math.PI / 2;
    axesGroup.add(zArrow);

    // Z axis marker sphere
    if (showMarkers) {
      const zMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.12),
        new THREE.MeshBasicMaterial({ color: colors.axes.z })
      );
      zMarker.position.set(0, 0, size + 0.3);
      axesGroup.add(zMarker);
    }
  }

  return axesGroup;
}
