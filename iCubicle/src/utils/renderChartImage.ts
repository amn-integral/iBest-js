import { Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, LineController, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components needed for line charts
ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, LineController, Title, Tooltip, Legend);

export function renderChartToImage(data: any, options: any, width: number = 800, height: number = 600): string {
  // Create a temporary canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // Create the chart
  const chart = new ChartJS(canvas, {
    type: 'line',
    data,
    options: {
      ...options,
      animation: false,
      responsive: false,
      maintainAspectRatio: false
    }
  });

  // Get the image data
  const imageData = canvas.toDataURL('image/png');

  // Destroy the chart to free up memory
  chart.destroy();

  return imageData;
}
