import { UserInput, UserDropdown } from '@integralrsg/iuicomponents';
import { type TargetType, type TargetFaceType } from '../types';
import { TargetType as TargetTypeConst, TARGET_TYPES, TARGET_FACES } from '../constants';

type TargetConfigProps = {
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

export function TargetConfig({
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
  return (
    <>
      <hr />

      <UserDropdown
        label="Target Face"
        options={TARGET_FACES}
        value={targetFace}
        onChange={value => setTargetFace(value as TargetFaceType)}
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
