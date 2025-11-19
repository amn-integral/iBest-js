import * as THREE from 'three';
import { useState, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { type OrbitControls as OrbitControlsType } from 'three-stdlib';
import styles from './App.module.css';
import { UserInput, UserDropdown } from '@integralrsg/iuicomponents';
import '@integralrsg/iuicomponents/styles';
import { type CubicleType, type TargetType, type TargetFaceType } from './types';
import { CubicleTypes, CUBICLE_TYPES, TargetType as TargetTypeConst, TARGET_TYPES, TargetFaceType as TargetFaceTypeConst, TARGET_FACES } from './constants';
import { fetchCubicleData, type CubicleRequest } from './api';

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
  cubicleType = 'Three-Walls',
  targetFace,
  targetType,
  stripWidth = 1,
  stripHeight = 1
}: BoxProps) {
  const [length, width, height] = size;
  // Cubicle starts at position and extends in +X, +Y, +Z directions
  const offsetPosition: [number, number, number] = [position[0], position[1], position[2]];

  const wallMaterial = <meshBasicMaterial color="rgba(173, 194, 223, 1)" transparent opacity={0.5} side={THREE.DoubleSide} />;
  const floorMaterial = <meshStandardMaterial color="rgba(142, 142, 146, 1)" transparent opacity={0.8} side={THREE.DoubleSide} />;

  // Dynamic text size based on smallest dimension for legibility
  const minDim = Math.min(length, width, height);
  const textSize = minDim * 0.08; // 8% of smallest dimension

  // Define which faces to show based on cubicle type
  const getVisibleFaces = (type: CubicleType): string[] => {
    switch (type) {
      case CubicleTypes.CantileverWall:
        return ['floor', 'back'];
      case CubicleTypes.TwoAdjacentWalls:
        return ['floor', 'back', 'right'];
      case CubicleTypes.TwoAdjacentWallsWithRoof:
        return ['floor', 'back', 'right', 'roof'];
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
      { name: 'floor', pos: [length / 2, width / 2, 0], rot: [0, 0, 0], width: length, height: width, label: 'Floor' },
      // Roof at z=height - spans from (0,0,height) to (length,width,height)
      { name: 'roof', pos: [length / 2, width / 2, height], rot: [0, 0, 0], width: length, height: width, label: 'Roof' },
      // Front face at y=width - spans from (0,width,0) to (length,width,height)
      { name: 'front', pos: [length / 2, width, height / 2], rot: [-Math.PI / 2, 0, 0], width: length, height: height, label: 'Front' },
      // Back face at y=0 - spans from (0,0,0) to (length,0,height)
      { name: 'back', pos: [length / 2, 0, height / 2], rot: [Math.PI / 2, 0, 0], width: length, height: height, label: 'Back' },
      // Left face at x=0 - spans from (0,0,0) to (0,width,height)
      { name: 'left', pos: [0, width / 2, height / 2], rot: [0, -Math.PI / 2, 0], width: height, height: width, label: 'Left' },
      // Right face at x=length - spans from (length,0,0) to (length,width,height)
      { name: 'right', pos: [length, width / 2, height / 2], rot: [0, Math.PI / 2, 0], width: height, height: width, label: 'Right' }
    ].filter(face => visibleFaces.includes(face.name)),
    [length, width, height, visibleFaces]
  );

  return (
    <group position={offsetPosition}>
      {faces.map(({ name, pos, rot, width: faceWidth, height: faceHeight, label }) => {
        const hasOpening = opening?.face === name;
        const hasTarget =
          targetFace &&
          ((targetFace === TargetFaceTypeConst.BackWall && name === 'back') ||
            (targetFace === TargetFaceTypeConst.SideWall && (name === 'left' || name === 'right')) ||
            (targetFace === TargetFaceTypeConst.Roof && name === 'roof'));

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
                        const targetW = targetType === TargetTypeConst.FullWall ? faceWidth * 1.0 : stripWidth;
                        const targetH = targetType === TargetTypeConst.FullWall ? faceHeight * 1.0 : stripHeight;
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
                  args={[
                    targetType === TargetTypeConst.FullWall ? faceWidth * 1.0 : stripWidth,
                    targetType === TargetTypeConst.FullWall ? faceHeight * 1.0 : stripHeight
                  ]}
                />
                <meshBasicMaterial color="#ff0000" transparent opacity={0.1} side={THREE.DoubleSide} />
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
  const [targetType, setTargetType] = useState<TargetType>(TargetTypeConst.FullWall);
  const [targetFace, setTargetFace] = useState<TargetFaceType>(TargetFaceTypeConst.BackWall);

  const [stripHeight, setStripHeight] = useState('1.0');
  const [stripWidth, setStripWidth] = useState('1.0');

  // Track validation errors from UserInput components
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const setFieldError = (fieldName: string, hasError: boolean) => {
    setValidationErrors(prev => ({ ...prev, [fieldName]: hasError }));
  };

  // Button is enabled only when no validation errors exist
  const hasAnyErrors = Object.values(validationErrors).some(hasError => hasError);
  const isValid = !hasAnyErrors;

  const handleAnalyze = () => {
    if (!isValid || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    const requestData: CubicleRequest = {
      cubicle_type: cubicleType,
      target_face: targetFace,
      Lc: Number(length),
      Wc: Number(width),
      Hc: Number(height),
      X: Number(threatXLocation),
      Y: Number(threatYLocation),
      Z: Number(threatZLocation),
      Wo: Number(openingWidth),
      Ho: Number(openingHeight),
      W: Number(threatWeight)
    };

    fetchCubicleData(requestData)
      .then(response => {
        if (response.success && response.result) {
          const { pressure, impulse, parameters } = response.result;

          // Format result as HTML with bold labels
          let resultHtml = `<p><strong>Pressure:</strong> ${pressure.toFixed(2)} psi</p>`;

          // Format impulse if it exists
          if (impulse && typeof impulse === 'object') {
            resultHtml += '<p><strong>Impulse:</strong></p><ul>';
            Object.entries(impulse).forEach(([key, value]) => {
              resultHtml += `<li><strong>${key}:</strong> ${value}</li>`;
            });
            resultHtml += '</ul>';
          }

          // Format parameters if they exist
          if (parameters && typeof parameters === 'object') {
            resultHtml += '<p><strong>Parameters:</strong></p><ul>';
            Object.entries(parameters).forEach(([key, value]) => {
              resultHtml += `<li><strong>${key}:</strong> ${value}</li>`;
            });
            resultHtml += '</ul>';
          }

          setAnalysisResult(resultHtml);
        } else {
          setAnalysisError(response.message || 'Analysis failed');
        }
      })
      .catch(error => {
        setAnalysisError(error instanceof Error ? error.message : 'Unknown error occurred');
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  };

  const lengthValue = Number(length);
  const widthValue = Number(width);
  const heightValue = Number(height);
  const stripWidthValue = Number(stripWidth);
  const stripHeightValue = Number(stripHeight);
  const openingWidthValue = Number(openingWidth);
  const openingHeightValue = Number(openingHeight);
  const threatXValue = Number(threatXLocation);
  const threatYValue = Number(threatYLocation);
  const threatZValue = Number(threatZLocation);
  const threatPosition = useMemo(() => [threatXValue, threatYValue, threatZValue] as [number, number, number], [threatXValue, threatYValue, threatZValue]);

  const axisSize = useMemo(() => Math.max(lengthValue, widthValue, heightValue) * 1.5, [lengthValue, widthValue, heightValue]);
  const textSize = useMemo(() => Math.min(lengthValue, widthValue, heightValue) * 0.1, [lengthValue, widthValue, heightValue]);
  const opening = useMemo(
    () => ({
      face: openingFace,
      width: openingWidthValue,
      height: openingHeightValue
    }),
    [openingFace, openingWidthValue, openingHeightValue]
  );
  const sceneCenter = useMemo(() => [lengthValue / 2, widthValue / 2, heightValue / 2] as [number, number, number], [lengthValue, widthValue, heightValue]);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const formatMeasurement = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '0.00');
  const planZoom = useMemo(() => clamp(200 / Math.max(lengthValue, widthValue, 1), 20, 200), [lengthValue, widthValue]);
  const elevationZoom = useMemo(() => clamp(200 / Math.max(lengthValue, heightValue, 1), 20, 200), [lengthValue, heightValue]);
  const heightRatio = clamp(heightValue > 0 ? threatZValue / heightValue : 0, 0, 10);
  const nValue = useMemo(() => {
    switch (cubicleType) {
      case CubicleTypes.CantileverWall:
        return 1;
      case CubicleTypes.TwoAdjacentWalls:
        return 2;
      case CubicleTypes.ThreeWalls:
        return targetFace === TargetFaceTypeConst.BackWall ? 3 : 2;
      case CubicleTypes.FourWalls:
        return 3;
      case CubicleTypes.TwoAdjacentWallsWithRoof:
        return targetFace === TargetFaceTypeConst.Roof ? 2 : 3;
      case CubicleTypes.ThreeWallsWithRoof:
        return targetFace === TargetFaceTypeConst.BackWall ? 4 : 3;
      case CubicleTypes.FourWallsWithRoof:
        return 4;
      default:
        return 1;
    }
  }, [cubicleType, targetFace]);

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

      <Box
        size={[lengthValue, widthValue, heightValue]}
        position={[0, 0, 0]}
        opening={opening}
        cubicleType={cubicleType}
        targetFace={targetFace}
        targetType={targetType}
        stripWidth={stripWidthValue}
        stripHeight={stripHeightValue}
      />

      <mesh position={threatPosition}>
        <sphereGeometry args={[Math.min(lengthValue, widthValue, heightValue) * 0.05, 16, 16]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </>
  );

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

        <UserInput
          fontSize="medium"
          label="Length (X)"
          type="number"
          unit="ft"
          value={length}
          onChange={setLength}
          validation={{ min: 0.1 }}
          onValidationChange={(hasError: boolean) => setFieldError('length', hasError)}
        />
        <UserInput
          fontSize="medium"
          label="Width (Y)"
          type="number"
          unit="ft"
          value={width}
          onChange={setWidth}
          validation={{ min: 0.1 }}
          onValidationChange={(hasError: boolean) => setFieldError('width', hasError)}
        />
        <UserInput
          fontSize="medium"
          label="Height (Z)"
          type="number"
          unit="ft"
          value={height}
          onChange={setHeight}
          validation={{ min: 0.1 }}
          onValidationChange={(hasError: boolean) => setFieldError('height', hasError)}
        />

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
        />

        <UserInput
          fontSize="medium"
          label="Opening Width"
          type="number"
          unit="in"
          value={openingWidth}
          onChange={setOpeningWidth}
          validation={{ min: 0 }}
          onValidationChange={(hasError: boolean) => setFieldError('openingWidth', hasError)}
        />
        <UserInput
          fontSize="medium"
          label="Opening Height"
          type="number"
          unit="in"
          value={openingHeight}
          onChange={setOpeningHeight}
          validation={{ min: 0 }}
          onValidationChange={(hasError: boolean) => setFieldError('openingHeight', hasError)}
        />
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
          onValidationChange={(err: boolean) => setFieldError('threatX', err)}
        />
        <UserInput
          fontSize="medium"
          label="Y Location"
          type="number"
          unit="ft"
          value={threatYLocation}
          onChange={setThreatYLocation}
          validation={{ min: 0.0, max: Number(width) }}
          onValidationChange={(err: boolean) => setFieldError('threatY', err)}
        />
        <UserInput
          fontSize="medium"
          label="Z Location"
          type="number"
          unit="ft"
          value={threatZLocation}
          onChange={setThreatZLocation}
          validation={{ min: 0.0, max: Number(height) }}
          onValidationChange={(err: boolean) => setFieldError('threatZ', err)}
        />
        <UserInput
          fontSize="medium"
          label="Weight"
          type="number"
          unit="lbs"
          value={threatWeight}
          onChange={setThreatWeight}
          validation={{ min: 0.1 }}
          onValidationChange={(err: boolean) => setFieldError('threatWeight', err)}
        />

        <hr />
        <h3 className={styles.sectionTitle}>Target Location</h3>

        <UserDropdown
          label="Target Face"
          options={TARGET_FACES}
          value={targetFace}
          onChange={value => setTargetFace(value as TargetFaceType)}
          fontSize="medium"
        />

        <UserDropdown label="Target Type" options={TARGET_TYPES} value={targetType} onChange={value => setTargetType(value as TargetType)} fontSize="medium" />
        {targetType === TargetTypeConst.Strip ? (
          <>
            <UserInput
              fontSize="medium"
              label="Strip Height"
              type="number"
              unit="ft"
              value={stripHeight}
              onChange={setStripHeight}
              validation={{ min: 0.1 }}
              onValidationChange={(err: boolean) => setFieldError('stripHeight', err)}
            />
            <UserInput
              fontSize="medium"
              label="Strip Width"
              type="number"
              unit="ft"
              value={stripWidth}
              onChange={setStripWidth}
              validation={{ min: 0.1 }}
              onValidationChange={(err: boolean) => setFieldError('stripWidth', err)}
            />
          </>
        ) : targetType === TargetTypeConst.Object ? (
          <UserInput fontSize="medium" label="Object Diameter" type="number" unit="ft" value="0.5" onChange={() => {}} validation={{ min: 0.1 }} />
        ) : null}

        <hr />
        <button className={styles.analyzeButton} onClick={handleAnalyze} disabled={!isValid || isAnalyzing}>
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
      </nav>

      {/* Main Content Area */}
      <main className={styles.contentArea}>
        {/* Multi-view Render Section */}
        <section className={styles.renderSection}>
          <div className={styles.viewGrid}>
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
                        const maxDim = Math.max(lengthValue, widthValue, heightValue);
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
                  <span className={styles.heightMin}>Room Height (H = {formatMeasurement(heightValue)} ft)</span>
                  <span className={styles.heightMin}>Threat Elevation (h = {formatMeasurement(threatZValue)} ft)</span>
                  <span className={styles.heightMin}>h/H = {formatMeasurement(heightRatio)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Output Section */}
        <section className={styles.outputSection}>
          <h2 className={styles.outputHeader}>Analysis & Output</h2>
          <div className={styles.outputContent}>
            <p>
              <strong>Cubicle Type:</strong> {cubicleType.charAt(0).toUpperCase() + cubicleType.slice(1).replace('-', ' ')}
            </p>{' '}
            <p>
              <strong>N:</strong> {nValue}
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
            {targetType === TargetTypeConst.Strip && (
              <p>
                <strong>Target Strip Size:</strong> {stripWidth}m × {stripHeight}m
              </p>
            )}
            <p>
              <strong>Cubicle Type:</strong> {CUBICLE_TYPES.find(type => type.value === cubicleType)?.label || 'Unknown'}
            </p>
            <hr className={styles.outputDivider} />
            {isAnalyzing && (
              <div className={styles.analysisLoading}>
                <p>
                  <strong>Analyzing...</strong>
                </p>
              </div>
            )}
            {analysisResult && (
              <div className={styles.analysisResultOutput}>
                <h3>Analysis Results</h3>
                <div className={styles.resultContent} dangerouslySetInnerHTML={{ __html: analysisResult }} />
              </div>
            )}
            {analysisError && (
              <div className={styles.analysisErrorOutput}>
                <h3>Error</h3>
                <p>{analysisError}</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
