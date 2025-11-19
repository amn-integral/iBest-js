import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useMemo } from 'react';
import { type OrbitControls as OrbitControlsType } from 'three-stdlib';
import { Cubicle } from './Cubicle';
import { type CubicleType, type TargetType, type TargetFaceType } from '../types';
import styles from '../App.module.css';

type Opening = {
  face: 'front' | 'back' | 'left' | 'right' | 'floor' | 'roof';
  width: number;
  height: number;
};

type Scene3DProps = {
  length: number;
  width: number;
  height: number;
  opening: Opening;
  cubicleType: CubicleType;
  targetFace: TargetFaceType;
  targetType: TargetType;
  stripWidth: number;
  stripHeight: number;
  threatPosition: [number, number, number];
  controlsRef: React.RefObject<OrbitControlsType | null>;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const formatMeasurement = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '0.00');

export function Scene3D({
  length,
  width,
  height,
  opening,
  cubicleType,
  targetFace,
  targetType,
  stripWidth,
  stripHeight,
  threatPosition,
  controlsRef
}: Scene3DProps) {
  const axisSize = useMemo(() => Math.max(length, width, height) * 1.5, [length, width, height]);
  const textSize = useMemo(() => Math.min(length, width, height) * 0.1, [length, width, height]);
  const sphereSize = Math.min(length, width, height) * 0.05;
  const sceneCenter = useMemo<[number, number, number]>(() => [length / 2, width / 2, height / 2], [length, width, height]);
  const planZoom = useMemo(() => clamp(200 / Math.max(length, width, 1), 20, 200), [length, width]);
  const elevationZoom = useMemo(() => clamp(200 / Math.max(length, height, 1), 20, 200), [length, height]);
  const heightRatio = clamp(height > 0 ? threatPosition[2] / height : 0, 0, 10);

  const renderScene = () => (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 6, 8]} intensity={0.9} />
      <directionalLight position={[-6, 3, -4]} intensity={0.3} />

      <axesHelper args={[axisSize]} />
      <Text position={[axisSize, 0, 0]} fontSize={textSize} color="red">
        X
      </Text>
      <Text position={[0, axisSize, 0]} fontSize={textSize} color="green">
        Y
      </Text>
      <Text position={[0, 0, axisSize]} fontSize={textSize} color="blue">
        Z
      </Text>

      <Cubicle
        size={[length, width, height]}
        position={[0, 0, 0]}
        opening={opening}
        cubicleType={cubicleType}
        targetFace={targetFace}
        targetType={targetType}
        stripWidth={stripWidth}
        stripHeight={stripHeight}
      />

      <mesh position={threatPosition}>
        <sphereGeometry args={[sphereSize, 16, 16]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </>
  );

  return (
    <div className={styles.viewGrid}>
      {/* 3D Interactive View */}
      <div className={styles.viewPanel}>
        <div className={styles.viewHeader}>
          <h3 className={styles.viewTitle}>3D View</h3>
          <div className={styles.viewActions}>
            <button
              className={styles.canvasButton}
              onClick={() => {
                const controls = controlsRef.current;
                if (controls) {
                  controls.reset();
                  controls.target.set(...sceneCenter);
                  controls.update();
                }
              }}
            >
              Reset
            </button>
            <button
              className={styles.canvasButton}
              onClick={() => {
                const controls = controlsRef.current;
                if (controls) {
                  const maxDim = Math.max(length, width, height);
                  const distance = maxDim * 2.5;
                  controls.object.position.set(sceneCenter[0] + distance * 0.7, sceneCenter[1] - distance * 0.7, sceneCenter[2] + distance * 0.7);
                  controls.target.set(...sceneCenter);
                  controls.update();
                }
              }}
            >
              Fit
            </button>
          </div>
        </div>
        <div className={styles.canvasWrapper}>
          <Canvas
            className={styles.renderCanvas}
            camera={{ position: [sceneCenter[0] + axisSize, sceneCenter[1] - axisSize, sceneCenter[2] + axisSize], fov: 50, up: [0, 0, 1] }}
            dpr={[1, 2]}
            onCreated={({ gl, camera }) => {
              gl.setClearColor('#f9fafb');
              camera.lookAt(...sceneCenter);
            }}
          >
            {renderScene()}
            <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} target={sceneCenter} />
          </Canvas>
        </div>
      </div>

      {/* Plan View (Top-down) */}
      <div className={styles.viewPanel}>
        <div className={styles.viewHeader}>
          <h3 className={styles.viewTitle}>Plan View</h3>
        </div>
        <div className={styles.canvasWrapper}>
          <Canvas
            key={`plan-${length}-${width}-${height}`}
            orthographic
            className={`${styles.renderCanvas} ${styles.staticCanvas}`}
            camera={{ position: [sceneCenter[0], sceneCenter[1], axisSize * 2], zoom: planZoom, up: [0, 1, 0] }}
            dpr={[1, 2]}
            onCreated={({ gl, camera }) => {
              gl.setClearColor('#f9fafb');
              camera.lookAt(...sceneCenter);
            }}
          >
            {renderScene()}
          </Canvas>
        </div>
      </div>

      {/* Elevation View (Front view) */}
      <div className={styles.viewPanel}>
        <div className={styles.viewHeader}>
          <h3 className={styles.viewTitle}>Elevation View</h3>
        </div>
        <div className={styles.canvasWrapper}>
          <Canvas
            key={`elevation-${length}-${width}-${height}`}
            orthographic
            className={`${styles.renderCanvas} ${styles.staticCanvas}`}
            camera={{ position: [sceneCenter[0], sceneCenter[1] + axisSize * 2, sceneCenter[2]], zoom: elevationZoom, up: [0, 0, 1] }}
            dpr={[1, 2]}
            onCreated={({ gl, camera }) => {
              gl.setClearColor('#f9fafb');
              camera.lookAt(...sceneCenter);
            }}
          >
            {renderScene()}
          </Canvas>
          <div className={styles.heightAnnotations}>
            <span className={styles.heightMin}>Room Height (H = {formatMeasurement(height)} ft)</span>
            <span className={styles.heightMin}>Threat Elevation (h = {formatMeasurement(threatPosition[2])} ft)</span>
            <span className={styles.heightMin}>h/H = {formatMeasurement(heightRatio)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
