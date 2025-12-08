import { UserInput, UserDropdown } from '@integralrsg/iuicomponents';
import { type CubicleType } from '../types';
import { CUBICLE_WALLS_MAP, WallEnum } from '../constants';
import { useMemo } from 'react';

type OpeningConfigProps = {
  cubicleType: CubicleType;
  openingFace: WallEnum;
  setOpeningFace: (value: WallEnum) => void;
  openingWidth: string;
  setOpeningWidth: (value: string) => void;
  openingHeight: string;
  setOpeningHeight: (value: string) => void;
  openingWf: string;
  setOpeningWf: (value: string) => void;
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

export function OpeningConfig({
  cubicleType,
  openingFace,
  setOpeningFace,
  openingWidth,
  setOpeningWidth,
  openingHeight,
  setOpeningHeight,
  openingWf,
  setOpeningWf,
  onValidationChange
}: OpeningConfigProps) {
  const openingFaceOptions = useMemo(() => {
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
        label="Opening Location"
        options={openingFaceOptions}
        value={openingFace.toString()}
        onChange={value => setOpeningFace(Number(value) as WallEnum)}
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
        onValidationChange={(hasError: boolean) => onValidationChange('openingWidth', hasError)}
      />
      <UserInput
        fontSize="medium"
        label="Opening Height"
        type="number"
        unit="in"
        value={openingHeight}
        onChange={setOpeningHeight}
        validation={{ min: 0 }}
        onValidationChange={(hasError: boolean) => onValidationChange('openingHeight', hasError)}
      />
      <UserInput
        fontSize="medium"
        label="Wf"
        type="number"
        unit="psi"
        value={openingWf}
        onChange={setOpeningWf}
        validation={{ min: 0 }}
        helpText='Weight of frangible element'
        onValidationChange={(hasError: boolean) => onValidationChange('openingWf', hasError)}
      />
    </>
  );
}
