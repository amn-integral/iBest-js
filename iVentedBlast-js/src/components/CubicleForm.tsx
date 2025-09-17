import React from "react";
import cubicleFormCss from "./CubicleForm.module.css";
import {NumberInput} from "./NumberInput";
type Side = "floor" | "roof" | "front" | "back" | "left" | "right";
const OPENINGS: Side[] = ["roof", "back"];
import {type cubicleTypes, type fullyVentedTypes} from "src/hooks/useCubicleConfig";

type Opening = {
  face: Side | "";
  w: number;
  h: number;
  x: number;
  y: number;
};

interface CubicleFormProps {
  cubicleType: cubicleTypes ;
  setCubicleType: (cubicleType: cubicleTypes) => void;

  fullyVentedType?: string;
  setFullyVentedType: (fullyVentedType: fullyVentedTypes) => void;


  dims: { l: number; b: number; h: number };
  setDims: (dims: { l: number; b: number; h: number }) => void;
  
  faces: Record<Side, boolean>;
  updateFace: (side: Side, checked: boolean) => void;
  updateFaces: (sides: Record<Side, boolean>) => void;
  
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
  
  onPlot: (e?: React.FormEvent) => void;
  onAnalyze: (e?: React.FormEvent) => void;
}

const partially_confined_cubicle = {
  'c3wnw': 'Cubile three wall without a roof',
  'r3wnr': 'Reactangular three wall wthout a roof',
  'c3wr': 'Cubicle three wall with a roof',
  'r3wr': 'Rectangular three wall with a roof'
}

export const CubicleForm: React.FC<CubicleFormProps> = ({
  cubicleType,
  setCubicleType,
  fullyVentedType,
  setFullyVentedType,
  dims,
  setDims,
  updateFaces,
  opening,
  setOpening,
  charge,
  setCharge,
  onPlot,
  onAnalyze
}) => {

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();

    const nativeEvent = e.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter as HTMLButtonElement | null;
    
    switch (submitter?.name) {
      case "plot":
        console.log("Plot button clicked");
        onPlot();
        break;
      case "analyze":
        onAnalyze();
        console.log("Analyze button clicked");
        break;
      default:
        console.warn("Unknown submit action");
        break;
    }
  };


  function handleGeometry(e: React.ChangeEvent<HTMLSelectElement>): void {
    const value = e.target.value;
    console.log("Selected geometry:", value);
    switch (value) {
        case "partially_confined":
          updateFaces({floor: true, roof: true, front: true, back: true, left: true, right: true});
          setCubicleType(value);
          break;
        case "fully_vented":
          updateFaces({floor: true, roof: false, front: true, back: false, left: true, right: true}); 
          setCubicleType(value);
          break;
        default:
          console.warn("Unknown geometry selected:", value);
          break;
      }
  }

  return (
    <form className={cubicleFormCss.cf} onSubmit={handleSubmit}>
      <div className={cubicleFormCss.cfSection}>Cubicle Parameters</div>

      <label className={cubicleFormCss.cfRow}>
        <span className={cubicleFormCss.cfLabel}> Box Type</span>
        <select onChange={(e) => handleGeometry(e)} value={cubicleType}>
            <option value="partially_confined">Vented pressure from partially confined cubicle</option>
            <option value="fully_vented">Vented pressure from fully vented three walled cubicle</option>
        </select>
      </label>


      {cubicleType  === 'fully_vented' ? (

      <label className={cubicleFormCss.cfRow}>
        <span className={cubicleFormCss.cfLabel}> Select Geometry</span>
        <select  value={fullyVentedType} onChange={(e) => setFullyVentedType(e.target.value as fullyVentedTypes)}>

            {Object.entries(partially_confined_cubicle).map(([key, label]) => (
                <option value={key} key={key}>{label}</option>
            ))}
        </select>
      </label>


      ) : null}


      <NumberInput label="L (ft) Y" value={dims.l} onChange={(v: number) => setDims({ ...dims, l: v })} />
      <NumberInput label="B (ft) X" value={dims.b} onChange={(v: number) => setDims({ ...dims, b: v })} />
      <NumberInput label="H (ft) Z" value={dims.h} onChange={(v: number) => setDims({ ...dims, h: v })} />
      <NumberInput key="volume" label={<span>Volume (ft<sup>3</sup>)</span>} value={dims.l * dims.b * dims.h}  disabled={true} />


      {cubicleType === "partially_confined" ? (
        <>
          <div className={cubicleFormCss.cfSection}>Opening Dimension</div>
          <label className={cubicleFormCss.cfRow}>
          <span className={cubicleFormCss.cfLabel}>Face</span>
          <select
            value={opening.face}
            onChange={(e) => setOpening({ ...opening, face: e.target.value as Side | "" })}
          >
            {OPENINGS.filter((s) => s !== "floor").map((s) => (
              <option value={s} key={s}>
                {s}
              </option>
            ))}
          </select>
          </label>

          {[
            ["Width (w)", "w"],
            ["Height (h)", "h"],
          ].map(([label, key]) => (
            <NumberInput
              key={key}
              label={label}
              value={opening[key as keyof typeof opening] as number}
              onChange={(v: number) => setOpening({ ...opening, [key]: v })}
            />
          ))}

          <NumberInput key="area" label={<span>Area (ft<sup>2</sup>)</span>} value={opening.w * opening.h}  disabled={true} />
        </>
      ) : null}


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
        <button type="submit" name="plot">Plot</button>
        <button type="submit" name="analyze">Analyze</button>
      </div>
    </form>
  );
};


