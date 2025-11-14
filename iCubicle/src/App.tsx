import * as THREE from 'three';
import { useState, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { type OrbitControls as OrbitControlsType } from 'three-stdlib';
import styles from './App.module.css';
import { UserInput, UserDropdown, type DropdownOption } from '@integralrsg/iuicomponents';
import { type CubicleType } from './types';
import { CubicleTypes, CUBICLE_TYPES } from './constants';

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
  targetFace?: string;
  targetType?: string;
  stripWidth?: number;
  stripHeight?: number;
};

function Box({
  size = [1, 1, 1],
  position = [0, 0, 0],
  opening,
  cubicleType = 'three-walls',
  targetFace,
  targetType,
  stripWidth = 1,
  stripHeight = 1
}: BoxProps) {
  const [length, width, height] = size;
  // Cubicle starts at position and extends in +X, +Y, +Z directions
  const offsetPosition: [number, number, number] = [position[0], position[1], position[2]];

  const wallMaterial = <meshBasicMaterial color="rgba(144, 164, 192, 1)" transparent opacity={0.5} side={THREE.DoubleSide} />;
  const floorMaterial = <meshStandardMaterial color="#343435e8" transparent opacity={0.8} side={THREE.DoubleSide} />;

  // Dynamic text size based on smallest dimension for legibility
  const minDim = Math.min(length, width, height);
  const textSize = minDim * 0.08; // 8% of smallest dimension

  // Define which faces to show based on cubicle type
  const getVisibleFaces = (type: CubicleType): string[] => {
    switch (type) {
      case CubicleTypes.CantileverWall:
        return ['floor', 'back'];
      case CubicleTypes.TwoAdjacentWalls:
        return ['floor', 'back', 'left'];
      case CubicleTypes.TwoAdjacentWallsWithRoof:
        return ['floor', 'back', 'left', 'roof'];
      case CubicleTypes.ThreeWalls:
        return ['floor', 'back', 'left', 'right'];
      case CubicleTypes.ThreeWallsWithRoof:
        return ['floor', 'back', 'left', 'right', 'roof'];
      case CubicleTypes.FourWalls:
        return ['floor', 'back', 'left', 'right', 'front'];
      case CubicleTypes.FourWallsWithRoof:
        return ['floor', 'back', 'left', 'right', 'front', 'roof'];
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
      { name: 'left', pos: [0, width/2, height/2], rot: [0, -Math.PI/2, 0], width: height, height: width, label: 'Left' },
      // Right face at x=length - spans from (length,0,0) to (length,width,height)
      { name: 'right', pos: [length, width/2, height/2], rot: [0, Math.PI/2, 0], width: height, height: width, label: 'Right' }
    ].filter(face => visibleFaces.includes(face.name)),
    [length, width, height, visibleFaces]
  );

  return (
    <group position={offsetPosition}>
      {faces.map(({ name, pos, rot, width: faceWidth, height: faceHeight, label }) => {
        const hasOpening = opening?.face === name;
        const hasTarget =
          targetFace &&
          ((targetFace === 'back-wall' && name === 'back') ||
            (targetFace === 'front-wall' && name === 'front') ||
            (targetFace === 'left-wall' && name === 'left') ||
            (targetFace === 'right-wall' && name === 'right') ||
            (targetFace === 'ceiling' && name === 'roof') ||
            (targetFace === 'floor' && name === 'floor'));

        return (
          <group key={name}>
            <mesh position={pos as [number, number, number]} rotation={rot as [number, number, number]}>
              {(hasOpening && opening) || hasTarget ? (
                <shapeGeometry
                  args={[
                    (() => {
                      const shape = new THREE.Shape();
                      shape.moveTo(-faceWidth / 2, -faceHeight / 2);
                      shape.lineTo(faceWidth / 2, -faceHeight / 2);
                      shape.lineTo(faceWidth / 2, faceHeight / 2);
                      shape.lineTo(-faceWidth / 2, faceHeight / 2);
                      shape.lineTo(-faceWidth / 2, -faceHeight / 2);

                      // Add opening hole if exists
                      if (hasOpening && opening) {
                        const openingHole = new THREE.Path();
                        openingHole.moveTo(-opening.width / 2, -opening.height / 2);
                        openingHole.lineTo(opening.width / 2, -opening.height / 2);
                        openingHole.lineTo(opening.width / 2, opening.height / 2);
                        openingHole.lineTo(-opening.width / 2, opening.height / 2);
                        openingHole.lineTo(-opening.width / 2, -opening.height / 2);
                        shape.holes.push(openingHole);
                      }

                      // Add target hole if exists
                      if (hasTarget) {
                        const targetHole = new THREE.Path();
                        const targetW = targetType === 'Full-Wall' ? faceWidth * 1.0 : stripWidth;
                        const targetH = targetType === 'Full-Wall' ? faceHeight * 1.0 : stripHeight;
                        targetHole.moveTo(-targetW / 2, -targetH / 2);
                        targetHole.lineTo(targetW / 2, -targetH / 2);
                        targetHole.lineTo(targetW / 2, targetH / 2);
                        targetHole.lineTo(-targetW / 2, targetH / 2);
                        targetHole.lineTo(-targetW / 2, -targetH / 2);
                        shape.holes.push(targetHole);
                      }

                      return shape;
                    })()
                  ]}
                />
              ) : (
                <planeGeometry args={[faceWidth, faceHeight]} />
              )}
              {name === 'floor' ? floorMaterial : wallMaterial}
            </mesh>

            {/* Fill target hole with red material */}
            {hasTarget && (
              <mesh position={pos as [number, number, number]} rotation={rot as [number, number, number]}>
                <planeGeometry
                  args={[targetType === 'Full-Wall' ? faceWidth * 1.0 : stripWidth, targetType === 'Full-Wall' ? faceHeight * 1.0 : stripHeight]}
                />
                <meshBasicMaterial color="#ff0000" side={THREE.DoubleSide} />
              </mesh>
            )}
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
  const controlsRef = useRef<OrbitControlsType>(null);
  const [length, setLength] = useState('2');
  const [width, setWidth] = useState('2');
  const [height, setHeight] = useState('2');
  const [openingWidth, setOpeningWidth] = useState('0.8');
  const [openingHeight, setOpeningHeight] = useState('1.2');
  const [openingFace, setOpeningFace] = useState<Opening['face']>('front');
  const [cubicleType, setCubicleType] = useState<CubicleType>(CubicleTypes.ThreeWalls);
  const [threatXLocation, setThreatXLocation] = useState('1.0');
  const [threatYLocation, setThreatYLocation] = useState('1.0');
  const [threatZLocation, setThreatZLocation] = useState('1.0');
  const [threatWeight, setThreatWeight] = useState('10.0');
  const [targetType, setTargetType] = useState('Full-Wall');
  const [targetFace, setTargetFace] = useState('back-wall');
  const axisSize = useMemo(() => Math.max(Number(length), Number(width), Number(height)) * 1.5, [length, width, height]);
  const textSize = useMemo(() => Math.min(Number(length), Number(width), Number(height)) * 0.1, [length, width, height]);
  const opening = { face: openingFace, width: Number(openingWidth), height: Number(openingHeight) };

  const [stripHeight, setStripHeight] = useState('1.0');
  const [stripWidth, setStripWidth] = useState('1.0');

  const targetOptions: DropdownOption[] = useMemo(() => {
    switch (cubicleType) {
      case CubicleTypes.CantileverWall:
        return [{ value: 'back-wall', label: 'Back Wall' }];
      case CubicleTypes.TwoAdjacentWalls:
        return [
          { value: 'back-wall', label: 'Back Wall' },
          { value: 'left-wall', label: 'Left Wall' }
        ];
      case CubicleTypes.TwoAdjacentWallsWithRoof:
        return [
          { value: 'back-wall', label: 'Back Wall' },
          { value: 'left-wall', label: 'Left Wall' },
          { value: 'ceiling', label: 'Ceiling' }
        ];
      case CubicleTypes.ThreeWalls:
        return [
          { value: 'back-wall', label: 'Back Wall' },
          { value: 'left-wall', label: 'Left Wall' },
          { value: 'right-wall', label: 'Right Wall' }
        ];
      case CubicleTypes.ThreeWallsWithRoof:
        return [
          { value: 'back-wall', label: 'Back Wall' },
          { value: 'left-wall', label: 'Left Wall' },
          { value: 'right-wall', label: 'Right Wall' },
          { value: 'ceiling', label: 'Ceiling' }
        ];
      case CubicleTypes.FourWalls:
        return [
          { value: 'back-wall', label: 'Back Wall' },
          { value: 'front-wall', label: 'Front Wall' },
          { value: 'left-wall', label: 'Left Wall' },
          { value: 'right-wall', label: 'Right Wall' }
        ];
      case CubicleTypes.FourWallsWithRoof:
        return [
          { value: 'back-wall', label: 'Back Wall' },
          { value: 'front-wall', label: 'Front Wall' },
          { value: 'left-wall', label: 'Left Wall' },
          { value: 'right-wall', label: 'Right Wall' },
          { value: 'ceiling', label: 'Ceiling' }
        ];
    }
  }, [cubicleType]);

  return (
    <div className={styles.appContainer}>
      {/* Navigation Panel */}
      <nav className={styles.navPanel}>
        <h1 className={styles.navHeader}>Cubicle Designer</h1>

        {/* Cubicle Type Selection */}
        <h2 className={styles.sectionTitle}>Configuration</h2>
        <UserDropdown
          label="Cubicle Type"
          options={CUBICLE_TYPES}
          value={cubicleType}
          onChange={value => setCubicleType(value as CubicleType)}
          fontSize="medium"
        />

        <UserInput fontSize="medium" label="Length (X)" type="number" unit="ft" value={length} onChange={setLength} validation={{ min: 0.1 }} />
        <UserInput fontSize="medium" label="Width (Y)" type="number" unit="ft" value={width} onChange={setWidth} validation={{ min: 0.1 }} />
        <UserInput fontSize="medium" label="Height (Z)" type="number" unit="ft" value={height} onChange={setHeight} validation={{ min: 0.1 }} />

        {/* Opening Configuration */}

        <hr />
        <h2 className={styles.sectionTitle}>Opening</h2>
        <UserDropdown
          label="Opening Face"
          options={[
            { value: 'front', label: 'Front' },
            { value: 'back', label: 'Back' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'floor', label: 'Floor' },
            { value: 'roof', label: 'Roof' }
          ]}
          value={openingFace}
          onChange={value => setOpeningFace(value as Opening['face'])}
          fontSize="medium"
          helpText='"Test'
        />

        <UserInput
          fontSize="medium"
          helpText="test"
          label="Width"
          type="number"
          unit="ft"
          value={openingWidth}
          onChange={setOpeningWidth}
          validation={{ min: 0.1 }}
        />
        <UserInput fontSize="medium" label="Height" type="number" unit="ft" value={openingHeight} onChange={setOpeningHeight} validation={{ min: 0.1 }} />
        <hr />
        <h3 className={styles.sectionTitle}>Threat Location</h3>

        <UserInput
          fontSize="medium"
          label="X Location"
          type="number"
          unit="ft"
          value={threatXLocation}
          onChange={setThreatXLocation}
          validation={{ min: 0.0, max: Number(length) }}
        />
        <UserInput
          fontSize="medium"
          label="Y Location"
          type="number"
          unit="ft"
          value={threatYLocation}
          onChange={setThreatYLocation}
          validation={{ min: 0.0, max: Number(width) }}
        />
        <UserInput
          fontSize="medium"
          label="Z Location"
          type="number"
          unit="ft"
          value={threatZLocation}
          onChange={setThreatZLocation}
          validation={{ min: 0.0, max: Number(height) }}
        />
        <UserInput fontSize="medium" label="Weight" type="number" unit="lbs" value={threatWeight} onChange={setThreatWeight} validation={{ min: 0.1 }} />

        <hr />
        <h3 className={styles.sectionTitle}>Target Location</h3>

        <UserDropdown label="Target Face" options={targetOptions} value={targetFace} onChange={setTargetFace} fontSize="medium" />

        <UserDropdown
          label="Target Type"
          options={[
            { value: 'Full-Wall', label: 'Full Wall' },
            { value: 'Strip', label: 'Strip' },
            { value: 'Object', label: 'Object' }
          ]}
          value={targetType}
          onChange={setTargetType}
          fontSize="medium"
        />
        {targetType === 'Strip' ? (
          <>
            <UserInput fontSize="medium" label="Strip Height" type="number" unit="ft" value={stripHeight} onChange={setStripHeight} validation={{ min: 0.1 }} />
            <UserInput fontSize="medium" label="Strip Width" type="number" unit="ft" value={stripWidth} onChange={setStripWidth} validation={{ min: 0.1 }} />
          </>
        ) : targetType === 'Object' ? (
          <UserInput fontSize="medium" label="Object Diameter" type="number" unit="ft" value="0.5" onChange={() => {}} validation={{ min: 0.1 }} />
        ) : null}
      </nav>

      {/* Main Content Area */}
      <main className={styles.contentArea}>
        {/* 3D Render Section */}
        <section className={styles.renderSection}>
          {/* Canvas Control Buttons */}
          <div className={styles.canvasControls}>
            <button
              className={styles.canvasButton}
              onClick={() => {
                const controls = controlsRef.current;
                if (controls) {
                  // Reset to default view
                  controls.reset();
                }
              }}
              title="Reset View"
            >
              🔄 Reset
            </button>
            <button
              className={styles.canvasButton}
              onClick={() => {
                const controls = controlsRef.current;
                if (controls) {
                  // Fit the cubicle in view
                  const maxDim = Math.max(Number(length), Number(width), Number(height));
                  const distance = maxDim * 2.5;
                  const centerX = Number(length) / 2;
                  const centerY = Number(width) / 2;
                  const centerZ = Number(height) / 2;

                  controls.object.position.set(centerX + distance * 0.7, centerY - distance * 0.7, centerZ + distance * 0.7);
                  controls.target.set(centerX, centerY, centerZ);
                  controls.update();
                }
              }}
              title="Fit to View"
            >
              🔍 Fit
            </button>
          </div>
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
              targetFace={targetFace}
              targetType={targetType}
              stripWidth={Number(stripWidth)}
              stripHeight={Number(stripHeight)}
            />

            {/* Threat Location - Red Sphere */}
            <mesh position={[Number(threatXLocation), Number(threatYLocation), Number(threatZLocation)]}>
              <sphereGeometry args={[Math.min(Number(length), Number(width), Number(height)) * 0.05, 16, 16]} />
              <meshStandardMaterial color="red" />
            </mesh>

            <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} target={[0, 0, 0]} />
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
            {targetType === 'Strip' && (
              <p>
                <strong>Target Strip Size:</strong> {stripWidth}m × {stripHeight}m
              </p>
            )}
            <p>
              <strong>Cubicle Type:</strong> {CUBICLE_TYPES.find(type => type.value === cubicleType)?.label || 'Unknown'}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
