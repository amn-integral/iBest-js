import * as THREE from 'three'
import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'

type Opening = {
  face: 'front' | 'back' | 'left' | 'right' | 'floor' | 'roof'
  width: number
  height: number
}

type BoxProps = {
  size?: [number, number, number]
  position?: [number, number, number]
  opening?: Opening
}

function Box({ size = [1, 1, 1], position = [0, 0, 0], opening }: BoxProps) {
  const [length, width, height] = size
  const offsetPosition: [number, number, number] = [
    position[0] + length / 2,
    position[1] + width / 2,
    position[2] + height / 2,
  ]

  const material = <meshStandardMaterial color="#90a4c0" transparent opacity={0.5} roughness={0.2} side={THREE.DoubleSide} />
  console.log(`Height: ${height}, Width: ${width}, Length: ${length}`)
  const faces = useMemo(() => [
    { name: 'floor', pos: [0, 0, -height / 2], rot: [0, 0, 0], width: length, height: width, label: 'Floor' },
    { name: 'roof', pos: [0, 0, height / 2], rot: [0, 0, 0], width: length, height: width, label: 'Roof' },
    { name: 'front', pos: [0, width / 2, 0], rot: [-Math.PI / 2, 0, 0], width: length, height: height, label: 'Front' },
    { name: 'back', pos: [0, -width / 2, 0], rot: [Math.PI / 2, 0, 0], width: length, height: height, label: 'Back' },
    { name: 'left', pos: [-length / 2, 0, 0], rot: [0, Math.PI / 2, 0], width: height, height: width, label: 'Left' },
    { name: 'right', pos: [length / 2, 0, 0], rot: [0, -Math.PI / 2, 0], width: height, height: width, label: 'Right' },
  ], [length, width, height])

  return (
    <group position={offsetPosition}>
      {faces.map(({ name, pos, rot, width: faceWidth, height: faceHeight, label }) => {
        const hasOpening = opening?.face === name

        return (
          <group key={name}>
            <mesh position={pos as [number, number, number]} rotation={rot as [number, number, number]}>
              {hasOpening && opening ? (
                <shapeGeometry args={[(() => {
                  const shape = new THREE.Shape()
                  shape.moveTo(-faceWidth / 2, -faceHeight / 2)
                  shape.lineTo(faceWidth / 2, -faceHeight / 2)
                  shape.lineTo(faceWidth / 2, faceHeight / 2)
                  shape.lineTo(-faceWidth / 2, faceHeight / 2)
                  shape.lineTo(-faceWidth / 2, -faceHeight / 2)
                  const hole = new THREE.Path()
                  hole.moveTo(-opening.width / 2, -opening.height / 2)
                  hole.lineTo(opening.width / 2, -opening.height / 2)
                  hole.lineTo(opening.width / 2, opening.height / 2)
                  hole.lineTo(-opening.width / 2, opening.height / 2)
                  hole.lineTo(-opening.width / 2, -opening.height / 2)
                  shape.holes.push(hole)
                  return shape
                })()]} />
              ) : (
                <planeGeometry args={[faceWidth, faceHeight]} />
              )}
              {material}
            </mesh>
            <Text
              position={[pos[0], pos[1], pos[2] + (name === 'floor' ? -0.1 : name === 'roof' ? 0.1 : 0)]}
              rotation={rot as [number, number, number]}
              fontSize={0.15}
              color="#333"
              anchorX="center"
              anchorY="middle"
            >
              {label}
            </Text>
          </group>
        )
      })}
    </group>
  )
}

export default function App() {
  const [length, setLength] = useState(2)
  const [width, setWidth] = useState(2)
  const [height, setHeight] = useState(2)
  const [openingWidth, setOpeningWidth] = useState(0.8)
  const [openingHeight, setOpeningHeight] = useState(1.2)
  const [openingFace, setOpeningFace] = useState<Opening['face']>('front')

  const axisSize = useMemo(() => Math.max(length, width, height) * 1.5, [length, width, height])

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
          maxWidth: 220,
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: 16, color: '#333' }}>Box Dimensions</h3>
        {[
          { label: 'Length', value: length, setter: setLength },
          { label: 'Width', value: width, setter: setWidth },
          { label: 'Height', value: height, setter: setHeight },
        ].map(({ label, value, setter }) => (
          <label key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#555' }}>
            {label}
            <input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setter(Math.max(0.1, Number(e.target.value) || 0.1))}
              style={{ width: 72, border: '1px solid #dcdcdc', borderRadius: 6, padding: '4px 6px', pointerEvents: 'auto' }}
            />
          </label>
        ))}

        <h3 style={{ margin: '16px 0 8px 0', fontWeight: 600, fontSize: 16, color: '#333' }}>Opening</h3>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#555' }}>
          Face
          <select
            value={openingFace}
            onChange={(e) => setOpeningFace(e.target.value as Opening['face'])}
            style={{ width: 72, border: '1px solid #dcdcdc', borderRadius: 6, padding: '4px 6px', pointerEvents: 'auto' }}
          >
            {['front', 'back', 'left', 'right', 'floor', 'roof'].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        {[
          { label: 'Width', value: openingWidth, setter: setOpeningWidth },
          { label: 'Height', value: openingHeight, setter: setOpeningHeight },
        ].map(({ label, value, setter }) => (
          <label key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#555' }}>
            {label}
            <input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setter(Math.max(0.1, Number(e.target.value) || 0.1))}
              style={{ width: 72, border: '1px solid #dcdcdc', borderRadius: 6, padding: '4px 6px', pointerEvents: 'auto' }}
            />
          </label>
        ))}
      </div>

      <Canvas
        camera={{ position: [5, 4, 6], fov: 50 }}
        dpr={[1, 2]}
        onCreated={({ gl }) => gl.setClearColor('#f6f7f9')}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 6, 8]} intensity={0.9} />
        <directionalLight position={[-6, 3, -4]} intensity={0.3} />

        <axesHelper args={[axisSize]} />
        <Text position={[axisSize, 0, 0]} fontSize={0.3} color="red">X</Text>
        <Text position={[0, axisSize, 0]} fontSize={0.3} color="green">Y</Text>
        <Text position={[0, 0, axisSize]} fontSize={0.3} color="blue">Z</Text>

        <Box
          size={[length, width, height]}
          position={[0, 0, 0]}
          opening={{ face: openingFace, width: openingWidth, height: openingHeight }}
        />

        <OrbitControls enableDamping dampingFactor={0.08} target={[0, 0, 0]} />
      </Canvas>
    </div>
  )
}