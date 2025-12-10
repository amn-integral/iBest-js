/**
 * Cubicle Report Component for PDF generation.
 * Replicates the structure of cubicle_report.html with embedded charts.
 */

import React from 'react';
import type { CubicleInputType, CubicleCalculatedParams } from '../api/types';
import styles from './CubicleReport.module.css';

interface CubicleReportProps {
  inputParams: CubicleInputType;
  calculatedParams: CubicleCalculatedParams;
  results: Record<string, number>;
  pressureChartImages: Record<number, string[]>; // Step number -> array of base64 images
}

export const CubicleReport: React.FC<CubicleReportProps> = ({ inputParams, calculatedParams, results, pressureChartImages }) => {
  return (
    <div className={styles.report}>
      <h1>UFC 3-340-02 Cubicle Analysis Report</h1>

      {/* Analysis Summary */}
      <section className={styles.section}>
        <h2>Analysis Summary</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Units</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Shock Pressure (Ps)</strong>
              </td>
              <td>{results.Ps?.toFixed(3)}</td>
              <td>psi</td>
            </tr>
            <tr>
              <td>
                <strong>Shock Impulse (Is)</strong>
              </td>
              <td>{results.Is?.toFixed(3)}</td>
              <td>psi-ms</td>
            </tr>
            <tr>
              <td>
                <strong>Shock Duration (Ts)</strong>
              </td>
              <td>{results.Ts?.toFixed(3)}</td>
              <td>ms</td>
            </tr>
            <tr>
              <td>
                <strong>Gas Pressure (Pg)</strong>
              </td>
              <td>{results.Pg?.toFixed(3)}</td>
              <td>psi</td>
            </tr>
            <tr>
              <td>
                <strong>Gas Impulse (Ig)</strong>
              </td>
              <td>{results.Ig?.toFixed(3)}</td>
              <td>psi-ms</td>
            </tr>
            <tr>
              <td>
                <strong>Gas Duration (Tg)</strong>
              </td>
              <td>{results.Tg?.toFixed(3)}</td>
              <td>ms</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Input Parameters */}
      <section className={styles.section}>
        <h2>Input Parameters</h2>
        <h3>Charge & Geometry</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Charge Weight (W)</td>
              <td>{inputParams.W.toFixed(2)} (lbs) **1.2 x charge weight</td>
            </tr>
            <tr>
              <td>Cubicle Type</td>
              <td>{inputParams.cubicle_type}</td>
            </tr>
            <tr>
              <td>Target Wall</td>
              <td>{inputParams.target_wall}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className={styles.pageBreak}></div>

      <section className={styles.section}>
        <h3>Cubicle Dimensions</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Units</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Length (Lc)</td>
              <td>{inputParams.Lc.toFixed(2)}</td>
              <td>ft</td>
            </tr>
            <tr>
              <td>Width (Wc)</td>
              <td>{inputParams.Wc.toFixed(2)}</td>
              <td>ft</td>
            </tr>
            <tr>
              <td>Height (Hc)</td>
              <td>{inputParams.Hc.toFixed(2)}</td>
              <td>ft</td>
            </tr>
            <tr>
              <td>X Position</td>
              <td>{inputParams.X.toFixed(2)}</td>
              <td>ft</td>
            </tr>
            <tr>
              <td>Y Position</td>
              <td>{inputParams.Y.toFixed(2)}</td>
              <td>ft</td>
            </tr>
            <tr>
              <td>Z Position</td>
              <td>{inputParams.Z.toFixed(2)}</td>
              <td>ft</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Calculated Geometry */}
      <section className={styles.section}>
        <h2>Calculated Geometry Parameters</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Standoff Distance (Ra)</td>
              <td>{calculatedParams.Ra.toFixed(3)}</td>
              <td>Distance from charge to target wall</td>
            </tr>
            <tr>
              <td>Reflections (N)</td>
              <td>{calculatedParams.N.toFixed(1)}</td>
              <td>Number of shock reflections</td>
            </tr>
            <tr>
              <td>Height Ratio (h/H)</td>
              <td>{calculatedParams.h_over_H.toFixed(3)}</td>
              <td>Target height to enclosure height</td>
            </tr>
            <tr>
              <td>Length Ratio (l/L)</td>
              <td>{calculatedParams.l_over_L.toFixed(3)}</td>
              <td>Target length to enclosure length</td>
            </tr>
            <tr>
              <td>Scaled Standoff (Za)</td>
              <td>{calculatedParams.Ra_over_W_cube_root.toFixed(3)}</td>
              <td>
                Ra/W<sup>1/3</sup>
              </td>
            </tr>
            <tr>
              <td>Aspect Ratio (L/Ra)</td>
              <td>{calculatedParams.L_over_Ra.toFixed(3)}</td>
              <td>Enclosure length to standoff</td>
            </tr>
            <tr>
              <td>Chamber Ratio (L/H)</td>
              <td>{calculatedParams.L_over_H.toFixed(3)}</td>
              <td>Enclosure length to height</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className={styles.pageBreak}></div>

      {/* Shock Pressure Analysis Steps */}
      {[1, 2, 3, 4].map(stepNum => (
        <section key={stepNum} className={styles.section}>
          <h2>Shock Pressure Analysis - Step {stepNum}</h2>
          <p>{getStepDescription(stepNum, calculatedParams)}</p>
          <div className={styles.chartsGrid}>
            {pressureChartImages[stepNum]?.map((chartBase64, index) => (
              <div key={index} className={styles.chartItem}>
                <img src={`data:image/png;base64,${chartBase64}`} alt={`Pressure Chart Step ${stepNum} - ${index + 1}`} />
              </div>
            ))}
          </div>
          {stepNum < 4 && <div className={styles.pageBreak}></div>}
        </section>
      ))}

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Generated using iBEST UFC 3-340-02 Analysis Tool</p>
        <p>This report is for engineering analysis purposes only.</p>
      </footer>
    </div>
  );
};

/**
 * Get description text for each analysis step
 */
function getStepDescription(stepNum: number, params: CubicleCalculatedParams): string {
  const za = params.Ra_over_W_cube_root.toFixed(3);
  const lh = params.L_over_H.toFixed(3);
  const ll = params.l_over_L.toFixed(3);
  const hh = params.h_over_H.toFixed(3);

  switch (stepNum) {
    case 1:
      return `The step 1 involves interpolating for the required value of Za = ${za} using the UFC 3-340-02 provided shock pressure curves. The following charts illustrate the interpolated shock pressure curves for Za.`;
    case 2:
      return `The step 2 involves combining charts from step 1 by L/H ratios for given Za = ${za} and interpolating for L/H = ${lh}.`;
    case 3:
      return `The step 3 involves combining charts from step 2 by l/H ratios for given Za = ${za} and L/H = ${lh} and then interpolating for l/L = ${ll}.`;
    case 4:
      return `The step 4 involves combining charts from step 3 by h/H ratios for given Za = ${za} and L/H = ${lh} and l/L = ${ll} and then interpolating for h/H = ${hh}.`;
    default:
      return '';
  }
}
