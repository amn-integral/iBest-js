import {createLabeledCube} from '@integralrsg/i3dcore';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';


// Return a react component that renders a labeled cube
export const CubicleGeometry: React.FC<{size?: number}> = ({size = 1}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Setup scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(400, 400);
    
    // Create and add cube
    const cube = createLabeledCube(undefined, size);
    scene.add(cube);
    
    // Position camera
    camera.position.z = size * 3;
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    animate();
    
    // Cleanup
    return () => {
      renderer.dispose();
    };
  }, [size]);
  
  return <canvas ref={canvasRef} style={{ width: '400px', height: '400px' }} />;
}