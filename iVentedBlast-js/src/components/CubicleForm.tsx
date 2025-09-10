import React from "react";
import cubicleFormCss from "./CubicleForm.module.css";
import {NumberInput} from "./NumberInput";
type Side = "floor" | "roof" | "front" | "back" | "left" | "right";
const ALL_SIDES: Side[] = ["floor", "roof", "front", "back", "left", "right"];

type Opening = {
  face: Side | "";
  w: number;
  h: number;
  x: number;
  y: number;
};

interface CubicleFormProps {
  dims: { l: number; b: number; h: number };
  setDims: (dims: { l: number; b: number; h: number }) => void;
  faces: Record<Side, boolean>;
  updateFace: (side: Side, checked: boolean) => void;
  opening: {
    face: Side | "";
    w: number;
    h: number;
    x: number;
    y: number;
  };
  setOpening: (opening: Opening) => void;
  resetOpening: () => void;
  charge: {W: number, R: number, angle: number, Pmax: number, Imax: number};
  setCharge: (props : {W: number, R: number, angle: number, Pmax: number, Imax: number}) => void;
  onSubmit: (e?: React.FormEvent) => void;
}

export const CubicleForm: React.FC<CubicleFormProps> = ({
  dims,
  setDims,
  faces,
  updateFace,
  opening,
  setOpening,
  resetOpening,
  charge,
  setCharge,
  onSubmit,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e?.preventDefault();
    onSubmit();
  };

  return (
    <form className={cubicleFormCss.cf} onSubmit={handleSubmit}>
      <div className={cubicleFormCss.cfSection}>Cubicle Parameters</div>

      <label className={cubicleFormCss.cfRow}>
        <span className={cubicleFormCss.cfLabel}> Box Type</span>
        <select>
            <option >Vented pressure from partially confined cubicle</option>
            <option >Vented pressure from fully vented three walled cubicle</option>
        </select>
      </label>

      <NumberInput label="L (ft) Y" value={dims.l} onChange={(v: number) => setDims({ ...dims, l: v })} />
      <NumberInput label="B (ft) X" value={dims.b} onChange={(v: number) => setDims({ ...dims, b: v })} />
      <NumberInput label="H (ft) Z" value={dims.h} onChange={(v: number) => setDims({ ...dims, h: v })} />

      <div className={cubicleFormCss.cfSection}>Faces</div>
      {ALL_SIDES.map((s) => (
        <label key={s} className={cubicleFormCss.cfCheck}>
          <input
            type="checkbox"
            checked={s === "floor" ? true : !!faces[s]}
            onChange={(e) => updateFace(s, e.target.checked)}
            disabled={s === "floor"}
          />
          <span className={cubicleFormCss.cap}>{s}</span>
        </label>
      ))}

      <div className={cubicleFormCss.cfSection}>Opening Dimension</div>

      <label className={cubicleFormCss.cfRow}>
        <span className={cubicleFormCss.cfLabel}>Face</span>
        <select
          value={opening.face}
          onChange={(e) =>
            setOpening({ ...opening, face: e.target.value as Side | "" })
          }
        >
          <option value="">— none —</option>
          {ALL_SIDES.filter((s) => s !== "floor").map((s) => (
            <option value={s} key={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {[
        ["Width (w)", "w"],
        ["Height (h)", "h"],
        // ["X (optional)", "x"],
        // ["Y (optional)", "y"],
      ].map(([label, key]) => (
        <NumberInput
            key={key}
            label={label}
            value={opening[key as keyof typeof opening] as number}
            onChange={(v: number) => setOpening({ ...opening, [key]: v })}
          />
      ))}

      <div className={cubicleFormCss.cfSection}>Blast Load Definition</div>

      <NumberInput
        label="Weight (lbs)"
        value={charge.W}
        onChange={(v: number) => setCharge({ ...charge, W: v })}
      />

      <NumberInput
        label="R (ft)"
        value={charge.R}
        onChange={(v: number) => setCharge({ ...charge, R: v })}
      />

      <NumberInput
        label="Angle (deg)"
        value={charge.angle}
        onChange={(v: number) => setCharge({ ...charge, angle: v })}
      />

      <NumberInput
        label="Pmax (psi)"
        value={charge.Pmax}
        onChange={(v: number) => setCharge({ ...charge, Pmax: v })}
      />

      <NumberInput
        label="Imax (psi-msec)"
        value={charge.Imax}
        onChange={(v: number) => setCharge({ ...charge, Imax: v })}
      />

      <div className={cubicleFormCss.cfActions}>
        <button type="submit">Plot</button>
        <button type="button" onClick={resetOpening}>
          Clear Opening
        </button>
      </div>
    </form>
  );
};


