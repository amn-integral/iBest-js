import { UserInput, UserDropdown } from '@integralrsg/iuicomponents';
import '@integralrsg/iuicomponents/styles';
import { type CubicleType } from '../types';
import { CUBICLE_TYPES } from '../constants';

type CubicleConfigProps = {
  cubicleType: CubicleType;
  setCubicleType: (value: CubicleType) => void;
  length: string;
  setLength: (value: string) => void;
  width: string;
  setWidth: (value: string) => void;
  height: string;
  setHeight: (value: string) => void;
  onValidationChange: (field: string, hasError: boolean) => void;
};

export function CubicleConfig({ cubicleType, setCubicleType, length, setLength, width, setWidth, height, setHeight, onValidationChange }: CubicleConfigProps) {
  return (
    <>
      <hr />

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
        onValidationChange={(hasError: boolean) => onValidationChange('length', hasError)}
      />
      <UserInput
        fontSize="medium"
        label="Width (Y)"
        type="number"
        unit="ft"
        value={width}
        onChange={setWidth}
        validation={{ min: 0.1 }}
        onValidationChange={(hasError: boolean) => onValidationChange('width', hasError)}
      />
      <UserInput
        fontSize="medium"
        label="Height (Z)"
        type="number"
        unit="ft"
        value={height}
        onChange={setHeight}
        validation={{ min: 0.1 }}
        onValidationChange={(hasError: boolean) => onValidationChange('height', hasError)}
      />
    </>
  );
}
