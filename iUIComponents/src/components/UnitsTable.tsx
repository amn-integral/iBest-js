import React from "react";
import style from "./UnitsTable.module.css";

export interface UnitSystem {
  id: string;
  mass: string;
  length: string;
  time: string;
  force: string;
  stress: string;
  gravity: number;
  acceleration: string;
}

export const UNIT_SYSTEMS: UnitSystem[] = [
  { id: "kg-m-s", mass: "kg", length: "m", time: "s", force: "N", stress: "Pa", gravity: 9.806, acceleration: "m/s²" },
  { id: "kg-mm-msecs", mass: "kg", length: "mm", time: "msecs", force: "kN", stress: "GPa", gravity: 9.806E-3, acceleration: "mm/msecs²" },
  { id: "lbf-s^2/in-in-secs", mass: "lbf-s^2/in", length: "in", time: "secs", force: "psi", stress: "lbf-in", gravity: 386.0, acceleration: "in/secs²" },
  { id: "slug-ft-secs", mass: "slug", length: "ft", time: "secs", force: "lbf", stress: "psf", gravity: 32.17, acceleration: "ft/secs²" },
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
        Select a unit system for graphing:
        <select
          id="unitSelect"
          value={selectedUnitSystem}
          onChange={handleChange}
        >
          {UNIT_SYSTEMS.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.mass}, {unit.length}, {unit.time}, {unit.force}, {unit.stress}, Gravity Constant: {unit.gravity} {unit.acceleration}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
