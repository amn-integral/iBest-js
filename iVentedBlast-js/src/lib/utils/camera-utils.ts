import {OrthographicCamera} from 'three'

// List of available camera views
const VIEW_LIST = [
  "front",
  "back",
  "left",
  "right",
  "roof",
  "ground",
  "iso",
] as const;

type ViewType = (typeof VIEW_LIST)[number];


// Helper to set camera frustum and position for a given view
export function setCameraView(
  camera: OrthographicCamera,
  container: HTMLDivElement,
  dims: { l: number; b: number; h: number },
  view: ViewType
) {
  // Calculate cubicle center and max dimension
  const maxDim = Math.max(dims.l, dims.b, dims.h);
  const padding = 1.25;
  const frustumSize = maxDim * padding;
  const aspect = container.clientWidth / container.clientHeight;
  const [cx, cy, cz] = [dims.l / 2, dims.b / 2, dims.h / 2];
  const distance = maxDim * 1.5;

  // Reset orthographic frustum and zoom
  camera.left = (-frustumSize * aspect) / 2;
  camera.right = (frustumSize * aspect) / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.near = 0.1;
  camera.far = maxDim * 4;
  camera.zoom = 1;
  camera.updateProjectionMatrix();

  // Set camera position for each view
  switch (view) {
    case "front":
      // Look at Y=0 face from negative Y
      camera.position.set(cx, -distance, cz);
      break;
    case "back":
      // Look at Y=b face from positive Y
      camera.position.set(cx, dims.b + distance, cz);
      break;
    case "left":
      // Look at X=0 face from negative X
      camera.position.set(-distance, cy, cz);
      break;
    case "right":
      // Look at X=l face from positive X
      camera.position.set(dims.l + distance, cy, cz);
      break;
    case "roof":
      // Look down from above (Z+)
      camera.position.set(cx, cy, dims.h + distance);
      break;
    case "ground":
      // Look up from below (Z-)
      camera.position.set(cx, cy, -distance);
      break;
    case "iso":
    default:
      // Isometric: diagonal from above
      camera.position.set(cx + distance, cy - distance, cz + distance);
      break;
  }
  // Always use Z-up
  camera.up.set(0, 0, 1);
  camera.lookAt(cx, cy, cz);
}