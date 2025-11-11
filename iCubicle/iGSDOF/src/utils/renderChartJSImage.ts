import { findMinMax } from "@integralrsg/imath";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

/**
 * Renders a high-resolution Chart.js line chart offscreen
 * and returns a base64 PNG image string.
 */
export default async function renderChartJS(
  imageType: "png" | "jpeg" = "png",
  time: number[],
  values: number[],
  options?: {
    color?: string;
    width?: number;
    height?: number;
    title?: string;
    xUnits?: string;
    yUnits?: string;
  }
): Promise<string | null> {

  const {
    color = "#3b82f6",
    width = 600,
    height = 300,
    title = "Chart",
    xUnits = "Time",
    yUnits = "Value",
  } = options || {};

  if (!time?.length || !values?.length) return null;

  /** Shared font constant */
const LABEL_FONT = {
  family: "Arial, sans-serif",
  size: 14,
};
const TICK_FONT = {
  family: "Arial, sans-serif",
  size: 11,
  weight: "normal" as const,
};

  const SCALE = window.devicePixelRatio  || 1 ;
  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(SCALE, SCALE);

  const minMax = findMinMax(values);
  const minValue = minMax.min;
  const maxValue = minMax.max;

  const subtitle = `${yUnits} (min: ${minValue.toFixed(2)}, max: ${maxValue.toFixed(2)})`;

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: time,
      datasets: [
        {
          label: yUnits,
          data: values,
          borderColor: color,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: {
          top: 5,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
      plugins: {
        title: {
          display: !!title,
          text: [title, subtitle],
          font: { ...LABEL_FONT, size: 16, weight: "bold" },
          color: "#222",
          padding: {
            top: 0,
            bottom: 0,
          },
        },
        legend: { display: false },
      },
      scales: {
        x: {

          type: "linear",
          title: {
            display: true,
            text: xUnits,
            font: { ...LABEL_FONT, size: 13, weight: "bold" as const },
            color: "#333",
            padding: { top: 0 },
          },
          ticks: {
            font: TICK_FONT,
            color: "#333",
            padding: 6,
            callback: (val) => {
              const num = Number(val);
              return Number.isFinite(num) ? num.toFixed(2) : val;
            },
          },
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        y: {
          title: {
            display: true,
            text: yUnits,
            font: { ...LABEL_FONT, size: 13, weight: "bold" as const },
            color: "#333",
            padding: { bottom: 0 },
          },
          ticks: {
            font: TICK_FONT,
            color: "#333",
            maxTicksLimit: 6,
            padding: 0,
            callback: (val) => {
              const num = Number(val);
              return Number.isFinite(num) ? num.toFixed(2) : val;
            },
          },
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
      },
    },
  });

  /** 3️⃣ Wait briefly to ensure chart renders */
  await new Promise((resolve) => setTimeout(resolve, 20));

  /** 4️⃣ Export high-quality PNG (or JPEG) */
  let imageData: string | null = null;
  try {
    imageData = canvas.toDataURL(`image/${imageType}`);
  } catch {
    imageData = null;
  }

  /** 5️⃣ Cleanup memory */
  chart.destroy();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;

  try {
    time.length = 0;
    values.length = 0;
  } catch {
    /* ignore */
  }

  return imageData;
}
