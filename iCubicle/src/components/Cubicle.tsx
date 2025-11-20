import * as THREE from 'three';
import { useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';
import { type CubicleType, type TargetType, type TargetFaceType } from '../types';
import { CubicleTypes, TargetType as TargetTypeConst, TargetFaceType as TargetFaceTypeConst } from '../constants';

type Opening = {
  face: 'front' | 'back' | 'left' | 'right' | 'floor' | 'roof';
  width: number;
  height: number;
};

type CubicleProps = {
  size?: [number, number, number];
  position?: [number, number, number];
  opening?: Opening;
  cubicleType?: CubicleType;
  targetFace?: TargetFaceType;
  targetType?: TargetType;
  stripWidth?: number;
  stripHeight?: number;
  threatPosition?: [number, number, number];
};

const wallMaterial = <meshStandardMaterial color="#94a3b8" transparent opacity={0.85} side={THREE.DoubleSide} />;
const floorMaterial = <meshStandardMaterial color="#64748b" transparent opacity={0.9} side={THREE.DoubleSide} />;

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

export function Cubicle({
  size = [1, 1, 1],
  position = [0, 0, 0],
  opening,
  cubicleType = 'Three-Walls',
  targetFace,
  targetType,
  stripWidth = 1,
  stripHeight = 1,
  threatPosition
}: CubicleProps) {
  const [length, width, height] = size;
  const textSize = Math.min(length, width, height) * 0.08;
  const visibleFaces = getVisibleFaces(cubicleType);

  // Calculate sphere size for threat proximity check
  const sphereSize = Math.min(length, width, height) * 0.05;
  const sphereDiameter = sphereSize * 2;

  // Function to calculate text offset if threat is too close
  const getTextOffset = (faceName: string, facePos: [number, number, number]): [number, number, number] => {
    if (!threatPosition) return facePos;

    const [fx, fy, fz] = facePos;
    const [tx, ty, tz] = threatPosition;

    // Calculate distance from threat to face center (in 2D plane of the face)
    let distance: number;
    if (faceName === 'floor' || faceName === 'roof') {
      // For floor/roof, check X-Y distance
      distance = Math.sqrt((tx - fx) ** 2 + (ty - fy) ** 2);
    } else if (faceName === 'back' || faceName === 'front') {
      // For back/front, check X-Z distance
      distance = Math.sqrt((tx - fx) ** 2 + (tz - fz) ** 2);
    } else {
      // For left/right, check Y-Z distance
      distance = Math.sqrt((ty - fy) ** 2 + (tz - fz) ** 2);
    }


    // If threat is NOT within sphere diameter from face center, keep centered
    if (distance > sphereDiameter) {
      return facePos;
    }

    // Threat is too close - offset by sphere diameter away from threat
    let offsetX = fx;
    let offsetY = fy;
    let offsetZ = fz;

    if (faceName === 'floor' || faceName === 'roof') {
      // Offset in X-Y plane
      const dx = fx - tx;
      const dy = fy - ty;
      const d = Math.sqrt(dx ** 2 + dy ** 2);
      if (d > 0.001) {
        // Has meaningful distance, offset away from threat
        offsetX = fx + (dx / d) * 2 * sphereDiameter;
        offsetY = fy + (dy / d) * 2 * sphereDiameter;
      } else {
        // Threat is directly below/above - offset to the right
        offsetX = fx + 2 * sphereDiameter;
      }
    } else if (faceName === 'back' || faceName === 'front') {
      // Offset in X-Z plane
      const dx = fx - tx;
      const dz = fz - tz;
      const d = Math.sqrt(dx ** 2 + dz ** 2);
      if (d > 0.001) {
        // For back wall, invert X offset so it appears correctly in elevation view
        const xMultiplier = faceName === 'back' ? -1 : 1;
        offsetX = fx + xMultiplier * (dx / d) * 2 * sphereDiameter;
        offsetZ = fz + (dz / d) * 2 * sphereDiameter;
      } else {
        // Threat is at same X-Z position - offset to the right (inverted for back)
        offsetX = fx + (faceName === 'back' ? -1 : 1) * 2 * sphereDiameter;
      }
    } else {
      // Offset in Y-Z plane
      const dy = fy - ty;
      const dz = fz - tz;
      const d = Math.sqrt(dy ** 2 + dz ** 2);
      if (d > 0.001) {
        offsetY = fy + (dy / d) * 2 * sphereDiameter;
        offsetZ = fz + (dz / d) * 2 * sphereDiameter;
      } else {
        // Threat is at same Y-Z position - offset upward
        offsetY = fy + 2 * sphereDiameter;
      }
    }

    return [offsetX, offsetY, offsetZ];
  };

  // prettier-ignore
  const faces = useMemo(
    () => [
      { name: 'floor', pos: [length / 2, width / 2, 0], rot: [0, 0, 0], width: length, height: width, label: 'Floor' },
      { name: 'roof', pos: [length / 2, width / 2, height], rot: [0, 0, 0], width: length, height: width, label: 'Roof' },
      { name: 'front', pos: [length / 2, width, height / 2], rot: [-Math.PI / 2, 0, 0], width: length, height: height, label: 'Front' },
      { name: 'back', pos: [length / 2, 0, height / 2], rot: [Math.PI / 2, 0, 0], width: length, height: height, label: 'Back' },
      { name: 'left', pos: [0, width / 2, height / 2], rot: [0, -Math.PI / 2, 0], width: height, height: width, label: 'Left' },
      { name: 'right', pos: [length, width / 2, height / 2], rot: [0, Math.PI / 2, 0], width: height, height: width, label: 'Right' }
    ].filter(face => visibleFaces.includes(face.name)),
    [length, width, height, visibleFaces]
  );

  return (
    <group position={position}>
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

                      if (hasOpening && opening) {
                        const openingHole = new THREE.Path();
                        openingHole.moveTo(-opening.width / 2, -opening.height / 2);
                        openingHole.lineTo(opening.width / 2, -opening.height / 2);
                        openingHole.lineTo(opening.width / 2, opening.height / 2);
                        openingHole.lineTo(-opening.width / 2, opening.height / 2);
                        openingHole.lineTo(-opening.width / 2, -opening.height / 2);
                        shape.holes.push(openingHole);
                      }

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

            {hasOpening && opening && (
              <lineSegments position={pos as [number, number, number]} rotation={rot as [number, number, number]}>
                <edgesGeometry args={[new THREE.PlaneGeometry(opening.width, opening.height)]} />
                <lineBasicMaterial color="#1e293b" linewidth={2} />
              </lineSegments>
            )}

            {hasTarget && (
              <mesh position={pos as [number, number, number]} rotation={rot as [number, number, number]}>
                <planeGeometry
                  args={[
                    targetType === TargetTypeConst.FullWall ? faceWidth * 1.0 : stripWidth,
                    targetType === TargetTypeConst.FullWall ? faceHeight * 1.0 : stripHeight
                  ]}
                />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.3} side={THREE.DoubleSide} />
              </mesh>
            )}

            {name === 'floor' || name === 'roof' ? (
              <Text
                position={(() => {
                  const offset = getTextOffset(name, pos as [number, number, number]);
                  // Add Z offset for floor/roof text readability
                  if (name === 'floor') return [offset[0], offset[1], offset[2] - textSize];
                  if (name === 'roof') return [offset[0], offset[1], offset[2] + textSize];
                  return offset;
                })()}
                rotation={rot as [number, number, number]}
                fontSize={textSize * 1.3}
                color="#1e293b"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.015}
                outlineColor="white"
                fontWeight="bold"
              >
                {label}
              </Text>
            ) : (
              <Billboard
                position={(() => {
                  const offset = getTextOffset(name, pos as [number, number, number]);
                  return offset;
                })()}
                follow={true}
                lockX={false}
                lockY={false}
                lockZ={false}
              >
                <Text fontSize={textSize * 1.3} color="#1e293b" anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="white" fontWeight="bold">
                  {label}
                </Text>
              </Billboard>
            )}
          </group>
        );
      })}
    </group>
  );
}
