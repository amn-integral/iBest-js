import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  makeCubicle,
  createAxes,
  createGrid,
  enableNodeHoverCoordinates,
} from "../lib/geometry";
import { colors, palette } from "../lib/colors";
import cubicleViewerCss from "./CubicleViewer.module.css";

type Side = "floor" | "roof" | "front" | "back" | "left" | "right";
const ALL_SIDES: Side[] = ["floor", "roof", "front", "back", "left", "right"];

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
function setCameraView(
  camera: THREE.OrthographicCamera,
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

const removeGroup = (scene: THREE.Scene, group: THREE.Group | null) => {
  if (!group) return;
  scene.remove(group);
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose?.();
    if ((obj as THREE.Mesh).material) {
      const mat = (obj as THREE.Mesh).material as
        | THREE.Material
        | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
      else mat.dispose?.();
    }
  });
};

export const CubicleViewer: React.FC<{
  dims: { l: number; b: number; h: number };
  faces: Record<Side, boolean>;
  opening: { face: Side | ""; w: number; h: number; x: number; y: number };
  plotTrigger: number;
}> = ({ dims, faces, opening, plotTrigger }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const cubicleRef = useRef<THREE.Group | null>(null);
  const hoverDisposeRef = useRef<(() => void) | null>(null);
  const hoverLabelRef = useRef<HTMLDivElement | null>(null);

  // Stable camera reset callback for all views
  const resetCamera = (view: ViewType) => {
    if (!cameraRef.current || !containerRef.current) return;
    setCameraView(cameraRef.current, containerRef.current, dims, view);
    const [cx, cy, cz] = [dims.l / 2, dims.b / 2, dims.h / 2];
    controlsRef.current?.target.set(cx, cy, cz);
    controlsRef.current?.update();
  };

  // Initialize scene (runs once)
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Use helper for initial camera setup (iso view)
    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 200);
    setCameraView(camera, containerRef.current, dims, "iso");
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(palette.white, 0.6));
    const dir = new THREE.DirectionalLight(palette.white, 0.9);
    dir.position.set(7, 10, 6);
    scene.add(dir);
    scene.add(createAxes({ size: 3 }));
    // Center the grid on the cubicle center when page loads

    scene.add(createGrid({sizex: 5, sizey: 10, sizez: 15, color: colors.grid}));

    // Hover label
    const hoverLabel = document.createElement("div");
    // Object.assign(hoverLabel.style, cubicleViewerCss.hoverLabel);
    hoverLabel.className = cubicleViewerCss.hoverLabel;
    hoverLabel.textContent = "";
    containerRef.current.appendChild(hoverLabel);
    hoverLabelRef.current = hoverLabel;

    // Responsive resize: always use setCameraView for consistency
    const onResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current)
        return;
      rendererRef.current.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
      rendererRef.current.domElement.style.width = "100%";
      rendererRef.current.domElement.style.height = "100%";
      setCameraView(cameraRef.current, containerRef.current, dims, "iso");
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    resetCamera("iso");

    // Add a red sphere to indicate the charge at center of cubicle
    const chargeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshBasicMaterial({ color: palette.red })
    );
    chargeSphere.position.set(dims.l / 2, dims.b / 2, dims.h / 2);
    scene.add(chargeSphere);

    // Cleanup
    return () => {
      window.removeEventListener("resize", onResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      controls.dispose();
      hoverDisposeRef.current?.();
      hoverLabelRef.current?.parentElement?.removeChild(hoverLabelRef.current);
      removeGroup(scene, cubicleRef.current);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // Plot cubicle (runs when plotTrigger changes)
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    if (plotTrigger === 0) return;
    removeGroup(sceneRef.current, cubicleRef.current);
    hoverDisposeRef.current?.();
    hoverDisposeRef.current = null;

    const selected: Side[] = ALL_SIDES.filter(
      (s) => s === "floor" || !!faces[s]
    );
    const openings: Record<
      string,
      { w?: number; h?: number; x?: number; y?: number }
    > = {};
    if (opening.face && Number(opening.w) > 0 && Number(opening.h) > 0) {
      openings[opening.face] = { w: Number(opening.w), h: Number(opening.h) };
    }
    const cubicle = makeCubicle({
      l: dims.l,
      b: dims.b,
      h: dims.h,
      sides: selected,
      openings,
    });
    cubicleRef.current = cubicle;
    sceneRef.current.add(cubicle);

    // Always reset to iso after plot
    resetCamera("iso");

    const nodesGroup = cubicle.getObjectByName(
      "NodesFromVectors"
    ) as THREE.Group | null;
    if (nodesGroup && hoverLabelRef.current && rendererRef.current) {
      hoverDisposeRef.current = enableNodeHoverCoordinates(
        rendererRef.current.domElement,
        cameraRef.current!,
        nodesGroup,
        (text) => {
          hoverLabelRef.current!.textContent = text ?? "";
        }
      );
    }
  }, [plotTrigger, dims, faces, opening]);

  return (
    <div ref={containerRef} className={cubicleViewerCss.cubicle}>
      {/* View buttons */}
      <div className={cubicleViewerCss.viewButtons}>
        {VIEW_LIST.map((view) => (
          <button
            key={view}
            onClick={() => resetCamera(view)}
            className={cubicleViewerCss.viewButton}
          >
            {view}
          </button>
        ))}
      </div>
      {/* bottom-right axis legend */}
      <div className={cubicleViewerCss.legend}>
        <span className={cubicleViewerCss.item}>
          <i className={`${cubicleViewerCss.dot} ${cubicleViewerCss.x}`} /> X
        </span>
        <span className={cubicleViewerCss.item}>
          <i className={`${cubicleViewerCss.dot} ${cubicleViewerCss.y}`} /> Y
        </span>
        <span className={cubicleViewerCss.item}>
          <i className={`${cubicleViewerCss.dot} ${cubicleViewerCss.z}`} /> Z
        </span>
      </div>
      {/* bottom-left hover label (text set via ref in effects) */}
      <div ref={hoverLabelRef} className={cubicleViewerCss.hoverLabel} />
    </div>
  );
};
