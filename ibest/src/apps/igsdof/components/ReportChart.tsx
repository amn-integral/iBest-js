import React, { useMemo, useRef, useState, useEffect } from 'react';
import reportChartCss from './ReportChart.module.css';

export interface ReportChartProps {
  title: string;
  logoUrl?: string;
  data: ChartData[];
  xLabel: string;
  yLabel: string;
  xTicksCount?: number; // default: 10
  yTicksCount?: number; // default: 5
}

export interface ChartData {
  legend: string;
  xValues: number[];
  yValues: number[];
  color?: string;
  lineStyle?: 'solid' | 'dashed';
}

export const ReportChart: React.FC<ReportChartProps> = ({ title, data, logoUrl, xLabel, yLabel, xTicksCount = 10, yTicksCount = 5 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 300, height: 200 });

  /** -------------------------------
   * 🧱 CONFIG CONSTANTS
   * ------------------------------- */
  const PADDING = { LEFT: 45, RIGHT: 20, TOP: 10, BOTTOM: 45 };
  const FONT_SIZE_TICK = 9;
  const FONT_SIZE_LABEL = 11;
  const LEGEND_SIZE = 12;
  const TICK_LENGTH = 4;
  const LINE_COLOR = 'black';
  const DATA_COLOR = 'steelblue';

  /** -------------------------------
   * 📏 RESPONSIVENESS
   * ------------------------------- */
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Normalize data to always be an array
  const seriesArray = useMemo(() => (Array.isArray(data) ? data : [data]), [data]);

  // Combine all x and y values to find global min/max
  const allXValues = seriesArray.flatMap(s => s.xValues);
  const allYValues = seriesArray.flatMap(s => s.yValues);

  const minX = allXValues.length ? Math.min(...allXValues) : 0;
  const maxX = allXValues.length ? Math.max(...allXValues) : 1;
  const minY = allYValues.length ? Math.min(...allYValues) : 0;
  const maxY = allYValues.length ? Math.max(...allYValues) : 1;

  const chartWidth = size.width - PADDING.LEFT - PADDING.RIGHT;
  const chartHeight = size.height - PADDING.TOP - PADDING.BOTTOM;

  /** -------------------------------
   * 📈 SCALE & POINTS
   * ------------------------------- */
  const seriesPoints = useMemo(() => {
    return seriesArray.map(series => {
      const points = series.xValues
        .map((x: number, i: number) => {
          const scaledX = ((x - minX) / (maxX - minX)) * chartWidth + PADDING.LEFT;
          const scaledY = size.height - PADDING.BOTTOM - ((series.yValues[i] - minY) / (maxY - minY)) * chartHeight;
          return `${scaledX},${scaledY}`;
        })
        .join(' ');
      return {
        points,
        color: series.color || DATA_COLOR,
        legend: series.legend
      };
    });
  }, [seriesArray, minX, maxX, chartWidth, PADDING.LEFT, PADDING.BOTTOM, size.height, minY, maxY, chartHeight]);

  /** -------------------------------
   * 🧮 TICKS
   * ------------------------------- */
  const xTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i <= xTicksCount; i++) {
      const value = minX + ((maxX - minX) / xTicksCount) * i;
      const x = ((value - minX) / (maxX - minX)) * chartWidth + PADDING.LEFT;
      ticks.push({ x, value });
    }
    return ticks;
  }, [xTicksCount, minX, maxX, chartWidth, PADDING.LEFT]);

  const yTicks = useMemo(() => {
    const ticks: { y: number; value: number }[] = [];
    const step = (maxY - minY) / yTicksCount;
    for (let i = 0; i <= yTicksCount; i++) {
      const value = minY + step * i;
      const y = size.height - PADDING.BOTTOM - ((value - minY) / (maxY - minY)) * chartHeight;
      ticks.push({ y, value });
    }
    return ticks;
  }, [maxY, minY, yTicksCount, size.height, PADDING.BOTTOM, chartHeight]);

  if (!allXValues.length || !allYValues.length) {
    return <div className={reportChartCss.wrapper}>No data available</div>;
  }

  return (
    <div ref={containerRef} className={reportChartCss.wrapper}>
      <div className={reportChartCss.header}>{title}</div>
      <svg width={size.width} height={size.height}>
        {logoUrl && <image href={logoUrl} opacity={0.08} preserveAspectRatio="xMidYMid meet" x="0" y="0" width={size.width} height={size.height} />}

        {/* ⚙️ Axes */}
        <>
          <line x1={PADDING.LEFT} y1={size.height - PADDING.BOTTOM} x2={size.width - PADDING.RIGHT} y2={size.height - PADDING.BOTTOM} stroke={LINE_COLOR} />
          <line x1={PADDING.LEFT} y1={size.height - PADDING.BOTTOM} x2={PADDING.LEFT} y2={PADDING.TOP} stroke={LINE_COLOR} />
        </>

        {/* 🕐 X Ticks */}
        {xTicks.map((tick, i) => (
          <g key={`x-${i}`}>
            <line x1={tick.x} y1={size.height - PADDING.BOTTOM} x2={tick.x} y2={size.height - PADDING.BOTTOM + TICK_LENGTH} stroke={LINE_COLOR} />
            <text x={tick.x} y={size.height - PADDING.BOTTOM + FONT_SIZE_TICK + 6} textAnchor="middle" fontSize={FONT_SIZE_TICK} fill="#333">
              {tick.value.toFixed(1)}
            </text>
          </g>
        ))}

        {/* 🧭 Y Ticks */}
        {yTicks.map((tick, i) => (
          <g key={`y-${i}`}>
            <line x1={PADDING.LEFT - TICK_LENGTH} y1={tick.y} x2={PADDING.LEFT} y2={tick.y} stroke={LINE_COLOR} />
            <text x={PADDING.LEFT - TICK_LENGTH - 3} y={tick.y + 3} textAnchor="end" fontSize={FONT_SIZE_TICK} fill="#333">
              {tick.value.toFixed(1)}
            </text>
          </g>
        ))}

        {/* 📊 Data Lines */}
        {seriesPoints.map((series, idx) => {
          const current = seriesArray[idx];
          const lineStyle = current.lineStyle || 'solid';
          const dashArray = lineStyle === 'dashed' ? '4 3' : 'none';

          return <polyline key={idx} fill="none" stroke={series.color} strokeWidth="2" strokeDasharray={dashArray} points={series.points} />;
        })}

        {/* 🧩 Axis Labels */}
        <>
          <text x={size.width / 2} y={size.height - PADDING.BOTTOM / 2.5} textAnchor="middle" fontSize={FONT_SIZE_LABEL} fontWeight="bold" fill="#333">
            {xLabel}
          </text>
          <text
            transform={`rotate(-90, ${PADDING.LEFT / 4}, ${size.height / 2})`}
            x={PADDING.LEFT / 4}
            y={size.height / 2}
            textAnchor="middle"
            fontSize={FONT_SIZE_LABEL}
            fontWeight="bold"
            fill="#333"
          >
            {yLabel}
          </text>
        </>

        {/* 🏷 Legend */}
        {seriesPoints.map((series, idx) => (
          <text key={idx} x={size.width - PADDING.RIGHT} y={PADDING.TOP + 10 + idx * 14} textAnchor="end" fontSize={LEGEND_SIZE} fill={series.color}>
            {series.legend}
          </text>
        ))}
        <text x={size.width - PADDING.RIGHT} y={PADDING.TOP + data.length * 24} textAnchor="end" fontSize={LEGEND_SIZE} fill="#555">
          {`Max: ${maxY.toFixed(2)}, Min: ${minY.toFixed(2)}`}
        </text>
      </svg>
    </div>
  );
};
