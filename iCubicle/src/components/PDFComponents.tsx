/**
 * React components for PDF report generation
 */

import type { CubicleInputType, CubicleCalculatedParams } from '../api/types';
import styles from './PDFComponents.module.css';
import React from 'react';

interface HeaderProps {
  date?: Date;
}

export const PDFHeader: React.FC<HeaderProps> = ({ date = new Date() }) => {
  return (
    <div className={styles.title}>
      <h1>UFC 3-340-02 Cubicle Analysis Report</h1>
      <p className={styles.subtitle}>
        Generated {date.toLocaleDateString()} at {new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles' })}
      </p>
    </div>
  );
};

interface SummaryTableProps {
  results: Record<string, number>;
}

export const PDFSummaryTable: React.FC<SummaryTableProps> = ({ results }) => {
  return (
    <div>
      <h2 className={styles.sectionHeader}>Analysis Summary</h2>
      <table className={styles.table}>
        <thead className={styles.tableHeader}>
          <tr>
            <th className={styles.tableHeaderCell}>Parameter</th>
            <th className={styles.tableHeaderCell}>Value</th>
            <th className={styles.tableHeaderCell}>Units</th>
          </tr>
        </thead>
        <tbody>
          <tr className={styles.tableRow}>
            <td className={styles.tableCell}>
              <strong>Shock Pressure (Ps)</strong>
            </td>
            <td className={styles.tableCell}>{results.Ps?.toFixed(3)}</td>
            <td className={styles.tableCell}>psi</td>
          </tr>
          <tr className={styles.tableRowAlt}>
            <td className={styles.tableCell}>
              <strong>Shock Impulse (Is)</strong>
            </td>
            <td className={styles.tableCell}>{results.Is?.toFixed(3)}</td>
            <td className={styles.tableCell}>psi-ms</td>
          </tr>
          <tr className={styles.tableRow}>
            <td className={styles.tableCell}>
              <strong>Shock Duration (Ts)</strong>
            </td>
            <td className={styles.tableCell}>{results.Ts?.toFixed(3)}</td>
            <td className={styles.tableCell}>ms</td>
          </tr>
          <tr className={styles.tableRowAlt}>
            <td className={styles.tableCell}>
              <strong>Gas Pressure (Pg)</strong>
            </td>
            <td className={styles.tableCell}>{results.Pg?.toFixed(3)}</td>
            <td className={styles.tableCell}>psi</td>
          </tr>
          <tr className={styles.tableRow}>
            <td className={styles.tableCell}>
              <strong>Gas Impulse (Ig)</strong>
            </td>
            <td className={styles.tableCell}>{results.Ig?.toFixed(3)}</td>
            <td className={styles.tableCell}>psi-ms</td>
          </tr>
          <tr className={styles.tableRowAlt}>
            <td className={styles.tableCell}>
              <strong>Gas Duration (Tg)</strong>
            </td>
            <td className={styles.tableCell}>{results.Tg?.toFixed(3)}</td>
            <td className={styles.tableCell}>ms</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

interface StepHeaderProps {
  stepNum: number;
  description?: string;
}

export const PDFStepHeader: React.FC<StepHeaderProps> = ({ stepNum, description }) => {
  return (
    <div>
      <h2 className={styles.stepHeader}>Shock Pressure Analysis - Step {stepNum}</h2>
      <p className={styles.stepDescription}>{description}</p>
    </div>
  );
};

export const TableChargeGeometry: React.FC<CubicleInputType> = inputParams => {
  const rows = [
    { label: 'Charge Weight (W)', value: inputParams.W, unit: 'lbs' },
    { label: 'Cubicle Type', value: inputParams.cubicle_type, unit: '' },
    { label: 'Target Wall', value: inputParams.target_wall, unit: '' }
  ];

  return (
    <div>
      <h2 className={styles.sectionHeader}>Input Parameters</h2>
      <h3 className={styles.subsectionHeader}>Charge & Geometry</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHeaderCell}>Parameter</th>
            <th className={styles.tableHeaderCell}>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>
                {row.value.toString()}
                {row.unit ? ` ${row.unit}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const TableCubicleDimensions: React.FC<CubicleInputType> = inputParams => {
  const rows = [
    { label: 'Length (Lc)', value: inputParams.Lc, unit: 'ft' },
    { label: 'Width (Wc)', value: inputParams.Wc, unit: 'ft' },
    { label: 'Height (Hc)', value: inputParams.Hc, unit: 'ft' },
    { label: 'X Position', value: inputParams.X, unit: 'ft' },
    { label: 'Y Position', value: inputParams.Y, unit: 'ft' },
    { label: 'Z Position', value: inputParams.Z, unit: 'ft' }
  ];
  return (
    <div>
      <h3 className={styles.subsectionHeader}>Cubicle Dimensions</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
            <th>Units</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.value.toFixed(2)}</td>
              <td>{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const TableCalculatedProps: React.FC<CubicleCalculatedParams> = calculatedParams => {
  const rows = [
    { label: 'Standoff Distance (Ra)', value: calculatedParams.Ra, description: 'Distance from charge to target wall' },
    { label: 'Reflections (N)', value: calculatedParams.N, description: 'Number of shock reflections' },
    { label: 'Height Ratio (h/H)', value: calculatedParams.h_over_H, description: 'Target height to enclosure height' },
    { label: 'Length Ratio (l/L)', value: calculatedParams.l_over_L, description: 'Target length to enclosure length' },
    { label: 'Scaled Standoff (Za)', value: calculatedParams.Ra_over_W_cube_root, description: 'Ra/W^1/3' },
    { label: 'L/Ra Ratio', value: calculatedParams.L_over_Ra, description: 'Enclosure length to standoff' },
    { label: 'L/H Ratio', value: calculatedParams.L_over_H, description: 'Enclosure length to height' }
  ];
  return (
    <div>
      <h3 className={styles.subsectionHeader}>Calculated Geometry Parameters</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.value.toFixed(3)}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const SectionHeader: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className={styles.sectionHeader}>
      <h1>{title}</h1>
    </div>
  );
};

export const Paragraph: React.FC<{ text: string }> = ({ text }) => {
  return <p className={styles.paragraph}>{text}</p>;
};
