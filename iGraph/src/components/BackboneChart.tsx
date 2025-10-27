import React, { useMemo } from "react";
import { BackboneChartProps } from "../types";
import { useChartResize } from "../hooks";
import { generateTicks, generateSvgPath } from "../utils";
import styles from "./BackboneChart.module.css";

// Optimized min/max function to avoid stack overflow with large arrays
const findMinMax = (arr: number[]) => {
  if (arr.length === 0) return { min: 0, max: 0 };
  if (arr.length === 1) return { min: arr[0], max: arr[0] };

  let min = arr[0];
  let max = arr[0];

  // Process pairs for efficiency (33% fewer comparisons)
  const len = arr.length;
  let i = 1;

  if (len % 2 === 0) {
    // Even length - compare pairs
    for (; i < len; i += 2) {
      const a = arr[i];
      const b = arr[i + 1];

      if (a > b) {
        if (a > max) max = a;
        if (b < min) min = b;
      } else {
        if (b > max) max = b;
        if (a < min) min = a;
      }
    }
  } else {
    // Odd length - handle last element separately
    for (; i < len - 1; i += 2) {
      const a = arr[i];
      const b = arr[i + 1];

      if (a > b) {
        if (a > max) max = a;
        if (b < min) min = b;
      } else {
        if (b > max) max = b;
        if (a < min) min = a;
      }
    }

    // Handle the last element
    const last = arr[len - 1];
    if (last > max) max = last;
    if (last < min) min = last;
  }

  return { min, max };
};

export const BackboneChart: React.FC<BackboneChartProps> = ({
  curves,
  displacementHistory,
  restoringForceHistory,
  selectedIndex,
  className = "",
  logoUrl,
  xUnits = "",
  yUnits = "",
}) => {
  const { wrapperRef, containerWidth } = useChartResize(260);

  const width = Math.max(320, containerWidth);
  const height = Math.max(170, Math.min(240, Math.round(width * 0.32)));

  // Add padding for ticks and labels
  const padding = { left: 60, right: 10, top: 10, bottom: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const strokeWidths = { initial: 2, final: 2.5, hysteresis: 2.5 };

  // Fixed tick counts for consistent spacing
  const xTickCount = 5;
  const yTickCount = 5;

  const chartData = useMemo(() => {
    if (!curves.initial.x.length || !curves.initial.y.length) {
      return {
        initialPath: "",
        finalPath: "",
        hysteresisPath: "",
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        pointerX: chartWidth / 2,
        pointerY: chartHeight / 2,
        stepIndex: 0,
        xTicks: [],
        yTicks: [],
      };
    }

    // Separate backbone curve data from history data
    const backboneX = [...curves.initial.x, ...curves.final.x];
    const backboneY = [...curves.initial.y, ...curves.final.y];

    const allX = [
      ...curves.initial.x,
      ...curves.final.x,
      ...displacementHistory,
    ];
    const allY = [
      ...curves.initial.y,
      ...curves.final.y,
      ...restoringForceHistory,
    ];

    // Store backbone-only min/max for display labels using optimized function
    const { min: backboneMinY, max: backboneMaxY } =
      backboneY.length > 0 ? findMinMax(backboneY) : { min: 0, max: 0 };

    const { min: minXOriginal, max: maxXOriginal } = findMinMax(allX);
    const { min: minYOriginal, max: maxYOriginal } = findMinMax(allY);

    // Use exact backbone data bounds without any padding or axis extensions
    const { min: minXValue, max: maxXValue } =
      backboneX.length > 0 ? findMinMax(backboneX) : { min: 0, max: 0 };
    const minYValue = backboneMinY;
    const maxYValue = backboneMaxY;

    const initialPath = generateSvgPath(
      curves.initial.x,
      curves.initial.y,
      minXValue,
      maxXValue,
      minYValue,
      maxYValue,
      chartWidth,
      chartHeight
    );

    const finalPath = generateSvgPath(
      curves.final.x,
      curves.final.y,
      minXValue,
      maxXValue,
      minYValue,
      maxYValue,
      chartWidth,
      chartHeight
    );

    const hasHistory =
      displacementHistory.length > 0 &&
      displacementHistory.length === restoringForceHistory.length;

    const clampedIndex = hasHistory
      ? Math.min(Math.max(selectedIndex, 0), displacementHistory.length - 1)
      : 0;

    const hysteresisPath = hasHistory
      ? generateSvgPath(
          displacementHistory.slice(0, clampedIndex + 1),
          restoringForceHistory.slice(0, clampedIndex + 1),
          minXValue,
          maxXValue,
          minYValue,
          maxYValue,
          chartWidth,
          chartHeight
        )
      : "";

    const spanX = maxXValue - minXValue || 1;
    const spanY = maxYValue - minYValue || 1;

    let pointerCoordX: number;
    let pointerCoordY: number;

    // Pointer coordinates in path's local coordinate system (before transform)
    if (hasHistory) {
      pointerCoordX =
        ((displacementHistory[clampedIndex] - minXValue) / spanX) * chartWidth;
      pointerCoordY =
        chartHeight -
        ((restoringForceHistory[clampedIndex] - minYValue) / spanY) *
          chartHeight;
    } else if (curves.final.x.length && curves.final.y.length) {
      const lastIndex = curves.final.x.length - 1;
      pointerCoordX =
        ((curves.final.x[lastIndex] - minXValue) / spanX) * chartWidth;
      pointerCoordY =
        chartHeight -
        ((curves.final.y[lastIndex] - minYValue) / spanY) * chartHeight;
    } else {
      pointerCoordX = chartWidth / 2;
      pointerCoordY = chartHeight / 2;
    }

    // Generate ticks using exact backbone data bounds (no padding)
    const xTicks = generateTicks(
      minXValue,
      maxXValue,
      xTickCount,
      chartWidth,
      false
    );

    const yTicks = generateTicks(
      backboneMinY,
      backboneMaxY,
      yTickCount,
      chartHeight,
      true
    );

    return {
      initialPath,
      finalPath,
      hysteresisPath,
      minX: minXValue,
      maxX: maxXValue,
      minY: minYValue,
      maxY: maxYValue,
      backboneMinY, // Backbone curve min for display
      backboneMaxY, // Backbone curve max for display
      pointerX: Number.isFinite(pointerCoordX) ? pointerCoordX : chartWidth / 2,
      pointerY: Number.isFinite(pointerCoordY)
        ? pointerCoordY
        : chartHeight / 2,
      stepIndex: hasHistory ? clampedIndex : 0,
      xTicks,
      yTicks,
    };
  }, [
    curves,
    displacementHistory,
    chartHeight,
    chartWidth,
    restoringForceHistory,
    selectedIndex,
    xTickCount,
    yTickCount,
    padding.left,
    padding.top,
  ]);

  if (
    !chartData.initialPath &&
    !chartData.finalPath &&
    !chartData.hysteresisPath
  ) {
    return null;
  }

  return (
    <div className={`${styles.chartWrapper} ${className}`} ref={wrapperRef}>
      <div className={styles.chartHeader}>
        <span>Hysteresis with Backbone – Step {chartData.stepIndex + 1}</span>
      </div>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Backbone curve comparison"
      >
        <rect width={width} height={height} fill="#f8fafc" rx={10} />

        {/* Chart area background */}
        {logoUrl && (
          <image
            href={logoUrl}
            x={
              padding.left +
              (chartWidth - Math.min(chartWidth, chartHeight) * 1.5) / 2
            }
            y={
              padding.top +
              (chartHeight - Math.min(chartWidth, chartHeight) * 1.5) / 2
            }
            width={Math.min(chartWidth, chartHeight) * 1.5}
            height={Math.min(chartWidth, chartHeight) * 1.5}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.3}
          />
        )}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="#cbd5e1"
          strokeWidth={1.5}
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="#cbd5e1"
          strokeWidth={1.5}
        />

        {/* X-axis ticks */}
        {chartData.xTicks.map((tick, i) =>
          tick.x !== undefined ? (
            <g
              key={i}
              transform={`translate(${padding.left + tick.x} ${padding.top + chartHeight})`}
            >
              <line y1={0} y2={6} stroke="#94a3b8" strokeWidth={1} />
              <text y={18} fill="#1f2937" fontSize="11" textAnchor="middle">
                {tick.label}
              </text>
            </g>
          ) : null
        )}

        {/* Y-axis ticks */}
        {chartData.yTicks.map((tick, i) =>
          tick.y !== undefined ? (
            <g
              key={i}
              transform={`translate(${padding.left} ${padding.top + tick.y})`}
            >
              <line x1={0} x2={-6} stroke="#94a3b8" strokeWidth={1} />
              <text x={-10} y={4} fill="#1f2937" fontSize="11" textAnchor="end">
                {tick.label}
              </text>
            </g>
          ) : null
        )}

        {/* Data paths - clipped to chart area */}
        <g transform={`translate(${padding.left} ${padding.top})`}>
          {chartData.initialPath ? (
            <path
              d={chartData.initialPath}
              fill="none"
              stroke="#cbd5f5"
              strokeWidth={strokeWidths.initial}
              strokeDasharray="6 6"
            />
          ) : null}

          {chartData.finalPath ? (
            <path
              d={chartData.finalPath}
              fill="none"
              stroke="#2563eb"
              strokeWidth={strokeWidths.final}
            />
          ) : null}

          {chartData.hysteresisPath ? (
            <path
              d={chartData.hysteresisPath}
              fill="none"
              stroke="#0f172a"
              strokeWidth={strokeWidths.hysteresis}
            />
          ) : null}
        </g>

        {/* Crosshairs and pointer - transformed to match path */}
        <g transform={`translate(${padding.left} ${padding.top})`}>
          <line
            x1={chartData.pointerX}
            x2={chartData.pointerX}
            y1={0}
            y2={chartHeight}
            stroke="#0f172a"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            opacity={0.6}
          />

          <line
            x1={0}
            x2={chartWidth}
            y1={chartData.pointerY}
            y2={chartData.pointerY}
            stroke="#0f172a"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />

          <circle
            cx={chartData.pointerX}
            cy={chartData.pointerY}
            r={5}
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        </g>

        {/* Legend - 2 columns layout */}
        <g transform={`translate(${padding.left}, ${height - 50})`}>
          {/* Column 1 */}
          <rect width="16" height="2" y="6" fill="#a1a1aa" />
          <text x="24" y="9" fontSize="10" fill="#475569">
            Original backbone
          </text>
          <rect width="16" height="2" y="22" fill="#18181b" />
          <text x="24" y="25" fontSize="10" fill="#475569">
            Current backbone
          </text>

          {/* Column 2 */}
          <g transform="translate(150, 0)">
            <rect width="16" height="2" y="6" fill="#3b82f6" />
            <text x="24" y="9" fontSize="10" fill="#475569">
              Hysteresis
            </text>
            <circle cx="8" cy="22" r="3" fill="#3b82f6" />
            <text x="24" y="25" fontSize="10" fill="#475569">
              Current point
            </text>
          </g>
        </g>

        {/* Axis labels */}
        <text
          className={`${styles.axisLabel} ${styles.axisLabelX}`}
          x={padding.left + chartWidth / 2}
          y={height - 12}
          textAnchor="middle"
          fontSize="12"
          fill="#64748b"
        >
          Displacement ({xUnits})
        </text>
        <text
          className={`${styles.axisLabel} ${styles.axisLabelY}`}
          transform={`translate(14 ${padding.top + chartHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize="12"
          fill="#64748b"
        >
          Restoring force ({yUnits})
        </text>
      </svg>
    </div>
  );
};
