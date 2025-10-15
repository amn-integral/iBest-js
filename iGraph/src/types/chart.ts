export interface HistoryChartProps {
  title: string;
  time: number[];
  values: number[];
  color: string;
  units: string;
  selectedIndex?: number;
  className?: string;
  logoUrl?: string;
  width?: number; // Add this
  height?: number; // Add this
}

export interface BackboneCurves {
  initial: { x: number[]; y: number[] };
  final: { x: number[]; y: number[] };
}

export interface BackboneChartProps {
  curves: BackboneCurves;
  displacementHistory: number[];
  restoringForceHistory: number[];
  selectedIndex: number;
  className?: string;
  logoUrl?: string;
}

export interface ChartTick {
  x?: number;
  y?: number;
  label: string;
}

export interface ChartDimensions {
  width: number;
  height: number;
}

export interface ChartBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

