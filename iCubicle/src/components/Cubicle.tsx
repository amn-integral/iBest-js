import * as THREE from 'three';
import { useMemo } from 'react';
import { Text } from '@react-three/drei';
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
};

const wallMaterial = <meshBasicMaterial color="rgba(173, 194, 223, 1)" transparent opacity={0.5} side={THREE.DoubleSide} />;
const floorMaterial = <meshStandardMaterial color="rgba(142, 142, 146, 1)" transparent opacity={0.8} side={THREE.DoubleSide} />;

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
  stripHeight = 1
}: CubicleProps) {
  const [length, width, height] = size;
  const textSize = Math.min(length, width, height) * 0.08;
  const visibleFaces = getVisibleFaces(cubicleType);

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
