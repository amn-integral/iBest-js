import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  makeCubicle,
  createAxes,
  enableNodeHoverCoordinates,
} from "../lib/geometry";
import { colors, palette } from "../lib/colors";
import cubicleViewerCss from "./CubicleViewer.module.css";
import {  removeGroup, addGrid, addChargeSphere } from "../lib/utils/object-utils";
import { setCameraView } from "../lib/utils/camera-utils";

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
  const chargeSphereRef = useRef<THREE.Mesh | null>(null);
  const gridRef = useRef<THREE.Group | null>(null);

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

    addChargeSphere(sceneRef.current, dims, chargeSphereRef);

    addGrid(sceneRef.current, dims, gridRef);

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
