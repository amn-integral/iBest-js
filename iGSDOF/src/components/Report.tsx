import React from "react";
import { ReportChart } from "./ReportChart";
import styles from "./Report.module.css";

const integralLogo = "/integralLogo.svg";

type BackboneRow = {
  id: number;
  displacement: string;
  resistance: string;
  klm: string;
};

type ForceRow = {
  id: number;
  time: string;
  force: string;
};

type SolverSeries = {
  time: number[];
  displacement: number[];
  velocity: number[];
  acceleration: number[];
  restoringForce: number[];
  appliedForce: number[];
};

type BackboneCurves = {
  initial: { x: number[]; y: number[] };
  final: { x: number[]; y: number[] };
};

type ColumnConfig<K extends string> = {
  key: K;
  label: string;
  placeholder?: string;
  parser?: (value: string) => number | null;
  align?: "left" | "center" | "right";
  width?: number | string;
};

interface ReportProps {
  mass: string;
  dampingRatio: string;
  totalTime: string;
  timeStep: string;
  autoStep: boolean;
  inboundRows: BackboneRow[];
  reboundRows: BackboneRow[];
  forceRows: ForceRow[];
  series: SolverSeries;
  backboneCurves: BackboneCurves;
  backboneColumns: ColumnConfig<"displacement" | "resistance" | "klm">[];
  forceColumns: ColumnConfig<"time" | "force">[];
}

export const Report: React.FC<ReportProps> = ({
  mass,
  dampingRatio,
  totalTime,
  timeStep,
  autoStep,
  inboundRows,
  reboundRows,
  forceRows,
  series,
  backboneCurves,
  backboneColumns,
  forceColumns,
}) => {
  return (
    <div className={styles.report}>
      <div className={styles.reportInputs}>
        <h2>Solver Inputs</h2>
        <div className={styles.solverInputs}>
          <div className={styles.solverInputsTable}>
            <div className={styles.solverInputsRow}>
              <span className={styles.solverInputsLabel}>Mass</span>
              <span>{mass}</span>
            </div>
            <div className={styles.solverInputsRow}>
              <span className={styles.solverInputsLabel}>Damping ratio</span>
              <span>{dampingRatio}</span>
            </div>
            <div className={styles.solverInputsRow}>
              <span className={styles.solverInputsLabel}>Total time</span>
              <span>{totalTime}</span>
            </div>
            <div className={styles.solverInputsRow}>
              <span className={styles.solverInputsLabel}>Time step</span>
              <span>{autoStep ? "Auto" : timeStep}</span>
            </div>
          </div>
        </div>

        <div className={styles.tableSection}>
          <h3>Backbone (inbound)</h3>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                {backboneColumns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inboundRows.slice(0, 8).map((row) => (
                <tr key={row.id}>
                  {backboneColumns.map((col) => (
                    <td key={col.key}>{row[col.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableSection}>
          <h3>Backbone (rebound)</h3>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                {backboneColumns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reboundRows.slice(0, 8).map((row) => (
                <tr key={row.id}>
                  {backboneColumns.map((col) => (
                    <td key={col.key}>{row[col.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableSection}>
          <h3>Force history</h3>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                {forceColumns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forceRows.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  {forceColumns.map((col) => (
                    <td key={col.key}>{row[col.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.reportResults}>
        <h2>Results</h2>

        {series && (
          <div className={styles.chartsGrid}>
            <div className={styles.chartItem}>
              <ReportChart
                title="Displacement"
                data={[
                  {
                    legend: "Displacement (in)",
                    xValues: series.time,
                    yValues: series.displacement,
                  },
                ]}
                logoUrl={integralLogo}
                xLabel="Time (s)"
                yLabel="Displacement (in)"
              />
            </div>
            <div className={styles.chartItem}>
              <ReportChart
                title="Velocity"
                data={[
                  {
                    legend: "Velocity",
                    xValues: series.time,
                    yValues: series.velocity,
                    color: "#16a34a",
                  },
                ]}
                logoUrl={integralLogo}
                xLabel="Time (s)"
                yLabel="Velocity (in/s)"
              />
            </div>
            <div className={styles.chartItem}>
              <ReportChart
                title="Acceleration"
                data={[
                  {
                    legend: "Acceleration",
                    xValues: series.time,
                    yValues: series.acceleration,
                    color: "#f97316",
                  },
                ]}
                logoUrl={integralLogo}
                xLabel="Time (s)"
                yLabel="Acceleration (in/s²)"
              />
            </div>
            <div className={styles.chartItem}>
              <ReportChart
                title="Hysteresis"
                data={[
                  {
                    legend: "Backbone Curve",
                    xValues: backboneCurves?.initial.x,
                    yValues: backboneCurves?.initial.y,
                    color: "#89878bff",
                    lineStyle: "dashed",
                  },
                  {
                    legend: "Force vs. Displacement",
                    xValues: series.displacement,
                    yValues: series.restoringForce,
                    color: "#080808ff",
                  },
                ]}
                logoUrl={integralLogo}
                xLabel="Displacement (in)"
                yLabel="Restoring Force (kips)"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
