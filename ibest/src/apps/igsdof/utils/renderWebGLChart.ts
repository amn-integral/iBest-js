import { WebglPlot, WebglLine, ColorRGBA } from 'webgl-plot';

export interface WebGLChartOptions {
  color?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  title?: string;
  xUnits?: string;
  yUnits?: string;
}

export interface RenderWebGLChartArgs {
  imageType?: 'png' | 'jpeg';
  xValues: number[];
  yValues: number[];
  yMinMax: { min: number; max: number };
  xMinMax?: { min: number; max: number };
  options?: WebGLChartOptions;
}

/**
 * Render a high-density line chart using WebGLPlot and return a base64 image.
 * Useful for very large datasets where Canvas2D rendering becomes slow.
 * Returns a Promise to avoid blocking the UI thread.
 */
export default function renderWebGLChart({ imageType = 'png', xValues, yValues, yMinMax, xMinMax, options }: RenderWebGLChartArgs): Promise<string | null> {
  return new Promise<string | null>(resolve => {
    // Use setTimeout to yield control back to the event loop
    // This prevents the UI from freezing during heavy canvas operations
    setTimeout((): void => {
      if (!xValues?.length || !yValues?.length) {
        resolve(null);
        return;
      }

      const { color = '#3b82f6', width = 600, height = 300, backgroundColor = '#ffffff', title = 'Chart', xUnits = 'Time', yUnits = 'Value' } = options || {};

      const scale = window.devicePixelRatio || 1;

      const padding = {
        top: 48,
        right: 24,
        bottom: 44,
        left: 64
      };
      const chartWidth = Math.max(10, width - padding.left - padding.right);
      const chartHeight = Math.max(10, height - padding.top - padding.bottom);

      const plotCanvas = document.createElement('canvas');
      plotCanvas.width = chartWidth * scale;
      plotCanvas.height = chartHeight * scale;
      plotCanvas.style.width = `${chartWidth}px`;
      plotCanvas.style.height = `${chartHeight}px`;

      const webglPlot = new WebglPlot(plotCanvas);
      const rgba = hexToRgba(color);
      const line = new WebglLine(new ColorRGBA(rgba.r, rgba.g, rgba.b, rgba.a), yValues.length);

      const spanXValues = xMinMax !== undefined ? xMinMax.max - xMinMax.min : xValues[xValues.length - 1] - xValues[0];
      const spanYValues = yMinMax.max - yMinMax.min || 1;
      const xBase = xMinMax?.min ?? xValues[0];

      for (let i = 0; i < yValues.length; i++) {
        const xNorm = ((xValues[i] - xBase) / spanXValues) * 2 - 1;
        const yNorm = ((yValues[i] - yMinMax.min) / spanYValues) * 2 - 1;
        line.setX(i, clampBetween(xNorm, -1, 1));
        line.setY(i, clampBetween(yNorm, -1, 1));
      }

      webglPlot.addLine(line);
      webglPlot.update();

      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        disposeCanvas(plotCanvas);
        resolve(null);
        return;
      }

      ctx.scale(scale, scale);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      drawAxes(ctx, {
        width,
        height,
        chartWidth,
        chartHeight,
        padding,
        minTime: xValues[0],
        maxTime: xValues[xValues.length - 1],
        minValue: yMinMax.min,
        maxValue: yMinMax.max,
        xUnits,
        yUnits
      });

      ctx.drawImage(plotCanvas, padding.left, padding.top, chartWidth, chartHeight);

      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'center';
      ctx.font = 'bold 17px Arial';
      ctx.fillText(title, width / 2, padding.top - 28);
      ctx.font = '12px Arial';
      ctx.fillText(`${yUnits} (min: ${yMinMax.min.toFixed(2)}, max: ${yMinMax.max.toFixed(2)})`, width / 2, padding.top - 10);

      const dataUrl = canvas.toDataURL(`image/${imageType}`);

      disposeCanvas(plotCanvas);
      disposeCanvas(canvas);

      resolve(dataUrl);
    }, 0);
  });
}

function clampBetween(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  let normalizedHex = hex.replace('#', '');
  if (normalizedHex.length === 3) {
    normalizedHex = normalizedHex
      .split('')
      .map(char => char + char)
      .join('');
  }

  const bigint = parseInt(normalizedHex, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return { r, g, b, a: 1 };
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  params: {
    width: number;
    height: number;
    chartWidth: number;
    chartHeight: number;
    padding: { top: number; right: number; bottom: number; left: number };
    minTime: number;
    maxTime: number;
    minValue: number;
    maxValue: number;
    xUnits: string;
    yUnits: string;
  }
) {
  const { chartWidth, chartHeight, padding, minTime, maxTime, minValue, maxValue, xUnits, yUnits } = params;

  const originX = padding.left;
  const originY = padding.top + chartHeight;

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
  ctx.stroke();

  const tickCount = 6;
  ctx.fillStyle = '#000000ff';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';

  for (let i = 0; i < tickCount; i++) {
    const ratio = i / (tickCount - 1);
    const x = padding.left + ratio * chartWidth;
    const value = minTime + ratio * (maxTime - minTime);
    ctx.beginPath();
    ctx.moveTo(x, originY);
    ctx.lineTo(x, originY + 6);
    ctx.stroke();
    ctx.fillText(value.toFixed(2), x, originY + 18);
  }

  ctx.save();
  ctx.textAlign = 'right';
  for (let i = 0; i < tickCount; i++) {
    const ratio = i / (tickCount - 1);
    const y = padding.top + chartHeight - ratio * chartHeight;
    const value = minValue + ratio * (maxValue - minValue);
    ctx.beginPath();
    ctx.moveTo(originX - 6, y);
    ctx.lineTo(originX, y);
    ctx.stroke();
    ctx.fillText(value.toFixed(2), originX - 10, y + 3);
  }
  ctx.restore();

  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(xUnits, padding.left + chartWidth / 2, originY + 34);

  ctx.save();
  ctx.translate(padding.left - 44, padding.top + chartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yUnits, 0, 0);
  ctx.restore();
}

function disposeCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
  if (canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
}
