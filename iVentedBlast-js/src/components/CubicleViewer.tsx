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

type Side = "floor" | "roof" | "front" | "back" | "left" | "right";
const ALL_SIDES: Side[] = ["floor", "roof", "front", "back", "left", "right"];

interface CubicleViewerProps {
  dims: { l: number; b: number; h: number };
  faces: Record<Side, boolean>;
  opening: {
    face: Side | "";
    w: number;
    h: number;
    x: number;
    y: number;
  };
  plotTrigger: number; // Changes when plot should update
}

export const CubicleViewer: React.FC<CubicleViewerProps> = ({
  dims,
  faces,
  opening,
  plotTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef< THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const cubicleRef = useRef<THREE.Group | null>(null);
  const hoverDisposeRef = useRef<(() => void) | null>(null);
  const hoverLabelRef = useRef<HTMLDivElement | null>(null);

  // View setter
  function resetCamera(view: string) {
    if (!cameraRef.current || !containerRef.current) return;

    const centerX = dims.l / 2;
    const centerY = dims.b / 2;
    const centerZ = dims.h / 2;
    const maxDim = Math.max(dims.l, dims.b, dims.h);
    const padding = 1.2;
    const frustumSize = maxDim * padding;
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;

    cameraRef.current.left = -frustumSize * aspect / 2;
    cameraRef.current.right = frustumSize * aspect / 2;
    cameraRef.current.top = frustumSize / 2;
    cameraRef.current.bottom = -frustumSize / 2;
    cameraRef.current.near = 0.1;
    cameraRef.current.far = maxDim * 4;
    cameraRef.current.zoom = 1;
    cameraRef.current.updateProjectionMatrix();

    const distance = maxDim * 1.5;

    switch (view) {
      case "front":
        cameraRef.current.position.set(centerX, -distance, centerZ);
        break;
      case "back":
        cameraRef.current.position.set(centerX, dims.b + distance, centerZ);
        break;
      case "left":
        cameraRef.current.position.set(-distance, centerY, centerZ);
        break;
      case "right":
        cameraRef.current.position.set(dims.l + distance, centerY, centerZ);
        break;
      case "roof":
        cameraRef.current.position.set(centerX, centerY, dims.h + distance);
        break;
      case "ground":
        cameraRef.current.position.set(centerX, centerY, -distance);
        break;
      case "iso":
      default:
        cameraRef.current.position.set(
          centerX + distance,
          centerY - distance,
          centerZ + distance
        );
        break;
    }
    cameraRef.current.up.set(0, 0, 1);
    cameraRef.current.lookAt(centerX, centerY, centerZ);
    if (controlsRef.current) {
      controlsRef.current.target.set(centerX, centerY, centerZ);
      controlsRef.current.update();
    }
  }

  const setView = (view: string) => {
    resetCamera(view);
  }

  // Initialize scene (runs once)
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    sceneRef.current = scene;

    // Camera
    const maxDim = Math.max(dims.l, dims.b, dims.h);
    const padding = 1.2;
    const frustumSize = maxDim * padding;
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2, frustumSize * aspect / 2,
      frustumSize / 2, -frustumSize / 2,
      0.1, 200
    );
    const centerX = dims.l / 2;
    const centerY = dims.b / 2;
    const centerZ = dims.h / 2;
    const distance = maxDim * 1.5;
    camera.position.set(
      centerX + distance,
      centerY - distance,
      centerZ + distance
    );
    camera.up.set(0, 0, 1); // Z-up
    camera.lookAt(centerX, centerY, centerZ);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(palette.white, 0.6));
    const dir = new THREE.DirectionalLight(palette.white, 0.9);
    dir.position.set(7, 10, 6);
    scene.add(dir);

    // Axes + helper grid
    const axes = createAxes({ size: 3 });
    scene.add(axes);

    const grid = createGrid({
      sizex: 5,
      sizey: 10,
      sizez: 15,
      color: colors.grid,
    });
    scene.add(grid);

    // Hover label
    const hoverLabel = document.createElement("div");
    hoverLabel.style.position = "absolute";
    hoverLabel.style.bottom = "12px";
    hoverLabel.style.left = "12px";
    hoverLabel.style.padding = "6px 10px";
    hoverLabel.style.background = "rgba(0,0,0,0.6)";
    hoverLabel.style.color = "#fff";
    hoverLabel.style.font = "12px/1.2 monospace";
    hoverLabel.style.borderRadius = "6px";
    hoverLabel.style.pointerEvents = "none";
    hoverLabel.style.userSelect = "none";
    hoverLabel.textContent = "";
    containerRef.current.appendChild(hoverLabel);
    hoverLabelRef.current = hoverLabel;

    // Resize handler
    const onResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current)
        return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      
      const aspect = w / h;
      const maxDim = Math.max(dims.l, dims.b, dims.h);
      const padding = 1.2;
      const frustumSize = maxDim * padding;
      cameraRef.current.left = -frustumSize * aspect / 2;
      cameraRef.current.right = frustumSize * aspect / 2;
      cameraRef.current.top = frustumSize / 2;
      cameraRef.current.bottom = -frustumSize / 2;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // Animate
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", onResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      controls.dispose();
      if (hoverDisposeRef.current) hoverDisposeRef.current();
      if (hoverLabelRef.current && hoverLabelRef.current.parentElement)
        hoverLabelRef.current.parentElement.removeChild(hoverLabelRef.current);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry)
          (obj as THREE.Mesh).geometry.dispose?.();
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material as
            | THREE.Material
            | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
          else mat.dispose?.();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // Plot cubicle (runs when plotTrigger changes)
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    if (plotTrigger === 0) return; // Don't plot on initial render

    // Remove previous cubicle
    if (cubicleRef.current) {
      sceneRef.current.remove(cubicleRef.current);
      cubicleRef.current.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry)
          (obj as THREE.Mesh).geometry.dispose?.();
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material as
            | THREE.Material
            | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
          else mat.dispose?.();
        }
      });
      cubicleRef.current = null;
    }
    if (hoverDisposeRef.current) {
      hoverDisposeRef.current();
      hoverDisposeRef.current = null;
    }

    // Prepare sides (floor must be included)
    const selected: Side[] = ALL_SIDES.filter(
      (s) => s === "floor" || !!faces[s]
    );

    // Prepare opening (optional)
    const openings: Record<string, { w?: number; h?: number; x?: number; y?: number }> = {};
    if (opening.face) {
      const w = Number(opening.w) > 0 ? Number(opening.w) : undefined;
      const h = Number(opening.h) > 0 ? Number(opening.h) : undefined;
      const x = undefined;
      const y = undefined;

      if ((w ?? 0) > 0 && (h ?? 0) > 0) {
        openings[opening.face] = { w, h, x, y };
      }
    }

    // Create cubicle
    const cubicle = makeCubicle({
      l: dims.l,
      b: dims.b,
      h: dims.h,
      sides: selected,
      openings,
    });
    cubicleRef.current = cubicle;
    sceneRef.current.add(cubicle);

    resetCamera("iso");

    // Wire hover to node group
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
    <div ref={containerRef} style={styles.cubicle}>
      {/* View buttons */}
      <div style={styles.viewButtons}>
        {['front', 'back', 'left', 'right', 'roof', 'ground', 'iso'].map((view) => (
          <button
            key={view}
            onClick={() => setView(view)}
            style={styles.viewButton}
          >
            {view}
          </button>
        ))}
      </div>
      {/* bottom-right axis legend */}
      <div style={styles.legend}>
        <span style={styles.item}>
          <i style={{ ...styles.dot, ...styles.x }} /> X
        </span>
        <span style={styles.item}>
          <i style={{ ...styles.dot, ...styles.y }} /> Y
        </span>
        <span style={styles.item}>
          <i style={{ ...styles.dot, ...styles.z }} /> Z
        </span>
      </div>
      {/* bottom-left hover label (text set via ref in effects) */}
      <div ref={hoverLabelRef} style={styles.hoverLabel} />
    </div>
  );
};

const styles: {
  cubicle: React.CSSProperties;
  legend: React.CSSProperties;
  item: React.CSSProperties;
  dot: React.CSSProperties;
  x: React.CSSProperties;
  y: React.CSSProperties;
  z: React.CSSProperties;
  hoverLabel: React.CSSProperties;
  viewButton: React.CSSProperties;
  viewButtons: React.CSSProperties;
} = {
  cubicle: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  legend: {
    position: "absolute",
    right: "12px",
    bottom: "12px",
    display: "flex",
    gap: "10px",
    padding: "6px 10px",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.9)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    font: "12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  item: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#f5f6f8",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  x: { background: "#ff4d4f" },
  y: { background: "#52c41a" },
  z: { background: "#2196f3" },
  hoverLabel: {
    position: "absolute",
    left: "12px",
    bottom: "12px",
    padding: "6px 10px",
    borderRadius: "6px",
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    font: "12px/1.2 monospace",
    pointerEvents: "none",
    userSelect: "none",
  },
  viewButtons: {
    position: "absolute",
    top: "12px",
    left: "12px",
    display: "flex",
    gap: "6px",
    flexWrap: "wrap" as const,
  },
  viewButton: {
    padding: "6px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.9)",
    cursor: "pointer",
    fontSize: "12px",
    textTransform: "capitalize" as const,
  },
};
