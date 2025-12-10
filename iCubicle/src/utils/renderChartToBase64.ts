/**
 * Utility to render Chart.js charts to base64 PNG images for PDF generation.
 * Adapted from iGSDOF renderChartJS.ts pattern.
 */

import { Chart, ChartConfiguration, registerables } from 'chart.js';
import type { GRFPipelineCurve } from '../api/types';

// Register Chart.js components
Chart.register(...registerables);

export interface ChartRenderOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
}

/**
 * Render a GRF curve to base64 PNG image using Chart.js.
 * Creates an offscreen canvas, renders the chart, exports to base64, and cleans up.
 *
 * @param grfCurve - GRF curve data with multiple curves to plot
 * @param options - Rendering options (width, height, backgroundColor)
 * @returns Promise resolving to base64-encoded PNG image string
 */
export async function renderChartToBase64(grfCurve: GRFPipelineCurve, options: ChartRenderOptions = {}): Promise<string> {
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

  // Prepare datasets for Chart.js
  const datasets = grfCurve.curves.map((curve, index) => {
    // Only the LAST curve is the interpolated one (black dashed)
    const isLastCurve = index === grfCurve.curves.length - 1;
    const isInterpolated = isLastCurve && grfCurve.curves.length > 1;
    
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
          title: {
            display: true,
            text: grfCurve.xlabel,
            font: { size: 14, weight: 'bold' }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
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
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: grfCurve.filename,
          font: { size: 16, weight: 'bold' }
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
function getColorForIndex(index: number): string {
  const colors = [
    '#FF6384', // Pink/Red
    '#36A2EB', // Blue
    '#FFCE56', // Yellow
    '#4BC0C0', // Teal
    '#9966FF', // Purple
    '#FF9F40', // Orange
    '#C9CBCF', // Gray
    '#4CAF50', // Green
    '#F44336', // Red
    '#2196F3' // Blue
  ];
  return colors[index % colors.length];
}
