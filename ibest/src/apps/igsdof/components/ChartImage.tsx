import { useEffect, useState } from 'react';

interface ChartJSChartProps {
  title: string;
  time: number[];
  values: number[];
  color: string;
  className?: string;
  xUnits?: string;
  yUnits?: string;
}

export const ChartJSChart: React.FC<ChartJSChartProps> = ({ title, time, values, color, className, xUnits = '', yUnits = '' }) => {
  const [chartImage, setChartImage] = useState<string | null>(null);

  // CLEANUP: Clear image data on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      setChartImage(null);
    };
  }, []);

  useEffect(() => {
    // Only proceed when fresh data is provided
    if (!time?.length || !values?.length) return;

    // Create canvas and draw a lightweight chart (displacement only)
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Layout paddings
    const leftPadding = 80;
    const rightPadding = 40;
    const topPadding = 60;
    const bottomPadding = 60;
    const chartWidth = canvas.width - leftPadding - rightPadding;
    const chartHeight = canvas.height - topPadding - bottomPadding;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find min/max without using spread (avoid stack errors)
    const findMinMax = (arr: number[]) => {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (min === Number.POSITIVE_INFINITY) min = 0;
      if (max === Number.NEGATIVE_INFINITY) max = 1;
      return { min, max };
    };

    const tBounds = findMinMax(time);
    const vBounds = findMinMax(values);
    const minTime = tBounds.min;
    const maxTime = tBounds.max;
    const minValue = vBounds.min;
    const maxValue = vBounds.max;
    const timeRange = maxTime - minTime || 1;
    const valueRange = maxValue - minValue || 1;

    // Draw title
    ctx.fillStyle = '#222';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 32);

    // Min / Max display
    ctx.font = '12px Arial';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText(`Min: ${minValue.toFixed(4)}`, leftPadding + 6, topPadding - 28);
    ctx.fillText(`Max: ${maxValue.toFixed(4)}`, leftPadding + 6, topPadding - 10);

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftPadding, topPadding);
    ctx.lineTo(leftPadding, canvas.height - bottomPadding);
    ctx.lineTo(canvas.width - rightPadding, canvas.height - bottomPadding);
    ctx.stroke();

    // Grid lines
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const x = leftPadding + (i / 5) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, topPadding);
      ctx.lineTo(x, canvas.height - bottomPadding);
      ctx.stroke();
    }
    for (let i = 1; i <= 4; i++) {
      const y = topPadding + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(leftPadding, y);
      ctx.lineTo(canvas.width - rightPadding, y);
      ctx.stroke();
    }

    // Draw data line
    if (values.length > 0 && time.length > 0) {
      ctx.strokeStyle = color || '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < values.length; i++) {
        const tx = time[i];
        const v = values[i];
        const x = leftPadding + ((tx - minTime) / timeRange) * chartWidth;
        const y = canvas.height - bottomPadding - ((v - minValue) / valueRange) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Axis labels and ticks
    ctx.fillStyle = '#333';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const x = leftPadding + (i / 5) * chartWidth;
      const tVal = minTime + (i / 5) * timeRange;
      ctx.fillText(tVal.toFixed(2), x, canvas.height - bottomPadding + 20);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = canvas.height - bottomPadding - (i / 5) * chartHeight;
      const v = minValue + (i / 5) * valueRange;
      ctx.fillText(v.toFixed(3), leftPadding - 8, y + 4);
    }

    // Convert to JPEG and set image
    try {
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.4); // Lower quality for less memory
      setChartImage(imageDataUrl);
    } catch (err) {
      console.error('Failed to convert chart to image:', err);
    }

    // AGGRESSIVE CANVAS CLEANUP - Free canvas memory immediately
    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    } catch (e) {
      console.warn('Canvas cleanup error:', e);
    }

    // Clear large arrays to free memory (mutates the passed arrays)
    try {
      time.length = 0;
      values.length = 0;
    } catch (e) {
      console.warn('Array cleanup error:', e);
    }
  }, [time, values, color, title, xUnits, yUnits]);

  if (chartImage) {
    return (
      <div className={className}>
        <img src={chartImage} alt={title} style={{ width: '100%', height: 'auto', maxWidth: '800px' }} />
      </div>
    );
  }

  return (
    <div className={className}>
      <div>Rendering chart…</div>
    </div>
  );
};
