import * as THREE from 'three';
import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import styles from './App.module.css';
import { UserInput } from '@integralrsg/iuicomponents';

type CubicleType = 'cantilever' | 'two-wall' | 'three-wall';

type Opening = {
  face: 'front' | 'back' | 'left' | 'right' | 'floor' | 'roof';
  width: number;
  height: number;
};

type BoxProps = {
  size?: [number, number, number];
  position?: [number, number, number];
  opening?: Opening;
  cubicleType?: CubicleType;
};

function Box({ size = [1, 1, 1], position = [0, 0, 0], opening, cubicleType = 'three-wall' }: BoxProps) {
  const [length, width, height] = size;
  // Cubicle starts at position and extends in +X, +Y, +Z directions
  const offsetPosition: [number, number, number] = [position[0], position[1], position[2]];

  const material = <meshStandardMaterial color="#90a4c0" transparent opacity={0.5} roughness={0.2} side={THREE.DoubleSide} />;

  // Dynamic text size based on smallest dimension for legibility
  const minDim = Math.min(length, width, height);
  const textSize = minDim * 0.08; // 8% of smallest dimension

  // Define which faces to show based on cubicle type
  const getVisibleFaces = (type: CubicleType): string[] => {
    switch (type) {
      case 'cantilever':
        return ['floor', 'back']; // Floor + one wall
      case 'two-wall':
        return ['floor', 'back', 'left']; // Floor + two walls
      case 'three-wall':
        return ['floor', 'back', 'left', 'right']; // Floor + three walls
      default:
        return ['floor', 'back', 'left', 'right', 'roof', 'front']; // Floor + three walls
    }
  };

  const visibleFaces = getVisibleFaces(cubicleType);

  // prettier-ignore
  const faces = useMemo(
    () => [
      // Floor at z=0 (ground level) - spans from (0,0,0) to (length,width,0)
      { name: 'floor', pos: [length/2, width/2, 0], rot: [0, 0, 0], width: length, height: width, label: 'Floor' },
      // Roof at z=height - spans from (0,0,height) to (length,width,height)
      { name: 'roof', pos: [length/2, width/2, height], rot: [0, 0, 0], width: length, height: width, label: 'Roof' },
      // Front face at y=width - spans from (0,width,0) to (length,width,height)
      { name: 'front', pos: [length/2, width, height/2], rot: [-Math.PI/2, 0, 0], width: length, height: height, label: 'Front' },
      // Back face at y=0 - spans from (0,0,0) to (length,0,height)
      { name: 'back', pos: [length/2, 0, height/2], rot: [Math.PI/2, 0, 0], width: length, height: height, label: 'Back' },
      // Left face at x=0 - spans from (0,0,0) to (0,width,height)
      { name: 'left', pos: [0, width/2, height/2], rot: [0, Math.PI/2, 0], width: height, height: width, label: 'Left' },
      // Right face at x=length - spans from (length,0,0) to (length,width,height)
      { name: 'right', pos: [length, width/2, height/2], rot: [0, -Math.PI/2, 0], width: height, height: width, label: 'Right' }
    ].filter(face => visibleFaces.includes(face.name)),
    [length, width, height, visibleFaces]
  );

  return (
    <group position={offsetPosition}>
      {faces.map(({ name, pos, rot, width: faceWidth, height: faceHeight, label }) => {
        const hasOpening = opening?.face === name;

        return (
          <group key={name}>
            <mesh position={pos as [number, number, number]} rotation={rot as [number, number, number]}>
              {hasOpening && opening ? (
                <shapeGeometry
                  args={[
                    (() => {
                      const shape = new THREE.Shape();
                      shape.moveTo(-faceWidth / 2, -faceHeight / 2);
                      shape.lineTo(faceWidth / 2, -faceHeight / 2);
                      shape.lineTo(faceWidth / 2, faceHeight / 2);
                      shape.lineTo(-faceWidth / 2, faceHeight / 2);
                      shape.lineTo(-faceWidth / 2, -faceHeight / 2);
                      const hole = new THREE.Path();
                      hole.moveTo(-opening.width / 2, -opening.height / 2);
                      hole.lineTo(opening.width / 2, -opening.height / 2);
                      hole.lineTo(opening.width / 2, opening.height / 2);
                      hole.lineTo(-opening.width / 2, opening.height / 2);
                      hole.lineTo(-opening.width / 2, -opening.height / 2);
                      shape.holes.push(hole);
                      return shape;
                    })()
                  ]}
                />
              ) : (
                <planeGeometry args={[faceWidth, faceHeight]} />
              )}
              {material}
            </mesh>
            <Text
              position={[pos[0], pos[1], pos[2] + (name === 'floor' ? -textSize : name === 'roof' ? textSize : 0)]}
              rotation={rot as [number, number, number]}
              fontSize={textSize}
              color="#333"
              anchorX="center"
              anchorY="middle"
            >
              {label}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

export default function App() {
  const [length, setLength] = useState('2');
  const [width, setWidth] = useState('2');
  const [height, setHeight] = useState('2');
  const [openingWidth, setOpeningWidth] = useState('0.8');
  const [openingHeight, setOpeningHeight] = useState('1.2');
  const [openingFace, setOpeningFace] = useState<Opening['face']>('front');
  const [cubicleType, setCubicleType] = useState<CubicleType>('three-wall');
  const [threatXLocation, setThreatXLocation] = useState('1.0');
  const [threatYLocation, setThreatYLocation] = useState('1.0');
  const [threatZLocation, setThreatZLocation] = useState('1.0');
  const [threatWeight, setThreatWeight] = useState('10.0');

  const axisSize = useMemo(() => Math.max(Number(length), Number(width), Number(height)) * 1.5, [length, width, height]);
  const textSize = useMemo(() => Math.min(Number(length), Number(width), Number(height)) * 0.1, [length, width, height]);
  const opening = { face: openingFace, width: Number(openingWidth), height: Number(openingHeight) };
  return (
    <div className={styles.appContainer}>
      {/* Navigation Panel */}
      <nav className={styles.navPanel}>
        <h1 className={styles.navHeader}>Cubicle Designer</h1>

        {/* Cubicle Type Selection */}
        <h2 className={styles.sectionTitle}>Configuration</h2>
        <div className={styles.formGroup}>
          <span className={styles.formLabel}>Type</span>
          <select
            value={cubicleType}
            onChange={e => setCubicleType(e.target.value as CubicleType)}
            className={styles.formSelect}
            aria-label="Select cubicle type"
          >
            <option value="cantilever">Cantilever</option>
            <option value="two-wall">Two Wall</option>
            <option value="three-wall">Three Wall</option>
          </select>
        </div>

        {/* Dimensions */}
        <h3 className={styles.sectionTitle}>Dimensions</h3>
        <UserInput label="Length (X)" type="number" unit="ft" value={length} onChange={setLength} validation={{ min: 0.1 }} />
        <UserInput label="Width (Y)" type="number" unit="ft" value={width} onChange={setWidth} validation={{ min: 0.1 }} />
        <UserInput label="Height (Z)" type="number" unit="ft" value={height} onChange={setHeight} validation={{ min: 0.1 }} />

        {/* Opening Configuration */}
        <h2 className={styles.sectionTitle}>Opening</h2>
        <div className={styles.formGroup}>
          <span className={styles.formLabel}>Face</span>
          <select
            value={openingFace}
            onChange={e => setOpeningFace(e.target.value as Opening['face'])}
            className={styles.formSelect}
            aria-label="Select opening face"
          >
            {['front', 'back', 'left', 'right', 'floor', 'roof'].map(f => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <UserInput label="Width" type="number" unit="ft" value={openingWidth} onChange={setOpeningWidth} validation={{ min: 0.1 }} />
        <UserInput label="Height" type="number" unit="ft" value={openingHeight} onChange={setOpeningHeight} validation={{ min: 0.1 }} />

        <h3 className={styles.sectionTitle}>Threat Location</h3>
        <UserInput
          label="X Location"
          type="number"
          unit="ft"
          value={threatXLocation}
          onChange={setThreatXLocation}
          validation={{ min: 0.0, max: Number(length) }}
        />
        <UserInput
          label="Y Location"
          type="number"
          unit="ft"
          value={threatYLocation}
          onChange={setThreatYLocation}
          validation={{ min: 0.0, max: Number(width) }}
        />
        <UserInput
          label="Z Location"
          type="number"
          unit="ft"
          value={threatZLocation}
          onChange={setThreatZLocation}
          validation={{ min: 0.0, max: Number(height) }}
        />
        <UserInput label="Weight" type="number" unit="lbs" value={threatWeight} onChange={setThreatWeight} validation={{ min: 0.1 }} />
      </nav>

      {/* Main Content Area */}
      <main className={styles.contentArea}>
        {/* 3D Render Section */}
        <section className={styles.renderSection}>
          <Canvas
            className={styles.renderCanvas}
            camera={{ position: [5, -4, 6], fov: 50, up: [0, 0, 1] }}
            dpr={[1, 2]}
            onCreated={({ gl }) => gl.setClearColor('#f9fafb')}
          >
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

            <Box
              size={[Number(length), Number(width), Number(height)]}
              position={[0, 0, 0]}
              opening={{ face: openingFace, width: Number(openingWidth), height: Number(openingHeight) }}
              cubicleType={cubicleType}
            />

            <OrbitControls enableDamping dampingFactor={0.08} target={[0, 0, 0]} />
          </Canvas>
        </section>

        {/* Output Section */}
        <section className={styles.outputSection}>
          <h2 className={styles.outputHeader}>Analysis & Output</h2>
          <div className={styles.outputContent}>
            <p>
              <strong>Cubicle Type:</strong> {cubicleType.charAt(0).toUpperCase() + cubicleType.slice(1).replace('-', ' ')}
            </p>
            <p>
              <strong>Dimensions:</strong> {length}m × {width}m × {height}m
            </p>
            <p>
              <strong>Volume:</strong> {(Number(length) * Number(width) * Number(height)).toFixed(2)} m³
            </p>
            <p>
              <strong>Floor Area:</strong> {(Number(length) * Number(width)).toFixed(2)} m²
            </p>
            {opening && (
              <>
                <p>
                  <strong>Opening:</strong> {openingWidth}m × {openingHeight}m on {openingFace} face
                </p>
                <p>
                  <strong>Opening Area:</strong> {(Number(openingWidth) * Number(openingHeight)).toFixed(2)} m²
                </p>
              </>
            )}
            <p>
              <strong>Wall Count:</strong>{' '}
              {cubicleType === 'cantilever' ? '1 wall' : cubicleType === 'two-wall' ? '2 walls' : cubicleType === 'three-wall' ? '3 walls' : 'Full enclosure'}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
