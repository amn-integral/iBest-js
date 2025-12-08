import { UserInput, UserDropdown } from '@integralrsg/iuicomponents';
import { type TargetType, type TargetFaceType, type CubicleType } from '../types';
import { TargetType as TargetTypeConst, TARGET_TYPES, CUBICLE_WALLS_MAP, WallEnum } from '../constants';
import { useMemo } from 'react';

type TargetConfigProps = {
  cubicleType: CubicleType;
  targetFace: TargetFaceType;
  setTargetFace: (value: TargetFaceType) => void;
  targetType: TargetType;
  setTargetType: (value: TargetType) => void;
  stripHeight: string;
  setStripHeight: (value: string) => void;
  stripWidth: string;
  setStripWidth: (value: string) => void;
  onValidationChange: (field: string, hasError: boolean) => void;
};

const wallEnumToLabel = (wall: WallEnum): string => {
  switch (wall) {
    case WallEnum.FLOOR:
      return '0';
    case WallEnum.WALL_1:
      return '1';
    case WallEnum.WALL_2:
      return '2';
    case WallEnum.WALL_3:
      return '3';
    case WallEnum.WALL_4:
      return '4';
    case WallEnum.ROOF:
      return '5';
    default:
      return '';
  }
};

export function TargetConfig({
  cubicleType,
  targetFace,
  setTargetFace,
  targetType,
  setTargetType,
  stripHeight,
  setStripHeight,
  stripWidth,
  setStripWidth,
  onValidationChange
}: TargetConfigProps) {
  const targetFaceOptions = useMemo(() => {
    const walls = CUBICLE_WALLS_MAP[cubicleType] || [];
    // Filter out floor only, include walls and roof
    return walls
      .filter(wall => wall !== WallEnum.FLOOR)
      .map(wall => ({
        value: wall.toString(),
        label: wallEnumToLabel(wall)
      }));
  }, [cubicleType]);

  return (
    <>
      <hr />

      <UserDropdown
        label="Target Face"
        options={targetFaceOptions}
        value={targetFace.toString()}
        onChange={value => setTargetFace(Number(value) as TargetFaceType)}
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
            onValidationChange={(err: boolean) => onValidationChange('stripHeight', err)}
          />
          <UserInput
            fontSize="medium"
            label="Strip Width"
            type="number"
            unit="ft"
            value={stripWidth}
            onChange={setStripWidth}
            validation={{ min: 0.1 }}
            onValidationChange={(err: boolean) => onValidationChange('stripWidth', err)}
          />
        </>
      ) : targetType === TargetTypeConst.Object ? (
        <UserInput fontSize="medium" label="Object Diameter" type="number" unit="ft" value="0.5" onChange={() => {}} validation={{ min: 0.1 }} />
      ) : null}
    </>
  );
}
