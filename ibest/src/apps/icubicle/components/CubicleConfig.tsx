import { UserInput, UserDropdown } from '@integralrsg/iuicomponents';
import '@integralrsg/iuicomponents/styles';
import { useMemo } from 'react';
import { type CubicleType } from '../types';
import { CUBICLE_TYPES, CUBICLE_WALLS_MAP } from '../constants';

type CubicleConfigProps = {
  cubicleType: CubicleType;
  setCubicleType: (value: CubicleType) => void;
  length: string;
  setLength: (value: string) => void;
  width: string;
  setWidth: (value: string) => void;
  height: string;
  setHeight: (value: string) => void;
  utilization: string;
  setUtilization: (value: string) => void;
  onValidationChange: (field: string, hasError: boolean) => void;
};

export function CubicleConfig({
  cubicleType,
  setCubicleType,
  length,
  setLength,
  width,
  setWidth,
  height,
  setHeight,
  utilization,
  setUtilization,
  onValidationChange
}: CubicleConfigProps) {
  const walls = useMemo(() => {
    return CUBICLE_WALLS_MAP[cubicleType] || [];
  }, [cubicleType]);

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

      {walls.length > 0 && <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0', lineHeight: 1.5 }}>Walls: {walls.join(', ')}</p>}

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
      <UserInput
        fontSize="medium"
        label="Utilization"
        type="number"
        unit=""
        value={utilization}
        onChange={setUtilization}
        validation={{ min: 0, max: 1 }}
        helpText="Free volume, Total room volume - Interior equipment"
        onValidationChange={(hasError: boolean) => onValidationChange('utilization', hasError)}
      />
    </>
  );
}
