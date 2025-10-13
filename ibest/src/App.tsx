import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  BackboneCurve,
  ForceCurve,
  newmarkSolver,
  averageAcceleration,
} from "@integralrsg/imath";
import {
  HistoryChart,
  BackboneChart,
  parseStrictNumber,
  formatLimitValue,
} from "@integralrsg/igraph";
const integralLogo = "/integralLogo.svg";

import { EditableGrid } from "./components/EditableGrid";
import type { ColumnConfig } from "./components/EditableGrid";
import "./App.css";

type BackboneRow = {
  id: number;
  displacement: string;
  resistance: string;
  klm: string;
};

type BackboneNumeric = {
  displacement: number;
  resistance: number;
  klm: number;
};

type ForceRow = {
  id: number;
  time: string;
  force: string;
};

type ForceNumeric = {
  time: number;
  force: number;
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

const INITIAL_INBOUND_DATA: Array<Omit<BackboneRow, "id">> = [
  { displacement: "0.75", resistance: "7.5", klm: "1" },
  { displacement: "10", resistance: "7.5", klm: "1" },
];

const INITIAL_REBOUND_DATA: Array<Omit<BackboneRow, "id">> = [
  { displacement: "-0.75", resistance: "-7.5", klm: "1" },
  { displacement: "-10", resistance: "-7.5", klm: "1" },
];

const INITIAL_FORCE_DATA: Array<Omit<ForceRow, "id">> = [
  { time: "0.0", force: "0.0" },
  { time: "0.1", force: "5.0" },
  { time: "0.2", force: "8.66" },
  { time: "0.3", force: "10.0" },
  { time: "0.4", force: "8.66" },
  { time: "0.5", force: "5.0" },
  { time: "0.6", force: "0.0" },
  { time: "0.7", force: "0.0" },
  { time: "0.8", force: "0.0" },
  { time: "0.9", force: "0.0" },
  { time: "1.0", force: "0.0" },
];

export function App() {
  const inboundIdRef = useRef(1);
  const reboundIdRef = useRef(1);
  const forceIdRef = useRef(1);

  const [massInput, setMassInput] = useState("0.2553");
  const [dampingRatioInput, setDampingRatioInput] = useState("0.05");
  const [totalTimeInput, setTotalTimeInput] = useState("1.0");
  const [timeStepInput, setTimeStepInput] = useState("0.1");
  const [autoStep, setAutoStep] = useState(false);

  const [inboundRows, setInboundRows] = useState<BackboneRow[]>(() =>
    INITIAL_INBOUND_DATA.map((row) => ({
      ...row,
      id: inboundIdRef.current++,
    }))
  );
  const [reboundRows, setReboundRows] = useState<BackboneRow[]>(() =>
    INITIAL_REBOUND_DATA.map((row) => ({
      ...row,
      id: reboundIdRef.current++,
    }))
  );
  const [forceRows, setForceRows] = useState<ForceRow[]>(() =>
    INITIAL_FORCE_DATA.map((row) => ({
      ...row,
      id: forceIdRef.current++,
    }))
  );

  const mass = useMemo(
    () => parseStrictNumber(massInput) ?? Number.NaN,
    [massInput]
  );
  const dampingRatio = useMemo(
    () => parseStrictNumber(dampingRatioInput) ?? Number.NaN,
    [dampingRatioInput]
  );
  const totalTime = useMemo(
    () => parseStrictNumber(totalTimeInput) ?? Number.NaN,
    [totalTimeInput]
  );
  const timeStep = useMemo(
    () => parseStrictNumber(timeStepInput) ?? Number.NaN,
    [timeStepInput]
  );

  const createInboundRow = useCallback(
    () => ({
      id: inboundIdRef.current++,
      displacement: "",
      resistance: "",
      klm: "1",
    }),
    []
  );

  const createReboundRow = useCallback(
    () => ({
      id: reboundIdRef.current++,
      displacement: "",
      resistance: "",
      klm: "1",
    }),
    []
  );

  const createForceRow = useCallback(
    () => ({
      id: forceIdRef.current++,
      time: "",
      force: "",
    }),
    []
  );

  const handleScalarChange = useCallback(
    (setter: (value: string) => void) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        setter(event.target.value);
      },
    []
  );

  const handleAutoStepChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setAutoStep(event.target.checked);
    },
    []
  );

  const backboneColumns = useMemo<
    ColumnConfig<"displacement" | "resistance" | "klm">[]
  >(
    () => [
      {
        key: "displacement",
        label: "Displacement",
        placeholder: "0.00",
        parser: parseStrictNumber,
      },
      {
        key: "resistance",
        label: "Force",
        placeholder: "0.00",
        parser: parseStrictNumber,
      },
      {
        key: "klm",
        label: "k_lm",
        placeholder: "1.0",
        parser: parseStrictNumber,
      },
    ],
    []
  );

  const forceColumns = useMemo<ColumnConfig<"time" | "force">[]>(
    () => [
      {
        key: "time",
        label: "Time (s)",
        placeholder: "0.00",
        parser: parseStrictNumber,
      },
      {
        key: "force",
        label: "Force",
        placeholder: "0.00",
        parser: parseStrictNumber,
      },
    ],
    []
  );

  const [inboundValidRows, setInboundValidRows] = useState<BackboneNumeric[]>(
    []
  );
  const [reboundValidRows, setReboundValidRows] = useState<BackboneNumeric[]>(
    []
  );
  const [forceValidRows, setForceValidRows] = useState<ForceNumeric[]>([]);

  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<SolverSummary | null>(null);
  const [series, setSeries] = useState<SolverSeries | null>(null);
  const [backboneCurves, setBackboneCurves] = useState<BackboneCurves | null>(
    null
  );

  const [playIndex, setPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddInboundRow = () => {
    setInboundRows((prev) => [...prev, createInboundRow()]);
  };

  const handleAddReboundRow = () => {
    setReboundRows((prev) => [...prev, createReboundRow()]);
  };

  const handleAddForceRow = () => {
    setForceRows((prev) => [...prev, createForceRow()]);
  };

  const handleForceCsvImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));

      if (!rows.length) {
        setErrors(["CSV file is empty."]);
        event.target.value = "";
        return;
      }

      const parsed: ForceRow[] = [];
      let parseError: string | null = null;

      rows.forEach((row, index) => {
        if (parseError) {
          return;
        }

        const parts = row.split(/,|;|\t/).map((part) => part.trim());
        if (parts.length < 2) {
          parseError = `Row ${index + 1}: expected at least two columns (time, force).`;
          return;
        }

        const time = Number(parts[0]);
        const force = Number(parts[1]);
        if (!Number.isFinite(time) || !Number.isFinite(force)) {
          parseError = `Row ${index + 1}: time and force must be numeric.`;
          return;
        }

        parsed.push({
          id: forceIdRef.current++,
          time: String(time),
          force: String(force),
        });
      });

      if (parseError) {
        setErrors([parseError]);
        event.target.value = "";
        return;
      }

      if (parsed.length < 2) {
        setErrors(["CSV must contain at least two samples."]);
        event.target.value = "";
        return;
      }

      setForceRows(parsed);
      setErrors([]);
      event.target.value = "";
    };

    reader.readAsText(file);
  };

  const copyForceTable = useCallback(async () => {
    const text = forceRows
      .map((row) => forceColumns.map((column) => row[column.key]).join("\t"))
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }, [forceRows, forceColumns]);

  const backbonePreview = useMemo(() => {
    try {
      if (inboundValidRows.length >= 2 && reboundValidRows.length >= 2) {
        const previewCurve = new BackboneCurve(
          inboundValidRows,
          reboundValidRows
        );
        return {
          initial: {
            x: [...previewCurve.xValues],
            y: [...previewCurve.yValues],
          },
          final: {
            x: [...previewCurve.xValues],
            y: [...previewCurve.yValues],
          },
        };
      }
    } catch {
      // ignore preview errors
    }
    return null;
  }, [inboundValidRows, reboundValidRows]);

  const forcePreviewSeries = useMemo(() => {
    if (forceValidRows.length >= 2) {
      return {
        time: forceValidRows.map((row) => row.time),
        values: forceValidRows.map((row) => row.force),
      };
    }
    return null;
  }, [forceValidRows]);

  const selection = useMemo(() => {
    if (!series || series.time.length === 0) {
      return null;
    }
    const clampedIndex = Math.min(
      Math.max(playIndex, 0),
      series.time.length - 1
    );
    return {
      index: clampedIndex,
      time: series.time[clampedIndex],
      displacement: series.displacement[clampedIndex],
      velocity: series.velocity[clampedIndex],
      acceleration: series.acceleration[clampedIndex],
      restoringForce: series.restoringForce[clampedIndex],
      appliedForce: series.appliedForce[clampedIndex],
    };
  }, [series, playIndex]);

  useEffect(() => {
    if (!isPlaying || !series) {
      return;
    }
    if (playIndex >= series.time.length - 1) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = playIndex + 1;
    const dt =
      series.time[nextIndex] - series.time[playIndex] <= 0
        ? 0.016
        : series.time[nextIndex] - series.time[playIndex];
    const delay = Math.max((dt / playbackSpeed) * 1000, 16);
    const timeout = window.setTimeout(() => {
      setPlayIndex(nextIndex);
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [isPlaying, playIndex, playbackSpeed, series]);

  useEffect(() => {
    if (!series) {
      setPlayIndex(0);
      setIsPlaying(false);
    } else {
      setPlayIndex((index) =>
        Math.min(index, series.time.length ? series.time.length - 1 : 0)
      );
    }
  }, [series]);

  const runSolver = () => {
    const validationErrors: string[] = [];

    if (!Number.isFinite(mass) || mass <= 0) {
      validationErrors.push("Mass must be a positive number.");
    }
    if (!Number.isFinite(dampingRatio) || dampingRatio < 0) {
      validationErrors.push("Damping ratio must be a non-negative number.");
    }
    if (!Number.isFinite(totalTime) || totalTime <= 0) {
      validationErrors.push("Total time must be greater than zero.");
    }
    if (!autoStep && (!Number.isFinite(timeStep) || timeStep <= 0)) {
      validationErrors.push(
        "Time step must be a positive number when automatic stepping is disabled."
      );
    }

    if (inboundValidRows.length < 2) {
      validationErrors.push(
        "Inbound backbone must contain at least two valid points."
      );
    }
    if (reboundValidRows.length < 2) {
      validationErrors.push(
        "Rebound backbone must contain at least two valid points."
      );
    }
    if (forceValidRows.length < 2) {
      validationErrors.push(
        "Force history must contain at least two valid samples."
      );
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setSummary(null);
      setSeries(null);
      setBackboneCurves(null);
      setIsPlaying(false);
      return;
    }

    try {
      const backbone = new BackboneCurve(inboundValidRows, reboundValidRows);
      const initialCurve = {
        x: [...backbone.xValues],
        y: [...backbone.yValues],
      };
      const force = new ForceCurve(
        forceValidRows.map((sample) => sample.time),
        forceValidRows.map((sample) => sample.force)
      );

      const start = performance.now();
      const response = newmarkSolver(
        mass,
        backbone,
        dampingRatio,
        force,
        { u0: 0, v0: 0 },
        autoStep
          ? { t: totalTime, auto: true }
          : { t: totalTime, dt: timeStep, auto: false },
        averageAcceleration
      );
      const runtime = performance.now() - start;

      const maxDisplacement = Math.max(...response.displacement);
      const finalDisplacement =
        response.displacement[response.displacement.length - 1];

      // Print all the results to the console for now
      console.log("Time (s):", response.time);
      console.log("Displacement:", response.displacement);

      setSummary({
        maxDisplacement,
        finalDisplacement,
        runtimeMs: runtime,
        steps: response.time.length,
      });
      setSeries({
        time: response.time,
        displacement: response.displacement,
        velocity: response.velocity,
        acceleration: response.acceleration,
        restoringForce: response.restoringForce,
        appliedForce: response.appliedForce,
      });
      setBackboneCurves({
        initial: initialCurve,
        final: {
          x: [...backbone.xValues],
          y: [...backbone.yValues],
        },
      });
      setErrors([]);
      setPlayIndex(0);
      setIsPlaying(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run solver.";
      setErrors([message]);
      setSummary(null);
      setSeries(null);
      setBackboneCurves(null);
      setIsPlaying(false);
    }
  };

  const inboundToolbar = (
    <button
      type="button"
      className="secondary-button"
      onClick={handleAddInboundRow}
    >
      + Add row
    </button>
  );

  const reboundToolbar = (
    <button
      type="button"
      className="secondary-button"
      onClick={handleAddReboundRow}
    >
      + Add row
    </button>
  );

  const forceToolbar = (
    <>
      <button
        type="button"
        className="secondary-button"
        onClick={handleAddForceRow}
      >
        + Add row
      </button>
      <button
        type="button"
        className="secondary-button"
        onClick={() => fileInputRef.current?.click()}
      >
        Import CSV
      </button>
      <button
        type="button"
        className="secondary-button"
        onClick={copyForceTable}
      >
        Copy table
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={handleForceCsvImport}
      />
    </>
  );

  return (
    <div className="layout">
      <header className="layout__header">
        <h1>iGSDOF Front End</h1>
        <p>
          Configure the generalized single-degree-of-freedom solver, review
          input previews, and inspect Newmark results with playback when ready.
        </p>
      </header>

      <main className="layout__content">
        <div className="panel panel--form">
          <h2>Solver Inputs</h2>

          <section className="solver-inputs">
            <h3 className="solver-inputs__heading">System parameters</h3>
            <div className="solver-inputs__table">
              <div className="solver-inputs__row">
                <label className="solver-inputs__label" htmlFor="solver-mass">
                  Mass
                </label>
                <input
                  id="solver-mass"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  className="solver-inputs__input"
                  value={massInput}
                  onChange={handleScalarChange(setMassInput)}
                />
              </div>
              <div className="solver-inputs__row">
                <label
                  className="solver-inputs__label"
                  htmlFor="solver-damping-ratio"
                >
                  Damping ratio
                </label>
                <input
                  id="solver-damping-ratio"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className="solver-inputs__input"
                  value={dampingRatioInput}
                  onChange={handleScalarChange(setDampingRatioInput)}
                />
              </div>
              <div className="solver-inputs__row">
                <label
                  className="solver-inputs__label"
                  htmlFor="solver-total-time"
                >
                  Total time
                </label>
                <input
                  id="solver-total-time"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className="solver-inputs__input"
                  value={totalTimeInput}
                  onChange={handleScalarChange(setTotalTimeInput)}
                />
              </div>
              <div className="solver-inputs__row solver-inputs__row--toggle">
                <span className="solver-inputs__label">
                  Automatic time step
                </span>
                <label className="solver-inputs__toggle">
                  <input
                    type="checkbox"
                    checked={autoStep}
                    onChange={handleAutoStepChange}
                  />
                  <span className="solver-inputs__toggle-slider" />
                </label>
              </div>
              <div className="solver-inputs__row">
                <label
                  className="solver-inputs__label"
                  htmlFor="solver-time-step"
                >
                  Fixed time step
                </label>
                <input
                  id="solver-time-step"
                  type="number"
                  inputMode="decimal"
                  step="0.0001"
                  min="0"
                  className="solver-inputs__input"
                  value={timeStepInput}
                  onChange={handleScalarChange(setTimeStepInput)}
                  disabled={autoStep}
                />
              </div>
            </div>
          </section>

          <EditableGrid
            title="Backbone (inbound)"
            columns={backboneColumns}
            rows={inboundRows}
            onRowsChange={setInboundRows}
            createRow={createInboundRow}
            onValidatedRows={setInboundValidRows}
            toolbar={inboundToolbar}
            maxHeight={240}
          />

          <EditableGrid
            title="Backbone (rebound)"
            columns={backboneColumns}
            rows={reboundRows}
            onRowsChange={setReboundRows}
            createRow={createReboundRow}
            onValidatedRows={setReboundValidRows}
            toolbar={reboundToolbar}
            maxHeight={240}
          />

          <EditableGrid
            title="Force history"
            columns={forceColumns}
            rows={forceRows}
            onRowsChange={setForceRows}
            createRow={createForceRow}
            onValidatedRows={setForceValidRows}
            toolbar={forceToolbar}
            maxHeight={280}
          />

          <button type="button" className="solve-button" onClick={runSolver}>
            Run GSDOF Solver
          </button>

          {errors.length > 0 ? (
            <ul className="error-list">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="panel panel--results">
          <h2>Results</h2>
          {summary && series && backboneCurves ? (
            <>
              <div className="summary-grid">
                <div className="summary-card">
                  <span>Max displacement</span>
                  <strong>{summary.maxDisplacement.toFixed(4)}</strong>
                </div>
                <div className="summary-card">
                  <span>Final displacement</span>
                  <strong>{summary.finalDisplacement.toFixed(4)}</strong>
                </div>
                <div className="summary-card">
                  <span>Runtime</span>
                  <strong>{formatRuntimeLabel(summary.runtimeMs)}</strong>
                </div>
                <div className="summary-card">
                  <span>Steps</span>
                  <strong>{summary.steps}</strong>
                </div>
              </div>

              <div className="playback-controls">
                <button
                  type="button"
                  className="playback-button"
                  onClick={() => setIsPlaying((playing) => !playing)}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <input
                  type="range"
                  min={0}
                  max={series.time.length - 1}
                  value={Math.min(playIndex, series.time.length - 1)}
                  onChange={(event) => {
                    setPlayIndex(Number(event.target.value));
                    setIsPlaying(false);
                  }}
                />
                <label className="speed-select">
                  Speed
                  <select
                    value={playbackSpeed}
                    onChange={(event) =>
                      setPlaybackSpeed(Number(event.target.value))
                    }
                  >
                    <option value={0.25}>0.25×</option>
                    <option value={0.5}>0.5×</option>
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={4}>4×</option>
                  </select>
                </label>
              </div>

              {selection ? (
                <div className="sample-readout">
                  <div>
                    <span>t</span>
                    <strong>{selection.time.toFixed(4)}</strong>
                  </div>
                  <div>
                    <span>u</span>
                    <strong>{selection.displacement.toFixed(4)}</strong>
                  </div>
                  <div>
                    <span>v</span>
                    <strong>{selection.velocity.toFixed(4)}</strong>
                  </div>
                  <div>
                    <span>a</span>
                    <strong>{selection.acceleration.toFixed(4)}</strong>
                  </div>
                  <div>
                    <span>Restoring</span>
                    <strong>
                      {formatLimitValue(selection.restoringForce)}
                    </strong>
                  </div>
                  <div>
                    <span>Applied</span>
                    <strong>{formatLimitValue(selection.appliedForce)}</strong>
                  </div>
                </div>
              ) : null}

              <div className="charts-grid">
                {series && (
                  <>
                    <HistoryChart
                      title="Displacement"
                      time={series.time}
                      values={series.displacement}
                      color="#3b82f6"
                      units="in"
                      selectedIndex={selection?.index ?? 0}
                      logoUrl={integralLogo}
                    />
                    <HistoryChart
                      title="Velocity"
                      time={series.time}
                      values={series.velocity}
                      color="#16a34a"
                      units="in/s"
                      selectedIndex={selection?.index ?? 0}
                      logoUrl={integralLogo}
                    />
                    <HistoryChart
                      title="Acceleration"
                      time={series.time}
                      values={series.acceleration}
                      color="#f97316"
                      units="in/s²"
                      selectedIndex={selection?.index ?? 0}
                      logoUrl={integralLogo}
                    />
                  </>
                )}
                {backboneCurves && (
                  <BackboneChart
                    curves={backboneCurves}
                    displacementHistory={series?.displacement ?? []}
                    restoringForceHistory={series?.restoringForce ?? []}
                    selectedIndex={selection?.index ?? 0}
                    logoUrl={integralLogo}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="preview-grid">
              {backbonePreview ? (
                <BackboneChart
                  curves={backbonePreview}
                  displacementHistory={[]}
                  restoringForceHistory={[]}
                  selectedIndex={0}
                />
              ) : (
                <div className="preview-placeholder">
                  Provide at least two inbound and two rebound points to preview
                  the backbone curve.
                </div>
              )}
              {forcePreviewSeries ? (
                <HistoryChart
                  title="Force preview"
                  time={forcePreviewSeries.time}
                  values={forcePreviewSeries.values}
                  color="#0ea5e9"
                  units=""
                  selectedIndex={forcePreviewSeries.time.length - 1}
                />
              ) : (
                <div className="preview-placeholder">
                  Provide at least two time-force samples to preview the force
                  history.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

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
  return `${(runtimeMs * 1000).toFixed(2)} us`;
}
