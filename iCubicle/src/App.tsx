import * as THREE from 'three';
import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

type CubicleType = 'cantilever' | 'two-wall' | 'three-wall' | 'default';

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
  const [length, setLength] = useState(2);
  const [width, setWidth] = useState(2);
  const [height, setHeight] = useState(2);
  const [openingWidth, setOpeningWidth] = useState(0.8);
  const [openingHeight, setOpeningHeight] = useState(1.2);
  const [openingFace, setOpeningFace] = useState<Opening['face']>('front');
  const [cubicleType, setCubicleType] = useState<CubicleType>('three-wall');

  const axisSize = useMemo(() => Math.max(length, width, height) * 1.5, [length, width, height]);
  const textSize = useMemo(() => Math.min(length, width, height) * 0.1, [length, width, height]);
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f6f7f9', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '16px 20px',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          fontFamily: 'system-ui',
          zIndex: 10,
          pointerEvents: 'none',
          maxWidth: 220
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: 16, color: '#333' }}>Cubicle Configuration</h3>

        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#555' }}>
          Type
          <select
            value={cubicleType}
            onChange={e => setCubicleType(e.target.value as CubicleType)}
            style={{ width: 90, border: '1px solid #dcdcdc', borderRadius: 6, padding: '4px 6px', pointerEvents: 'auto' }}
          >
            <option value="cantilever">Cantilever</option>
            <option value="two-wall">Two Wall</option>
            <option value="three-wall">Three Wall</option>
            <option value="default">Default</option>
          </select>
        </label>

        <h4 style={{ margin: '12px 0 8px 0', fontWeight: 600, fontSize: 14, color: '#333' }}>Dimensions</h4>
        {[
          { label: 'Length', value: length, setter: setLength },
          { label: 'Width', value: width, setter: setWidth },
          { label: 'Height', value: height, setter: setHeight }
        ].map(({ label, value, setter }) => (
          <label key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#555' }}>
            {label}
            <input
              type="number"
              step="0.1"
              value={value}
              onChange={e => setter(Math.max(0.1, Number(e.target.value) || 0.1))}
              style={{ width: 72, border: '1px solid #dcdcdc', borderRadius: 6, padding: '4px 6px', pointerEvents: 'auto' }}
            />
          </label>
        ))}

        <h3 style={{ margin: '16px 0 8px 0', fontWeight: 600, fontSize: 16, color: '#333' }}>Opening</h3>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#555' }}>
          Face
          <select
            value={openingFace}
            onChange={e => setOpeningFace(e.target.value as Opening['face'])}
            style={{ width: 72, border: '1px solid #dcdcdc', borderRadius: 6, padding: '4px 6px', pointerEvents: 'auto' }}
          >
            {['front', 'back', 'left', 'right', 'floor', 'roof'].map(f => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        {[
          { label: 'Width', value: openingWidth, setter: setOpeningWidth },
          { label: 'Height', value: openingHeight, setter: setOpeningHeight }
        ].map(({ label, value, setter }) => (
          <label key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#555' }}>
            {label}
            <input
              type="number"
              step="0.1"
              value={value}
              onChange={e => setter(Math.max(0.1, Number(e.target.value) || 0.1))}
              style={{ width: 72, border: '1px solid #dcdcdc', borderRadius: 6, padding: '4px 6px', pointerEvents: 'auto' }}
            />
          </label>
        ))}
      </div>

      <Canvas camera={{ position: [5, -4, 6], fov: 50, up: [0, 0, 1] }} dpr={[1, 2]} onCreated={({ gl }) => gl.setClearColor('#f6f7f9')}>
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
          size={[length, width, height]}
          position={[0, 0, 0]}
          opening={{ face: openingFace, width: openingWidth, height: openingHeight }}
          cubicleType={cubicleType}
        />

        <OrbitControls enableDamping dampingFactor={0.08} target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}
