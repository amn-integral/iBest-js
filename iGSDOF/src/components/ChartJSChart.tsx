import { useEffect, useRef } from "react";

interface ChartJSChartProps {
  title: string;
  time: number[];
  values: number[];
  color: string;
  className?: string;
  xUnits?: string;
  yUnits?: string;
}

export const ChartJSChart: React.FC<ChartJSChartProps> = ({
  title,
  time,
  values,
  color,
  className,
  xUnits = "",
  yUnits = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || !time.length || !values.length) return;

    // For now, let's use a simple canvas-based line chart
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up chart dimensions
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    // Find min/max values
    const minTime = Math.min(...time);
    const maxTime = Math.max(...time);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    const timeRange = maxTime - minTime || 1;
    const valueRange = maxValue - minValue || 1;

    // Draw axes
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Y-axis
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    // X-axis
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw title
    ctx.fillStyle = "#333";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, 25);

    // Draw axis labels
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(xUnits, canvas.width / 2, canvas.height - 5);

    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yUnits, 0, 0);
    ctx.restore();

    // Draw data line
    if (values.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < time.length; i++) {
        const x = padding + ((time[i] - minTime) / timeRange) * chartWidth;
        const y =
          canvas.height -
          padding -
          ((values[i] - minValue) / valueRange) * chartHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Draw some grid lines
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 1; i < 5; i++) {
      const x = padding + (i / 5) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, canvas.height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 1; i < 5; i++) {
      const y = padding + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }
  }, [time, values, color, title, xUnits, yUnits]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        style={{ width: "100%", height: "auto", maxWidth: "800px" }}
      />
    </div>
  );
};
