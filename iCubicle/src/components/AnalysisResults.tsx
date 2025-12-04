import { useState, useRef } from 'react';
import styles from './AnalysisResults.module.css';
import { CurveCharts } from './CurveCharts';

type AnalysisResultsProps = {
  analysisResult: string | null;
  analysisError: string | null;
  pressureCurves?: Record<number, Array<{ curve_name: string; xdata: number[]; ydata: number[]; num_points: number }>>;
  impulseCurves?: Record<number, Array<{ curve_name: string; xdata: number[]; ydata: number[]; num_points: number }>>;
};

export function AnalysisResults({ analysisResult, analysisError, pressureCurves, impulseCurves }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'charts'>('results');
  
  // Create persistent image cache that survives tab switches
  const pressureImagesRef = useRef<Record<number, string[]>>({});
  const impulseImagesRef = useRef<Record<number, string[]>>({});

  const hasChartData = (pressureCurves && Object.keys(pressureCurves).length > 0) || (impulseCurves && Object.keys(impulseCurves).length > 0);

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'results' ? styles.active : ''}`} onClick={() => setActiveTab('results')}>
          Text Results
        </button>
        <button className={`${styles.tab} ${activeTab === 'charts' ? styles.active : ''}`} onClick={() => setActiveTab('charts')} disabled={!hasChartData}>
          Charts
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'results' && (
          <div className={styles.resultsPanel}>
            {analysisError ? (
              <div className={styles.errorMessage}>{analysisError}</div>
            ) : analysisResult ? (
              <div className={styles.resultContent} dangerouslySetInnerHTML={{ __html: analysisResult }} />
            ) : (
              <p className={styles.placeholder}>Analysis results will appear here...</p>
            )}
          </div>
        )}

        {activeTab === 'charts' && (
          <div className={styles.chartsPanel}>
            {hasChartData ? (
              <CurveCharts 
                pressureCurves={pressureCurves} 
                impulseCurves={impulseCurves}
                imageCache={{
                  pressureImages: pressureImagesRef,
                  impulseImages: impulseImagesRef
                }}
              />
            ) : (
              <p className={styles.placeholder}>Chart data will be displayed here...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
