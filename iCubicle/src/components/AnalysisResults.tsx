import styles from './AnalysisResults.module.css';
import type { CubicleResponse } from '../api';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
import { Line } from 'react-chartjs-2';
import { useGeneratePDF } from '../hooks/useGeneratePDF';
// prettier-ignore
const sub = (base: React.ReactNode, s: React.ReactNode, tail?: React.ReactNode) => (
	<>{base}<sub>{s}</sub>{tail}</>);

// prettier-ignore
const sup = (base: React.ReactNode, s: React.ReactNode, tail?: React.ReactNode) => (
	<>{base}<sup>{s}</sup>{tail}</>);

// prettier-ignore
const frac = (top: React.ReactNode, bot: React.ReactNode, tail?: React.ReactNode) => (
	<>{top} / {bot}{tail}</>);

/** Units are wrapped in a span that resets font-weight */
const unit = (node: React.ReactNode, u: React.ReactNode) => (
  <>
    {node} <span className={styles.unit}>({u})</span>
  </>
);
// Different color for each index
const colorForIndex = (i: number) => `hsl(${(i * 57) % 360}, 70%, 50%)`;

// prettier-ignore
const KEY_LABELS: Record<string, React.ReactNode> = {
	Ra: unit(sub('R', 'a'), 'ft'),
	h_over_H: frac('h', 'H'),
	l_over_L: frac('l', 'L'),
	Ra_over_W_cube_root: unit(frac(sub('R', 'a'), sup('W', '1/3')), sup('ft/lb', '⅓')),
	L_over_Ra: frac('L', sub('R', 'a')),
	L_over_H: frac('L', 'H'),
	W_over_Vf: unit(frac('W', sub('V', 'f')), 'lb/ft³ '),
	A_over_Vf_cube_root_squared: unit(frac('A', sup(sub('V', 'f'), '2/3')), 'ft⁻¹'),
	Wf_over_W_cube_root: unit(frac(sub('W', 'f'), sup('W', '1/3')), sup('psi/lb', '⅓')),
	A: unit('A', 'ft²'),
	Ps: unit(sub('P', 's'), 'psi'),
	Is: unit(sub('I', 's'), 'psi·ms'),
	Ts: unit(sub('T', 's'), 'ms'),
	Pg: unit(sub('P', 'g'), 'psi'),
	Ig: unit(sub('I', 'g'), 'psi·ms'),
	Tg: unit(sub('T', 'g'), 'ms')
};

const renderKey = (key: string) => KEY_LABELS[key] ?? key;

export function AnalysisResults({ props: props }: { props: CubicleResponse | null }) {
  const hasChartData = props?.success && props.result?.FinalChart?.curves && props.result.FinalChart.curves.length > 0;
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // PDF generation hook
  const { generatePDF, isGenerating, progress, error: pdfError } = useGeneratePDF();

  const handleDownloadPDF = async () => {
    if (!props || !props.success) {
      alert('No analysis results to generate PDF');
      return;
    }

    try {
      await generatePDF(props, { filename: 'cubicle_analysis_report.pdf' });
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert(`PDF generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Close on ESC or click outside
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (buttonRef.current && !buttonRef.current.contains(target) && popupRef.current && !popupRef.current.contains(target)) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [open]);

  const data = useMemo(() => {
    if (!hasChartData || !props?.result?.FinalChart) return null;

    const chart = props.result.FinalChart;

    const datasets = chart.curves.map((curve, idx) => {
      const points = curve.xdata.map((x, i) => ({ x, y: curve.ydata[i] }));
      return {
        label: curve.curve_name,
        data: points,
        fill: false,
        borderColor: colorForIndex(idx),
        tension: 0.0,
        pointRadius: 5,
        pointHoverRadius: 7
      };
    });

    return { datasets };
  }, [props, hasChartData]);

  return (
    <div className={styles.container}>
      <div className={styles.resultPanel}>
        <div className={styles.resultColumn}>
          <div className={styles.resultHeader}>
            <h2 className={styles.eyebrow}>Parameters</h2>
            <div className={styles.headerButtons}>
              {props?.success && props.result?.ShockPressureSteps && (
                <button type="button" className={styles.pdfButton} onClick={handleDownloadPDF} disabled={isGenerating} title="Download PDF Report">
                  {isGenerating ? `Generating... ${progress}%` : '📄 PDF'}
                </button>
              )}
              <button
                ref={buttonRef}
                type="button"
                className={styles.analysisHelpButton}
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                aria-controls="analysis-help-text"
              >
                ?
              </button>
            </div>
          </div>

          {pdfError && <div className={styles.errorMessage}>PDF Error: {pdfError}</div>}

          {open && (
            <div ref={popupRef} id="analysis-help-text" className={styles.analysisHelpText} role="note">
              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>Parameter Definitions:</strong>
              <ul style={{ margin: '0.75rem 0 0.5rem 0', paddingLeft: '1.25rem', listStyle: 'none' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Ra:</strong> Standoff distance from charge to target
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>N:</strong> Number of reflecting surfaces
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>h/H:</strong> Normalized charge height
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>l/L:</strong> Normalized charge position
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Ps:</strong> Reflected pressure at target
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Ir:</strong> Reflected impulse at target
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Pg:</strong> Gas pressure in cubicle
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Ig:</strong> Gas impulse
                </li>
              </ul>
              <p style={{ margin: '0', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Press ESC to close</p>
            </div>
          )}

          {props?.success ? (
            // Iterate over params and display key-value pairs
            props.result?.CalculatedParams ? (
              <div className={styles.paramsList}>
                {Object.entries(props.result.CalculatedParams).map(([key, value]) => (
                  <div className={styles.paramDisplay} key={key}>
                    <div className={styles.paramKey}>{renderKey(key)}</div>
                    <div className={styles.paramValue}>{typeof value === 'number' ? value.toFixed(2) : value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No parameters available.</p>
            )
          ) : (
            <p>Nothing to display</p>
          )}
        </div>
        {/* Chart area */}
        <div className={styles.resultColumn}>
          {data ? (
            <Line
              data={data}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      boxHeight: 1,
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    type: 'linear',
                    title: {
                      display: true,
                      text: props?.result?.Chart?.xlabel || 'X Axis'
                    },
                    ticks: {
                      autoSkip: true,
                      maxTicksLimit: 10
                    }
                  },
                  y: {
                    type: 'linear',
                    title: {
                      display: true,
                      text: props?.result?.Chart?.ylabel || 'Y Axis'
                    },
                    beginAtZero: true,
                    ticks: {
                      autoSkip: true,
                      maxTicksLimit: 10
                    }
                  }
                }
              }}
            />
          ) : (
            <p>No chart data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
