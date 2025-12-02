import { UserInput, UserDropdown } from '@integralrsg/iuicomponents';
import '@integralrsg/iuicomponents/styles';
import { useMemo } from 'react';
import { type CubicleType } from '../types';
import { CUBICLE_TYPES, CUBICLE_CONFIGURATIONS } from '../constants';

type CubicleConfigProps = {
  cubicleType: CubicleType;
  setCubicleType: (value: CubicleType) => void;
  configOption: string;
  setConfigOption: (value: string) => void;
  length: string;
  setLength: (value: string) => void;
  width: string;
  setWidth: (value: string) => void;
  height: string;
  setHeight: (value: string) => void;
  onValidationChange: (field: string, hasError: boolean) => void;
};

export function CubicleConfig({
  cubicleType,
  setCubicleType,
  configOption,
  setConfigOption,
  length,
  setLength,
  width,
  setWidth,
  height,
  setHeight,
  onValidationChange
}: CubicleConfigProps) {
  const availableOptions = useMemo(() => {
    const config = CUBICLE_CONFIGURATIONS.find(c => c.cubicleType === cubicleType);
    return config?.options || [];
  }, [cubicleType]);

  const selectedConfig = useMemo(() => {
    return availableOptions.find(opt => opt.value === configOption);
  }, [availableOptions, configOption]);

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

      {availableOptions.length > 0 && (
        <>
          <UserDropdown label="Configuration" options={availableOptions} value={configOption} onChange={value => setConfigOption(value)} fontSize="medium" />
          {selectedConfig && (
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0', lineHeight: 1.5 }}>Walls: {selectedConfig.walls.join(', ')}</p>
          )}
        </>
      )}

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
