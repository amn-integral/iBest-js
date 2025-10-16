import React, { useMemo } from "react";
import { HistoryChartProps } from "../types";
import { useChartResize } from "../hooks";
import { generateTicks, generateSvgPath } from "../utils";
import styles from "./HistoryChart.module.css";

export const HistoryChart: React.FC<HistoryChartProps> = ({
  title,
  time,
  values,
  color,
  units,
  selectedIndex,
  className = "",
  logoUrl,
  width: propWidth,
  height: propHeight,
}) => {
  const { wrapperRef, containerWidth } = useChartResize(240);

  const width = propWidth ?? Math.max(320, containerWidth);
  const height =
    propHeight ?? Math.max(160, Math.min(220, Math.round(width * 0.32)));

  // Add padding for ticks and labels
  const padding = { left: 50, right: 10, top: 10, bottom: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const strokeWidth = 2.5;

  // Fixed tick counts for consistent spacing
  const xTickCount = 5;
  const yTickCount = 5;

  const chartData = useMemo(() => {
    if (!time.length || !values.length || time.length !== values.length) {
      return {
        path: "",
        minValue: 0,
        maxValue: 0,
        pointerX: 0,
        pointerY: chartHeight / 2,
        stepIndex: 0,
        xTicks: [],
        yTicks: [],
      };
    }

    const minTime = time[0];
    const maxTime = time[time.length - 1];
    const minValOriginal = Math.min(...values);
    const maxValOriginal = Math.max(...values);

    // Use exact data bounds without any padding
    const dataMinVal = minValOriginal;
    const dataMaxVal = maxValOriginal;
    let minVal = minValOriginal;
    let maxVal = maxValOriginal;

    // Handle case where all values are the same
    if (minVal === maxVal) {
      minVal = minVal - 0.01;
      maxVal = maxVal + 0.01;
    }

    const path = generateSvgPath(
      time,
      values,
      minTime,
      maxTime,
      minVal,
      maxVal,
      chartWidth,
      chartHeight
    );

    const clampedIndex = Math.min(Math.max(selectedIndex?? 1, 0), time.length - 1);
    const spanTime = maxTime - minTime || 1;
    const spanVal = maxVal - minVal || 1;

    const pointerRatioX = (time[clampedIndex] - minTime) / spanTime;
    const pointerRatioY = (values[clampedIndex] - minVal) / spanVal;
    // Pointer coordinates are now in the path's local coordinate system (before transform)
    const pointerX = pointerRatioX * chartWidth;
    const pointerY = chartHeight - pointerRatioY * chartHeight;

    const xTicks = generateTicks(
      minTime,
      maxTime,
      xTickCount,
      chartWidth,
      false
    );

    // Generate ticks using exact data bounds (no padding)
    const yTicks = generateTicks(
      dataMinVal,
      dataMaxVal,
      yTickCount,
      chartHeight,
      true
    );

    return {
      path,
      minValue: minVal,
      maxValue: maxVal,
      dataMinValue: dataMinVal, // Original data min without padding
      dataMaxValue: dataMaxVal, // Original data max without padding
      pointerX: Number.isFinite(pointerX) ? pointerX : 0,
      pointerY: Number.isFinite(pointerY) ? pointerY : chartHeight / 2,
      stepIndex: clampedIndex,
      xTicks,
      yTicks,
    };
  }, [
    chartHeight,
    chartWidth,
    time,
    values,
    selectedIndex,
    xTickCount,
    yTickCount,
    padding.left,
    padding.top,
  ]);

  if (!chartData.path) {
    return null;
  }

  return (
    <div className={`${styles.chartWrapper} ${className}`} ref={wrapperRef}>
      <div className={styles.chartHeader}>
        <span>
          {title} – Step {chartData.stepIndex + 1}
        </span>
        <span>
          min {chartData.dataMinValue?.toFixed(3) ?? "0.000"} | max{" "}
          {chartData.dataMaxValue?.toFixed(3) ?? "0.000"}
        </span>
      </div>
      <svg
        className={styles.chart }
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${title} history`}
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

        {/* Data path - clipped to chart area */}
        <defs>
          <clipPath id="history-chart-clip">
            <rect x="0" y="0" width={chartWidth} height={chartHeight} />
          </clipPath>
        </defs>
        <g
          clipPath="url(#history-chart-clip)"
          transform={`translate(${padding.left} ${padding.top})`}
        >
          <path
            d={chartData.path}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
          />
        </g>

        {/* Selection indicator line and point - transformed to match path */}
        <g transform={`translate(${padding.left} ${padding.top})`}>
          <line
            x1={chartData.pointerX}
            x2={chartData.pointerX}
            y1={0}
            y2={chartHeight}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="6 4"
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

        {/* Axis labels */}
        <text
          className="axis-label axis-label--x"
          x={padding.left + chartWidth / 2}
          y={height - 8}
          textAnchor="middle"
          fontSize="12"
          fill="#64748b"
        >
          Time
        </text>
        <text
          className="axis-label axis-label--y"
          transform={`translate(14 ${padding.top + chartHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize="12"
          fill="#64748b"
        >
          {title}
        </text>
      </svg>
    </div>
  );
};


