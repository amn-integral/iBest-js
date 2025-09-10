import * as THREE from 'three';

export type NodeVisualOptions = {
  size?: number;                  // sphere radius
  color?: number;                 // default gray
  opacity?: number;               // 0..1
  nodeType?: 'sphere' | 'box' | 'dot';
  visible?: boolean;
  showCoordinates?: boolean;      // attach coord info to userData
};

const DEFAULT_VISUAL_OPTS: Required<NodeVisualOptions> = {
  size: 0.1,
  color: 0x666666,   // gray
  opacity: 0.9,
  nodeType: 'sphere',
  visible: true,
  showCoordinates: true,
};

/** Small helpers */
function createNodeGeometry(nodeType: 'sphere' | 'box' | 'dot', size: number): THREE.BufferGeometry {
  switch (nodeType) {
    case 'box': return new THREE.BoxGeometry(size, size, size);
    case 'dot': return new THREE.SphereGeometry(size, 4, 3);
    default: return new THREE.SphereGeometry(size, 6, 4); // Reduced from 8,6 to 6,4
  }
}

function createNodeMaterial(color: number, opacity: number): THREE.Material {
  return new THREE.MeshBasicMaterial({
    color,
    opacity,
    transparent: opacity < 1,
    depthWrite: false,
  });
}

/**
 * Build a group of node meshes from raw positions.
 * All nodes share one geometry/material for perf.
 */
export function createNodesFromVectors(
  nodes: THREE.Vector3[],
  options: NodeVisualOptions = {}
): THREE.Group {
  const opts = { ...DEFAULT_VISUAL_OPTS, ...options };

  const group = new THREE.Group();
  group.name = 'NodesFromVectors';

  const geom = createNodeGeometry(opts.nodeType, opts.size);
  const mat = createNodeMaterial(opts.color, opts.opacity);

  for (let i = 0; i < nodes.length; i++) {
    const pos = nodes[i];
    const m = new THREE.Mesh(geom, mat);
    m.position.copy(pos);
    m.visible = opts.visible;
    m.name = `Node_${i}`;

    if (opts.showCoordinates) {
      m.userData.coordinateInfo = {
        position: pos.clone(),
        displayText: `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`,
        node: m,
      };
    }

    group.add(m);
  }

  return group;
}

/**
 * Simple hover handler (vanilla Three.js).
 * - Listens to mousemove on `dom`
 * - Raycasts against `nodeGroup`
 * - Calls `onHover(text | null)` with coordinate string
 * - Highlights the hovered node by scaling it slightly
 *
 * Returns a cleanup function to remove the listeners.
 */
export function enableNodeHoverCoordinates(
  dom: HTMLElement,
  camera: THREE.Camera,
  nodeGroup: THREE.Group,
  onHover: (coords: string | null) => void
): () => void {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let last: THREE.Object3D | null = null;

  function handleMove(ev: MouseEvent) {
    const rect = dom.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(nodeGroup.children, false);
    if (hits.length > 0) {
      const hit = hits[0].object as THREE.Mesh;

      // unhighlight previous
      if (last && last !== hit) (last as THREE.Mesh).scale.set(1, 1, 1);

      // highlight current
      hit.scale.set(1.3, 1.3, 1.3);
      last = hit;

      const info = hit.userData?.coordinateInfo;
      onHover(info?.displayText ?? null);
      dom.style.cursor = 'pointer';
    } else {
      if (last) (last as THREE.Mesh).scale.set(1, 1, 1);
      last = null;
      onHover(null);
      dom.style.cursor = 'default';
    }
  }

  function handleLeave() {
    if (last) (last as THREE.Mesh).scale.set(1, 1, 1);
    last = null;
    onHover(null);
    dom.style.cursor = 'default';
  }

  dom.addEventListener('mousemove', handleMove);
  dom.addEventListener('mouseleave', handleLeave);

  // cleanup
  return () => {
    dom.removeEventListener('mousemove', handleMove);
    dom.removeEventListener('mouseleave', handleLeave);
  };
}
