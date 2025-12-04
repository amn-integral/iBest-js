import { useState, useMemo, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import styles from './CurveCharts.module.css';
import { renderChartToImage } from '../utils/renderChartImage';

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Title, Tooltip, Legend);

type CurveData = {
  curve_name: string;
  xdata: number[];
  ydata: number[];
  num_points: number;
};

type CurveChartsProps = {
  pressureCurves?: Record<number, Array<CurveData>>;
  impulseCurves?: Record<number, Array<CurveData>>;
  onCurvesProcessed?: () => void;
  imageCache: {
    pressureImages: React.MutableRefObject<Record<number, string[]>>;
    impulseImages: React.MutableRefObject<Record<number, string[]>>;
  };
};

export function CurveCharts({ pressureCurves, impulseCurves, onCurvesProcessed, imageCache }: CurveChartsProps) {
  const [activeTab, setActiveTab] = useState<'pressure' | 'impulse'>('pressure');

  console.log('CurveCharts received pressureCurves:', pressureCurves);
  console.log('CurveCharts received impulseCurves:', impulseCurves);

  const [currentPressureStep, setCurrentPressureStep] = useState(0);
  const [currentImpulseStep, setCurrentImpulseStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; title: string } | null>(null);
  const [curvesCleared, setCurvesCleared] = useState(false);
  const [, forceUpdate] = useState({});
  
  // Use cache from parent props
  const pressureImagesRef = imageCache.pressureImages;
  const impulseImagesRef = imageCache.impulseImages;

  const pressureSteps = useMemo(() => {
    if (!pressureCurves) {
      console.log('No pressure curves');
      return [];
    }
    setCurvesCleared(false); // Reset when new data arrives
    const steps = Object.keys(pressureCurves)
      .map(Number)
      .sort((a, b) => a - b);
    console.log('Pressure steps:', steps);
    return steps;
  }, [pressureCurves]);

  const impulseSteps = useMemo(() => {
    if (!impulseCurves) return [];
    return Object.keys(impulseCurves)
      .map(Number)
      .sort((a, b) => a - b);
  }, [impulseCurves]);

  // Initialize step when data loads
  useMemo(() => {
    if (pressureSteps.length > 0 && currentPressureStep === 0) {
      setCurrentPressureStep(pressureSteps[0]);
    }
  }, [pressureSteps, currentPressureStep]);

  useMemo(() => {
    if (impulseSteps.length > 0 && currentImpulseStep === 0) {
      setCurrentImpulseStep(impulseSteps[0]);
    }
  }, [impulseSteps, currentImpulseStep]);

  // Generate images only for the current pressure step (only if not already generated)
  useEffect(() => {
    if (!pressureCurves || currentPressureStep === 0) return;
    // Skip if already generated for this step
    if (pressureImagesRef.current[currentPressureStep]) return;
    
    setIsGenerating(true);
    // Use setTimeout to avoid blocking the UI
    setTimeout(() => {
      const chartGroups = pressureCurves[currentPressureStep] || [];
      const images = chartGroups.map(chartGroup => {
        const chartData = createChartDataFromGroup(chartGroup);
        return renderChartToImage(chartData, chartOptions, 1200, 900); // High resolution for clarity
      });
      pressureImagesRef.current[currentPressureStep] = images;
      setIsGenerating(false);
      forceUpdate({}); // Trigger re-render
    }, 0);
  }, [currentPressureStep, pressureCurves]);

  // Generate images only for the current impulse step (only if not already generated)
  useEffect(() => {
    if (!impulseCurves || currentImpulseStep === 0) return;
    // Skip if already generated for this step
    if (impulseImagesRef.current[currentImpulseStep]) return;
    
    setIsGenerating(true);
    // Use setTimeout to avoid blocking the UI
    setTimeout(() => {
      const chartGroups = impulseCurves[currentImpulseStep] || [];
      const images = chartGroups.map(chartGroup => {
        const chartData = createChartDataFromGroup(chartGroup);
        return renderChartToImage(chartData, chartOptions, 1200, 900); // High resolution for clarity
      });
      impulseImagesRef.current[currentImpulseStep] = images;
      setIsGenerating(false);
      forceUpdate({}); // Trigger re-render
    }, 0);
  }, [currentImpulseStep, impulseCurves]);

  // Clear curve data after initial images are generated to save memory
  useEffect(() => {
    if (curvesCleared) return;
    
    const hasPressure = pressureSteps.length > 0;
    const hasImpulse = impulseSteps.length > 0;
    
    // Check if initial step images are generated
    const pressureReady = !hasPressure || (currentPressureStep > 0 && pressureImagesRef.current[currentPressureStep]);
    const impulseReady = !hasImpulse || (currentImpulseStep > 0 && impulseImagesRef.current[currentImpulseStep]);
    
    if (pressureReady && impulseReady && !isGenerating) {
      // Notify parent to clear the raw curve data to free up memory
      setTimeout(() => {
        console.log('Notifying parent to clear curve data to free memory');
        setCurvesCleared(true);
        if (onCurvesProcessed) {
          onCurvesProcessed();
        }
      }, 100);
    }
  }, [currentPressureStep, currentImpulseStep, pressureSteps, impulseSteps, isGenerating, curvesCleared, onCurvesProcessed]);

  const handlePrevPressure = () => {
    const currentIndex = pressureSteps.indexOf(currentPressureStep);
    if (currentIndex > 0) {
      setCurrentPressureStep(pressureSteps[currentIndex - 1]);
    }
  };

  const handleNextPressure = () => {
    const currentIndex = pressureSteps.indexOf(currentPressureStep);
    if (currentIndex < pressureSteps.length - 1) {
      setCurrentPressureStep(pressureSteps[currentIndex + 1]);
    }
  };

  const handlePrevImpulse = () => {
    const currentIndex = impulseSteps.indexOf(currentImpulseStep);
    if (currentIndex > 0) {
      setCurrentImpulseStep(impulseSteps[currentIndex - 1]);
    }
  };

  const handleNextImpulse = () => {
    const currentIndex = impulseSteps.indexOf(currentImpulseStep);
    if (currentIndex < impulseSteps.length - 1) {
      setCurrentImpulseStep(impulseSteps[currentIndex + 1]);
    }
  };

  const handleChartClick = (imageSrc: string, title: string) => {
    setEnlargedImage({ src: imageSrc, title });
  };

  const handleCloseModal = () => {
    setEnlargedImage(null);
  };



  // Matplotlib-like colors (tab10 colormap)
  const colors = [
    'rgb(31, 119, 180)',   // blue
    'rgb(255, 127, 14)',   // orange
    'rgb(44, 160, 44)',    // green
    'rgb(214, 39, 40)',    // red
    'rgb(148, 103, 189)',  // purple
    'rgb(140, 86, 75)',    // brown
    'rgb(227, 119, 194)',  // pink
    'rgb(127, 127, 127)',  // gray
    'rgb(188, 189, 34)',   // olive
    'rgb(23, 190, 207)',   // cyan
  ];

  const createChartDataFromGroup = (chartGroup: any) => {
    if (!chartGroup || !chartGroup.curves || chartGroup.curves.length === 0) {
      return {
        datasets: []
      };
    }

    const datasets = chartGroup.curves.map((curve: any, index: number) => {
      if (!curve.xdata || !curve.ydata) {
        return null;
      }

      const points = curve.xdata.map((x: number, i: number) => {
        const y = curve.ydata[i];
        if (x > 0 && y > 0) {
          return { x, y };
        }
        return null;
      }).filter((p: any) => p !== null);

      return {
        label: curve.curve_name || `Curve ${index + 1}`,
        data: points,
        borderColor: colors[index % colors.length],
        backgroundColor: 'transparent',
        borderWidth: 1.5,  // Thinner lines like matplotlib
        pointRadius: 0,    // No points by default
        pointHoverRadius: 3,
        tension: 0
      };
    }).filter((d: any) => d !== null);

    return { datasets };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    transitions: {
      active: {
        animation: {
          duration: 0
        }
      }
    },
    scales: {
      x: {
        type: 'logarithmic' as const,
        min: 1,
        title: {
          display: true,
          text: 'L/Ra',
          font: {
            size: 12,
            family: 'Arial, sans-serif'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 0.5
        },
        ticks: {
          font: {
            size: 10,
            family: 'Arial, sans-serif'
          },
          color: '#000'
        },
        border: {
          color: '#000',
          width: 1
        }
      },
      y: {
        type: 'logarithmic' as const,
        min: 0.1,
        title: {
          display: true,
          text: 'Pr [psi]',
          font: {
            size: 12,
            family: 'Arial, sans-serif'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 0.5
        },
        ticks: {
          font: {
            size: 10,
            family: 'Arial, sans-serif'
          },
          color: '#000'
        },
        border: {
          color: '#000',
          width: 1
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'right' as const,
        align: 'start' as const,
        labels: {
          boxWidth: 12,
          boxHeight: 1,
          font: {
            size: 9,
            family: 'Arial, sans-serif'
          },
          padding: 6,
          usePointStyle: false,
          color: '#000'
        }
      },
      tooltip: {
        enabled: true,
        mode: 'nearest' as const,
        intersect: false,
        animation: false,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#000',
        bodyColor: '#000',
        borderColor: '#000',
        borderWidth: 1
      }
    }
  };

  const hasPressureData = pressureSteps.length > 0;
  const hasImpulseData = impulseSteps.length > 0;

  if (!hasPressureData && !hasImpulseData) {
    return <p className={styles.placeholder}>No chart data available</p>;
  }

  return (
    <div className={styles.container}>
      {/* Chart Type Tabs */}
      <div className={styles.subTabs}>
        <button
          className={`${styles.subTab} ${activeTab === 'pressure' ? styles.activeSubTab : ''}`}
          onClick={() => setActiveTab('pressure')}
          disabled={!hasPressureData}
        >
          Pressure Curves
        </button>
        <button
          className={`${styles.subTab} ${activeTab === 'impulse' ? styles.activeSubTab : ''}`}
          onClick={() => setActiveTab('impulse')}
          disabled={!hasImpulseData}
        >
          Impulse Curves
        </button>
      </div>

      {/* Pressure Charts */}
      {activeTab === 'pressure' && hasPressureData && (
        <div className={styles.chartSection}>
          <div className={styles.navigation}>
            <button
              className={styles.navButton}
              onClick={handlePrevPressure}
              disabled={pressureSteps.indexOf(currentPressureStep) === 0}
            >
              ← Previous
            </button>
            <span className={styles.stepInfo}>
              Pressure Curves - Step {currentPressureStep} ({(pressureCurves?.[currentPressureStep] || []).length} charts - Step {pressureSteps.indexOf(currentPressureStep) + 1} of {pressureSteps.length})
            </span>
            <button
              className={styles.navButton}
              onClick={handleNextPressure}
              disabled={pressureSteps.indexOf(currentPressureStep) === pressureSteps.length - 1}
            >
              Next →
            </button>
          </div>

          <div className={styles.chartsGrid}>
            {(pressureCurves?.[currentPressureStep] || []).map((chartGroup: any, idx: number) => (
              <div key={idx} className={styles.chartContainer}>
                <h4 className={styles.chartTitle}>{chartGroup.filename}</h4>
                <div className={styles.chartWrapper}>
                  {pressureImagesRef.current[currentPressureStep]?.[idx] ? (
                    <img 
                      src={pressureImagesRef.current[currentPressureStep][idx]} 
                      alt={chartGroup.filename}
                      className={styles.chartImage}
                      onClick={() => handleChartClick(pressureImagesRef.current[currentPressureStep][idx], chartGroup.filename)}
                      title="Click to enlarge"
                    />
                  ) : (
                    <div className={styles.loading}>{isGenerating ? 'Generating chart...' : 'Loading chart...'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Impulse Charts */}
      {activeTab === 'impulse' && hasImpulseData && (
        <div className={styles.chartSection}>
          <div className={styles.navigation}>
            <button
              className={styles.navButton}
              onClick={handlePrevImpulse}
              disabled={impulseSteps.indexOf(currentImpulseStep) === 0}
            >
              ← Previous
            </button>
            <span className={styles.stepInfo}>
              Impulse Curves - Step {currentImpulseStep} ({(impulseCurves?.[currentImpulseStep] || []).length} charts - Step {impulseSteps.indexOf(currentImpulseStep) + 1} of {impulseSteps.length})
            </span>
            <button
              className={styles.navButton}
              onClick={handleNextImpulse}
              disabled={impulseSteps.indexOf(currentImpulseStep) === impulseSteps.length - 1}
            >
              Next →
            </button>
          </div>

          <div className={styles.chartsGrid}>
            {(impulseCurves?.[currentImpulseStep] || []).map((chartGroup: any, idx: number) => (
              <div key={idx} className={styles.chartContainer}>
                <h4 className={styles.chartTitle}>{chartGroup.filename}</h4>
                <div className={styles.chartWrapper}>
                  {impulseImagesRef.current[currentImpulseStep]?.[idx] ? (
                    <img 
                      src={impulseImagesRef.current[currentImpulseStep][idx]} 
                      alt={chartGroup.filename}
                      className={styles.chartImage}
                      onClick={() => handleChartClick(impulseImagesRef.current[currentImpulseStep][idx], chartGroup.filename)}
                      title="Click to enlarge"
                    />
                  ) : (
                    <div className={styles.loading}>{isGenerating ? 'Generating chart...' : 'Loading chart...'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for enlarged view */}
      {enlargedImage && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={handleCloseModal}>
              ✕
            </button>
            <h3 className={styles.modalTitle}>{enlargedImage.title}</h3>
            <img src={enlargedImage.src} alt={enlargedImage.title} className={styles.modalImage} />
          </div>
        </div>
      )}
    </div>
  );
}
