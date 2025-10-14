import React from "react";
import { HistoryChart, BackboneChart } from "@integralrsg/igraph";
import "./Report.css";

const integralLogo = "/integralLogo.svg";

function formatRuntimeLabel(runtimeMs: number): string {
  if (!Number.isFinite(runtimeMs)) {
    return "–";
  }
  if (runtimeMs >= 1000) {
    return `${(runtimeMs / 1000).toFixed(2)} s`;
  }
  if (runtimeMs >= 1) {
    return `${runtimeMs.toFixed(2)} ms`;
  }
  return `${(runtimeMs * 1000).toFixed(2)} μs`;
}

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

type SolverSummary = {
  maxDisplacement: number;
  finalDisplacement: number;
  runtimeMs: number;
  steps: number;
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
  series: SolverSeries | null;
  summary: SolverSummary | null;
  backboneCurves: BackboneCurves | null;
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
  summary,
  backboneCurves,
  backboneColumns,
  forceColumns,
}) => {
  return (
    <div className="report">
      <div className="report__inputs">
        <h2>Solver Inputs</h2>
        <div className="solver-inputs">
          <div className="solver-inputs__table">
            <div className="solver-inputs__row">
              <span className="solver-inputs__label">Mass</span>
              <span>{mass}</span>
            </div>
            <div className="solver-inputs__row">
              <span className="solver-inputs__label">Damping ratio</span>
              <span>{dampingRatio}</span>
            </div>
            <div className="solver-inputs__row">
              <span className="solver-inputs__label">Total time</span>
              <span>{totalTime}</span>
            </div>
            <div className="solver-inputs__row">
              <span className="solver-inputs__label">Time step</span>
              <span>{autoStep ? "Auto" : timeStep}</span>
            </div>
          </div>
        </div>

        <div className="table-section">
          <h3>Backbone (inbound)</h3>
          <table className="data-table">
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

        <div className="table-section">
          <h3>Backbone (rebound)</h3>
          <table className="data-table">
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

        <div className="table-section">
          <h3>Force history</h3>
          <table className="data-table">
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

      <div className="report__results">
        <h2>Results</h2>

        {summary && (
          <div className="summary-section">
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Max displacement:</span>
                <span className="summary-value">
                  {summary.maxDisplacement.toFixed(4)} in
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Final displacement:</span>
                <span className="summary-value">
                  {summary.finalDisplacement.toFixed(4)} in
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Steps:</span>
                <span className="summary-value">{summary.steps}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Runtime:</span>
                <span className="summary-value">
                  {formatRuntimeLabel(summary.runtimeMs)}
                </span>
              </div>
            </div>
          </div>
        )}

        {series && (
          <div className="charts-grid">
            <div className="chart-item">
              <HistoryChart
                title="Displacement"
                time={series.time}
                values={series.displacement}
                units="in"
                color="#3b82f6"
                selectedIndex={series.time.length - 1}
                logoUrl={integralLogo}
              />
            </div>
            <div className="chart-item">
              <HistoryChart
                title="Velocity"
                time={series.time}
                values={series.velocity}
                units="in/s"
                color="#16a34a"
                selectedIndex={series.time.length - 1}
                logoUrl={integralLogo}
              />
            </div>
            <div className="chart-item">
              <HistoryChart
                title="Acceleration"
                time={series.time}
                values={series.acceleration}
                units="in/s²"
                color="#f97316"
                selectedIndex={series.time.length - 1}
                logoUrl={integralLogo}
              />
            </div>
            {backboneCurves && (
              <div className="chart-item">
                <BackboneChart
                  curves={backboneCurves}
                  displacementHistory={series.displacement}
                  restoringForceHistory={series.restoringForce}
                  selectedIndex={series.time.length - 1}
                  logoUrl={integralLogo}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
