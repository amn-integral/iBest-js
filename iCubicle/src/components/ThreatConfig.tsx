import { UserInput } from '@integralrsg/iuicomponents';

type ThreatConfigProps = {
  threatXLocation: string;
  setThreatXLocation: (value: string) => void;
  threatYLocation: string;
  setThreatYLocation: (value: string) => void;
  threatZLocation: string;
  setThreatZLocation: (value: string) => void;
  threatWeight: string;
  setThreatWeight: (value: string) => void;
  maxLength: number;
  maxWidth: number;
  maxHeight: number;
  onValidationChange: (field: string, hasError: boolean) => void;
};

export function ThreatConfig({
  threatXLocation,
  setThreatXLocation,
  threatYLocation,
  setThreatYLocation,
  threatZLocation,
  setThreatZLocation,
  threatWeight,
  setThreatWeight,
  maxLength,
  maxWidth,
  maxHeight,
  onValidationChange
}: ThreatConfigProps) {
  return (
    <>
      <hr />

      <UserInput
        fontSize="medium"
        label="X Location"
        type="number"
        unit="ft"
        value={threatXLocation}
        onChange={setThreatXLocation}
        validation={{ min: 0.0, max: maxLength }}
        onValidationChange={(err: boolean) => onValidationChange('threatX', err)}
      />
      <UserInput
        fontSize="medium"
        label="Y Location"
        type="number"
        unit="ft"
        value={threatYLocation}
        onChange={setThreatYLocation}
        validation={{ min: 0.0, max: maxWidth }}
        onValidationChange={(err: boolean) => onValidationChange('threatY', err)}
      />
      <UserInput
        fontSize="medium"
        label="Z Location"
        type="number"
        unit="ft"
        value={threatZLocation}
        onChange={setThreatZLocation}
        validation={{ min: 0.0, max: maxHeight }}
        onValidationChange={(err: boolean) => onValidationChange('threatZ', err)}
      />
      <UserInput
        fontSize="medium"
        label="Weight"
        type="number"
        unit="lbs"
        value={threatWeight}
        onChange={setThreatWeight}
        validation={{ min: 0.1 }}
        onValidationChange={(err: boolean) => onValidationChange('threatWeight', err)}
      />
    </>
  );
}
