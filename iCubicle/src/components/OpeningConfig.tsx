import { UserInput, UserDropdown } from '@integralrsg/iuicomponents';
import { type CubicleType } from '../types';
import { CONFIG_OPTIONS, WallEnum } from '../constants';
import { useMemo } from 'react';

type OpeningConfigProps = {
  cubicleType: CubicleType;
  configOption: string;
  openingFace: WallEnum;
  setOpeningFace: (value: WallEnum) => void;
  openingWidth: string;
  setOpeningWidth: (value: string) => void;
  openingHeight: string;
  setOpeningHeight: (value: string) => void;
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
  configOption,
  openingFace,
  setOpeningFace,
  openingWidth,
  setOpeningWidth,
  openingHeight,
  setOpeningHeight,
  onValidationChange
}: OpeningConfigProps) {
  const openingFaceOptions = useMemo(() => {
    const config = CONFIG_OPTIONS[cubicleType as keyof typeof CONFIG_OPTIONS];
    if (config && configOption) {
      const selectedWalls = config[configOption as keyof typeof config];
      if (selectedWalls) {
        // Filter out floor only, include walls and roof
        return selectedWalls
          .filter(wall => wall !== WallEnum.FLOOR)
          .map(wall => ({
            value: wall.toString(),
            label: wallEnumToLabel(wall)
          }));
      }
    }
    return [];
  }, [cubicleType, configOption]);

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
    </>
  );
}
