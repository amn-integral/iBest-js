import { useState } from "react";

// Local Side type
type Side = "floor" | "roof" | "front" | "back" | "left" | "right";

export const useCubicleConfig = () => {
  const [dims, setDims] = useState({ l: 5, b: 10, h: 15 });
  const [charge, setCharge] = useState({W: 0, R: 0, angle: 0, Pmax: 0, Imax: 0});
  const [faces, setFaces] = useState<Record<Side, boolean>>({
    floor: true, // always on
    roof: true,
    front: true,
    back: true,
    left: true,
    right: true,
  });

  const [opening, setOpening] = useState<{
    face: Side | "";
    w: number;
    h: number;
    x: number;
    y: number;
  }>({
    face: "roof",
    w: 5,
    h: 5,
    x: 0,
    y: 0,
  });

  const updateFace = (side: Side, checked: boolean) => {
    if (side === "floor") return; // floor is always on
    setFaces((f) => ({ ...f, [side]: checked }));
  };

  const resetOpening = () => {
    setOpening({ face: "roof", w: 5, h: 5, x: 0, y: 0 });
  };

  return {
    dims,
    setDims,
    faces,
    updateFace,
    opening,
    setOpening,
    resetOpening,
    charge,
    setCharge,
  };
};
