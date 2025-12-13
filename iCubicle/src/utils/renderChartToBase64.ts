/**
 * Utility to render Chart.js charts to base64 PNG images for PDF generation.
 * Adapted from iGSDOF renderChartJS.ts pattern.
 */

import { Chart, ChartConfiguration, registerables, Plugin, type ChartDataset, type ScatterDataPoint } from 'chart.js';
import type { GRFPipelineCurve } from '../api/types';

export interface ChartRenderOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
}

const chartAreaBorder: Plugin<'line'> = {
  id: 'chartAreaBorder',
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const { left, top, right, bottom } = chartArea;

    ctx.save();
    ctx.strokeStyle = '#000000'; // border color
    ctx.lineWidth = 1; // thickness
    ctx.strokeRect(left, top, right - left, bottom - top);
    ctx.restore();
  }
};

Chart.register(...registerables, chartAreaBorder);

/**
 * Render a GRF curve to base64 PNG image using Chart.js.
 * Creates an offscreen canvas, renders the chart, exports to base64, and cleans up.
 *
 * @param grfCurve - GRF curve data with multiple curves to plot
 * @param options - Rendering options (width, height, backgroundColor)
 * @returns Promise resolving to base64-encoded PNG image string
 */
export async function renderChartToBase64(
  grfCurve: GRFPipelineCurve,
  options: ChartRenderOptions = {},
  interpolationPoint?: [number, number]
): Promise<string> {
  const { width = 800, height = 600, backgroundColor = '#ffffff' } = options;

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  let xMax = 0;
  let xMin = 0;
  // Prepare datasets for Chart.js
  const datasets: ChartDataset<'line', ScatterDataPoint[]>[] = grfCurve.curves.map((curve, index) => {
    // Only the LAST curve is the interpolated one (black dashed)
    const isLastCurve = index === grfCurve.curves.length - 1;
    const isInterpolated = isLastCurve && grfCurve.curves.length > 1;
    if (isLastCurve) {
      xMax = Math.round(Math.max(...curve.xdata));
      xMin = Math.round(Math.min(...curve.xdata));
    }
    return {
      label: curve.curve_name,
      data: curve.xdata.map((x, i) => ({ x, y: curve.ydata[i] })),
      borderColor: isInterpolated ? '#000000' : getColorForIndex(index),
      backgroundColor: isInterpolated ? '#000000' : getColorForIndex(index),
      borderWidth: 2,
      borderDash: isInterpolated ? [5, 5] : [], // Dotted line for interpolated curve only
      pointRadius: 0, // No points for cleaner log-log plots
      fill: false,
      tension: 0 // Straight lines between points
    };
  });

  if (interpolationPoint) {
    const [px, py] = interpolationPoint;
    console.log('Adding interpolation point at:', px, py);
    datasets.push({
      label: 'Interpolated Result',
      data: [{ x: px, y: py }],
      borderColor: '#2e01f8ff',
      backgroundColor: '#0617f8ff',
      pointRadius: 3,
      pointStyle: 'circle', // Chart.js built-in "X" marker
      borderWidth: 0,
      pointBorderWidth: 1, // Make the cross thicker
      showLine: false // only show the point, no connecting line
    });
  }

  // Chart.js configuration for log-log plot
  const config: ChartConfiguration = {
    type: 'line',
    data: { datasets },
    options: {
      responsive: false,
      animation: false, // Disable animations for faster rendering
      scales: {
        x: {
          type: 'logarithmic',
          bounds: 'ticks',
          min: xMin,
          max: xMax,
          title: {
            display: true,
            text: grfCurve.xlabel,
            font: { size: 14, weight: 'bold' }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.2)'
          },
          border: {
            dash: [4, 4]
          }
        },
        y: {
          type: 'logarithmic',
          title: {
            display: true,
            text: grfCurve.ylabel,
            font: { size: 14, weight: 'bold' }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.2)'
          },
          border: {
            dash: [4, 4]
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: grfCurve.filename.replace(/[{}]/g, ''),
          font: { size: 12, weight: 'bold' },
          color: 'rgba(0, 0, 0, 1)'
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { size: 11 },
            boxWidth: 20,
            boxHeight: 1
          }
        }
      }
    }
  };

  // Create chart instance
  const chart = new Chart(ctx, config);

  // Wait for chart to render (Chart.js renders synchronously but this ensures completion)
  await new Promise(resolve => setTimeout(resolve, 100));

  // Export to base64 PNG
  const base64Image = canvas.toDataURL('image/png');

  // Clean up: destroy chart and remove canvas
  chart.destroy();
  canvas.remove();

  // Return base64 string without the data:image/png;base64, prefix
  return base64Image.split(',')[1];
}

/**
 * Render multiple GRF curves in parallel and return array of base64 images.
 *
 * @param grfCurves - Array of GRF curves to render
 * @param options - Rendering options
 * @returns Promise resolving to array of base64-encoded PNG strings
 */
export async function renderMultipleCharts(grfCurves: GRFPipelineCurve[], options: ChartRenderOptions = {}): Promise<string[]> {
  const renderPromises = grfCurves.map(curve => renderChartToBase64(curve, options));
  return Promise.all(renderPromises);
}

/**
 * Get a distinct color for chart line by index.
 * Uses a predefined color palette for consistency.
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}
function getColorForIndex(index: number): string {
  const hue = (index * 137.508) % 360; // golden-angle-ish step
  const saturation = 65; // 0–100
  const lightness = 55; // 0–100

  return hslToHex(hue, saturation, lightness);
}
