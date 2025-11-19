import { UserInput, UserDropdown } from '@integralrsg/iuicomponents';

type OpeningFace = 'front' | 'back' | 'left' | 'right' | 'floor' | 'roof';

type OpeningConfigProps = {
  openingFace: OpeningFace;
  setOpeningFace: (value: OpeningFace) => void;
  openingWidth: string;
  setOpeningWidth: (value: string) => void;
  openingHeight: string;
  setOpeningHeight: (value: string) => void;
  onValidationChange: (field: string, hasError: boolean) => void;
};

const openingFaceOptions = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'floor', label: 'Floor' },
  { value: 'roof', label: 'Roof' }
];

export function OpeningConfig({
  openingFace,
  setOpeningFace,
  openingWidth,
  setOpeningWidth,
  openingHeight,
  setOpeningHeight,
  onValidationChange
}: OpeningConfigProps) {
  return (
    <>
      <hr />

      <UserDropdown
        label="Opening Location"
        options={openingFaceOptions}
        value={openingFace}
        onChange={value => setOpeningFace(value as OpeningFace)}
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
