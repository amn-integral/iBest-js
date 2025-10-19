import React from "react";
import style from "./UnitsTable.module.css";

export interface UnitSystem {
  id: string;
  mass: string;
  length: string;
  time: string;
  force: string;
  stress: string;
}

export const UNIT_SYSTEMS: UnitSystem[] = [
  { id: "si", mass: "kg", length: "m", time: "s", force: "N", stress: "Pa" },
  {
    id: "kg-mm-ms",
    mass: "kg",
    length: "mm",
    time: "ms",
    force: "kN",
    stress: "GPa",
  },
  {
    id: "cm-gs",
    mass: "g",
    length: "cm",
    time: "s",
    force: "dyne",
    stress: "dyne/cm²",
  },
  {
    id: "mm-ms-2",
    mass: "g",
    length: "mm",
    time: "ms",
    force: "1.0e-06 N",
    stress: "Pa",
  },
  {
    id: "ton",
    mass: "ton",
    length: "mm",
    time: "ms",
    force: "N",
    stress: "MPa",
  },
  {
    id: "imperial",
    mass: "lbf·s²/in",
    length: "in",
    time: "s",
    force: "lbf",
    stress: "psi",
  },
  {
    id: "slug",
    mass: "slug",
    length: "ft",
    time: "s",
    force: "lbf",
    stress: "psf",
  },
  {
    id: "g-cm-ms",
    mass: "g",
    length: "cm",
    time: "ms",
    force: "1.0e+01 N",
    stress: "1.0e+05 Pa",
  },
];

interface UnitsTableProps {
  selectedUnitSystem: string;
  onUnitSystemChange: (unitSystemId: string) => void;
}

export const UnitsTable: React.FC<UnitsTableProps> = ({
  selectedUnitSystem,
  onUnitSystemChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUnitSystemChange(e.target.value);
  };

  return (
    <div className={style.unitTableContainer}>
      <h2>Unit System Selector (Mass, Length, Time, Force, Stress)</h2>
      <p>The solver is unitless. The units are used for graphs.</p>
      <label htmlFor="unitSelect">
        Select a Unit System:
        <select
          id="unitSelect"
          value={selectedUnitSystem}
          onChange={handleChange}
        >
          <option value="">-- Select --</option>
          {UNIT_SYSTEMS.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.mass}, {unit.length}, {unit.time}, {unit.force},{" "}
              {unit.stress}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
