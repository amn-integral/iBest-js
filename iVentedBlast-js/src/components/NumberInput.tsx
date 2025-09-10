// components/NumberRow.tsx
import React from "react";
import numberInputCss from "./NumberInput.module.css";

type NumberInputProps = {
  label: React.ReactNode;
  value: number | "";                 // allow clearing the input
  onChange: (next: number) => void;   // you get a number (NaN if empty)
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  unit?: string;

  // integrate with your CSS module
  rowClass?: string;
  labelClass?: string;
  inputClass?: string;
  unitClass?: string;
};

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  step,
  min,
  max,
  placeholder,
  unit,
  rowClass,
  labelClass,
  inputClass,
  unitClass,
}) => {

  rowClass = rowClass || numberInputCss.cfRow;
  labelClass = labelClass || numberInputCss.cfLabel;
  inputClass = inputClass || numberInputCss.cfInput;
  unitClass = unitClass || numberInputCss.cfUnit;

  return (
    <label className={rowClass}>
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        type="number"
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        value={Number.isNaN(value as number) ? "" : value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? NaN : Number(v));
        }}
      />
      {unit ? <span className={unitClass}>{unit}</span> : null}
    </label>
  );
};
