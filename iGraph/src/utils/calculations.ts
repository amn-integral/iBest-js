import { ChartTick } from "../types";

export const parseStrictNumber = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const calcTickCount = (
  length: number,
  idealSpacing: number,
  min = 3,
  max = 8
): number => {
  const estimate = Math.max(min, Math.round(length / idealSpacing) + 1);
  return Math.max(min, Math.min(max, estimate));
};

export const generateTicks = (
  min: number,
  max: number,
  count: number,
  dimension: number,
  isVertical = false
): ChartTick[] => {
  const span = max - min || 1;
  const ticks: ChartTick[] = [];

  // Check if 0 is within the range and should be included
  const includesZero = min <= 0 && max >= 0;
  let zeroAdded = false;

  for (let i = 0; i < count; i++) {
    const value = min + (span * i) / (count - 1);
    const ratio = (value - min) / span;

    if (isVertical) {
      ticks.push({
        y: dimension - ratio * dimension,
        label: span === 0 ? min.toFixed(2) : value.toFixed(2),
      });
    } else {
      ticks.push({
        x: ratio * dimension,
        label: span === 0 ? min.toFixed(2) : value.toFixed(2),
      });
    }
  }

  // Add 0.0 tick if it's in range and not already very close to an existing tick
  if (includesZero) {
    const zeroRatio = (0 - min) / span;
    const zeroPos = isVertical
      ? dimension - zeroRatio * dimension
      : zeroRatio * dimension;

    const closeToExisting = ticks.some((tick) => {
      const tickPos = isVertical ? tick.y : tick.x;
      if (tickPos === undefined) return false;
      return Math.abs(tickPos - zeroPos) < dimension * 0.05; // Within 5% of dimension
    });

    if (!closeToExisting) {
      const newTick: ChartTick = { label: "0.00" };
      if (isVertical) {
        newTick.y = zeroPos;
        ticks.push(newTick);
        ticks.sort((a, b) => (b.y || 0) - (a.y || 0)); // Sort by y descending
      } else {
        newTick.x = zeroPos;
        ticks.push(newTick);
        ticks.sort((a, b) => (a.x || 0) - (b.x || 0)); // Sort by x ascending
      }
    } else {
      // Replace the closest tick with exact 0.00
      const closest = ticks.reduce((prev, curr) => {
        const currPos = isVertical ? curr.y : curr.x;
        const prevPos = isVertical ? prev.y : prev.x;
        if (currPos === undefined) return prev;
        const currDist = Math.abs(currPos - zeroPos);
        const prevDist =
          prevPos === undefined ? Infinity : Math.abs(prevPos - zeroPos);
        return currDist < prevDist ? curr : prev;
      });

      if (isVertical) {
        closest.y = zeroPos;
      } else {
        closest.x = zeroPos;
      }
      closest.label = "0.00";
    }
  }

  return ticks;
};

export const generateSvgPath = (
  xValues: number[],
  yValues: number[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  width: number,
  height: number
): string => {
  if (!xValues.length || xValues.length !== yValues.length) {
    return "";
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const commands: string[] = [];
  for (let index = 0; index < xValues.length; index++) {
    const ratioX = (xValues[index] - minX) / spanX;
    const ratioY = (yValues[index] - minY) / spanY;
    const x = ratioX * width;
    const y = height - ratioY * height;
    const cmd = index === 0 ? "M" : "L";
    commands.push(`${cmd} ${x} ${y}`);
  }

  return commands.join(" ");
};

export const formatLimitValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0.000";
  }
  return Math.abs(value) < 1e-3 ? value.toExponential(2) : value.toFixed(3);
};
