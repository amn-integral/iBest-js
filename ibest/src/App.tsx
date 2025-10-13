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

type HistoryChartProps = {
  title: string;
  time: number[];
  values: number[];
  color: string;
  units: string;
  selectedIndex: number;
};

type AxisLimits = Record<"xMin" | "xMax" | "yMin" | "yMax", string>;

type BackboneChartProps = {
  curves: BackboneCurves;
  displacementHistory: number[];
  restoringForceHistory: number[];
  selectedIndex: number;
  axisLimits: AxisLimits;
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

const parseStrictNumber = (value: string) => {
  if (!value.trim()) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export function App() {
  const inboundIdRef = useRef(1);
  const reboundIdRef = useRef(1);
  const forceIdRef = useRef(1);

  const [massInput, setMassInput] = useState("10");
  const [dampingRatioInput, setDampingRatioInput] = useState("0.05");
  const [totalTimeInput, setTotalTimeInput] = useState("1.0");
  const [timeStepInput, setTimeStepInput] = useState("0.001");
  const [autoStep, setAutoStep] = useState(true);

  const [inboundRows, setInboundRows] = useState<BackboneRow[]>(() =>
    INITIAL_INBOUND_DATA.map((row) => ({
      ...row,
      id: inboundIdRef.current++,
    })),
  );
  const [reboundRows, setReboundRows] = useState<BackboneRow[]>(() =>
    INITIAL_REBOUND_DATA.map((row) => ({
      ...row,
      id: reboundIdRef.current++,
    })),
  );
  const [forceRows, setForceRows] = useState<ForceRow[]>(() =>
    INITIAL_FORCE_DATA.map((row) => ({
      ...row,
      id: forceIdRef.current++,
    })),
  );

  const mass = useMemo(
    () => parseStrictNumber(massInput) ?? Number.NaN,
    [massInput],
  );
  const dampingRatio = useMemo(
    () => parseStrictNumber(dampingRatioInput) ?? Number.NaN,
    [dampingRatioInput],
  );
  const totalTime = useMemo(
    () => parseStrictNumber(totalTimeInput) ?? Number.NaN,
    [totalTimeInput],
  );
  const timeStep = useMemo(
    () => parseStrictNumber(timeStepInput) ?? Number.NaN,
    [timeStepInput],
  );

  const createInboundRow = useCallback(
    () => ({
      id: inboundIdRef.current++,
      displacement: "",
      resistance: "",
      klm: "1",
    }),
    [],
  );

  const createReboundRow = useCallback(
    () => ({
      id: reboundIdRef.current++,
      displacement: "",
      resistance: "",
      klm: "1",
    }),
    [],
  );

  const createForceRow = useCallback(
    () => ({
      id: forceIdRef.current++,
      time: "",
      force: "",
    }),
    [],
  );

  const handleScalarChange = useCallback(
    (setter: (value: string) => void) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        setter(event.target.value);
      },
    [],
  );

  const handleAutoStepChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setAutoStep(event.target.checked);
    },
    [],
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
    [],
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
    [],
  );

  const [inboundValidRows, setInboundValidRows] = useState<BackboneNumeric[]>(
    [],
  );
  const [reboundValidRows, setReboundValidRows] = useState<BackboneNumeric[]>(
    [],
  );
  const [forceValidRows, setForceValidRows] = useState<ForceNumeric[]>([]);

  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<SolverSummary | null>(null);
  const [series, setSeries] = useState<SolverSeries | null>(null);
  const [backboneCurves, setBackboneCurves] = useState<BackboneCurves | null>(
    null,
  );

  const [playIndex, setPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [forceDisplacementLimits, setForceDisplacementLimits] = useState<AxisLimits>({
    xMin: "",
    xMax: "",
    yMin: "",
    yMax: "",
  });

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

  const handleAxisLimitChange = (
    key: keyof typeof forceDisplacementLimits,
    value: string,
  ) => {
    setForceDisplacementLimits((prev) => ({ ...prev, [key]: value }));
  };

  const backbonePreview = useMemo(() => {
    try {
      if (inboundValidRows.length >= 2 && reboundValidRows.length >= 2) {
        const previewCurve = new BackboneCurve(
          inboundValidRows,
          reboundValidRows,
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
      series.time.length - 1,
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
        Math.min(index, series.time.length ? series.time.length - 1 : 0),
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
        "Time step must be a positive number when automatic stepping is disabled.",
      );
    }

    if (inboundValidRows.length < 2) {
      validationErrors.push(
        "Inbound backbone must contain at least two valid points.",
      );
    }
    if (reboundValidRows.length < 2) {
      validationErrors.push(
        "Rebound backbone must contain at least two valid points.",
      );
    }
    if (forceValidRows.length < 2) {
      validationErrors.push(
        "Force history must contain at least two valid samples.",
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
        forceValidRows.map((sample) => sample.force),
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
        averageAcceleration,
      );
      const runtime = performance.now() - start;

      const maxDisplacement = Math.max(...response.displacement);
      const finalDisplacement =
        response.displacement[response.displacement.length - 1];

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
          Configure the generalized single-degree-of-freedom solver, review input
          previews, and inspect Newmark results with playback when ready.
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
                  Mass (kip·s²/in)
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
                  Total time (s)
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
                <span className="solver-inputs__label">Automatic time step</span>
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
                  Fixed time step (s)
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
                  <strong>{summary.maxDisplacement.toFixed(4)} in</strong>
                </div>
                <div className="summary-card">
                  <span>Final displacement</span>
                  <strong>{summary.finalDisplacement.toFixed(4)} in</strong>
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
                    <strong>{selection.time.toFixed(4)} s</strong>
                  </div>
                  <div>
                    <span>u</span>
                    <strong>{selection.displacement.toFixed(4)} in</strong>
                  </div>
                  <div>
                    <span>v</span>
                    <strong>{selection.velocity.toFixed(4)} in/s</strong>
                  </div>
                  <div>
                    <span>a</span>
                    <strong>{selection.acceleration.toFixed(4)} in/s^2</strong>
                  </div>
                  <div>
                    <span>Restoring</span>
                    <strong>{formatLimitValue(selection.restoringForce)}</strong>
                  </div>
                  <div>
                    <span>Applied</span>
                    <strong>{formatLimitValue(selection.appliedForce)}</strong>
                  </div>
                </div>
              ) : null}

              <div className="charts-grid">
                <HistoryChart
                  title="Displacement"
                  time={series.time}
                  values={series.displacement}
                  color="#2563eb"
                  units="in"
                  selectedIndex={playIndex}
                />
                <HistoryChart
                  title="Velocity"
                  time={series.time}
                  values={series.velocity}
                  color="#16a34a"
                  units="in/s"
                  selectedIndex={playIndex}
                />
                <HistoryChart
                  title="Acceleration"
                  time={series.time}
                  values={series.acceleration}
                  color="#f97316"
                  units="in/s^2"
                  selectedIndex={playIndex}
                />
                <HistoryChart
                  title="Applied force"
                  time={series.time}
                  values={series.appliedForce}
                  color="#7c3aed"
                  units=""
                  selectedIndex={playIndex}
                />
                <BackboneChart
                  curves={backboneCurves}
                  displacementHistory={series.displacement}
                  restoringForceHistory={series.restoringForce}
                  selectedIndex={playIndex}
                  axisLimits={forceDisplacementLimits}
                />
              </div>

              <div className="axis-controls">
                <h4>Force–displacement axis limits</h4>
                <div className="axis-controls-groups">
                  <div>
                    <label>
                      Disp min
                      <input
                        type="number"
                        step="any"
                        value={forceDisplacementLimits.xMin}
                        onChange={(event) =>
                          handleAxisLimitChange("xMin", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Disp max
                      <input
                        type="number"
                        step="any"
                        value={forceDisplacementLimits.xMax}
                        onChange={(event) =>
                          handleAxisLimitChange("xMax", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div>
                    <label>
                      Force min
                      <input
                        type="number"
                        step="any"
                        value={forceDisplacementLimits.yMin}
                        onChange={(event) =>
                          handleAxisLimitChange("yMin", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Force max
                      <input
                        type="number"
                        step="any"
                        value={forceDisplacementLimits.yMax}
                        onChange={(event) =>
                          handleAxisLimitChange("yMax", event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
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
                  axisLimits={forceDisplacementLimits}
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

function formatLimitValue(value: number): string {
  if (!Number.isFinite(value)) {
    return "0.000";
  }
  return Math.abs(value) < 1e-3 ? value.toExponential(2) : value.toFixed(3);
}

function HistoryChart({
  title,
  time,
  values,
  color,
  units,
  selectedIndex,
}: HistoryChartProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(640);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const nextWidth = Math.floor(entry.contentRect.width);
      if (nextWidth > 0) {
        setContainerWidth((prev) => {
          const clamped = Math.max(240, nextWidth);
          return Math.abs(prev - clamped) > 1 ? clamped : prev;
        });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const width = Math.max(320, containerWidth);
  const height = Math.max(160, Math.min(220, Math.round(width * 0.32)));

  const calcTickCount = (length: number, idealSpacing: number, min = 3, max = 8) => {
    const estimate = Math.max(min, Math.round(length / idealSpacing) + 1);
    return Math.max(min, Math.min(max, estimate));
  };
  const xTickCount = calcTickCount(width, 140);
  const yTickCount = calcTickCount(height, 60, 3, 7);

  const {
    path,
    minValue,
    maxValue,
    pointerX,
    pointerY,
    stepIndex,
    xTicks,
    yTicks,
  } = useMemo(() => {
    if (!time.length || !values.length || time.length !== values.length) {
      return {
        path: "",
        minValue: 0,
        maxValue: 0,
        pointerX: 0,
        pointerY: height / 2,
        stepIndex: 0,
        xTicks: [] as Array<{ x: number; label: string }>,
        yTicks: [] as Array<{ y: number; label: string }>,
      };
    }

    const minTime = time[0];
    const maxTime = time[time.length - 1];
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const spanTime = maxTime - minTime || 1;
    const spanVal = maxVal - minVal || 1;

    const commands: string[] = [];
    for (let index = 0; index < time.length; index += 1) {
      const ratioX = (time[index] - minTime) / spanTime;
      const ratioY = (values[index] - minVal) / spanVal;
      const x = ratioX * width;
      const y = height - ratioY * height;
      commands.push(`${index === 0 ? "M" : "L"}${x},${y}`);
    }

    const clampedIndex = Math.min(Math.max(selectedIndex, 0), time.length - 1);
    const pointerRatioX = (time[clampedIndex] - minTime) / spanTime;
    const pointerRatioY = (values[clampedIndex] - minVal) / spanVal;
    const pointerX = pointerRatioX * width;
    const pointerY = height - pointerRatioY * height;

    const xTicks: Array<{ x: number; label: string }> = [];
    const yTicks: Array<{ y: number; label: string }> = [];
    for (let i = 0; i < xTickCount; i += 1) {
      const t = minTime + (spanTime * i) / (xTickCount - 1);
      const ratio = (t - minTime) / spanTime;
      xTicks.push({
        x: ratio * width,
        label: spanTime === 0 ? minTime.toFixed(2) : t.toFixed(2),
      });
    }
    for (let i = 0; i < yTickCount; i += 1) {
      const v = minVal + (spanVal * i) / (yTickCount - 1);
      const ratio = (v - minVal) / spanVal;
      yTicks.push({
        y: height - ratio * height,
        label: spanVal === 0 ? minVal.toFixed(2) : v.toFixed(2),
      });
    }

    return {
      path: commands.join(" "),
      minValue: minVal,
      maxValue: maxVal,
      pointerX: Number.isFinite(pointerX) ? pointerX : 0,
      pointerY: Number.isFinite(pointerY) ? pointerY : height / 2,
      stepIndex: clampedIndex,
      xTicks,
      yTicks,
    };
  }, [height, time, values, selectedIndex, width, xTickCount, yTickCount]);

  if (!path) {
    return null;
  }

  return (
    <div className="chart-wrapper" ref={wrapperRef}>
      <div className="chart-header">
        <h4>
          {title} – Step {stepIndex}
        </h4>
        <span>
          min {minValue.toFixed(3)} {units} | max {maxValue.toFixed(3)} {units}
        </span>
      </div>
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${title} history`}
      >
        <rect width={width} height={height} fill="#f8fafc" rx={10} />
        <line x1={0} y1={height} x2={width} y2={height} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={0} y1={0} x2={0} y2={height} stroke="#cbd5e1" strokeWidth={1} />
        {xTicks.map((tick) => (
          <g key={tick.x} transform={`translate(${tick.x} ${height})`}>
            <line y1={0} y2={6} stroke="#94a3b8" strokeWidth={1} />
            <text y={18} fill="#1f2937" fontSize="12" textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}
        {yTicks.map((tick) => (
          <g key={tick.y} transform={`translate(0 ${tick.y})`}>
            <line x1={0} x2={-6} stroke="#94a3b8" strokeWidth={1} />
            <text x={-12} y={4} fill="#1f2937" fontSize="12" textAnchor="end">
              {tick.label}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth={2.5} />
        <line
          x1={pointerX}
          x2={pointerX}
          y1={0}
          y2={height}
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
        <circle cx={pointerX} cy={pointerY} r={5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
        <text className="axis-label axis-label--x" x={width / 2} y={height - 6}>
          Time (s)
        </text>
        <text
          className="axis-label axis-label--y"
          transform={`translate(14 ${height / 2}) rotate(-90)`}
        >
          {units ? `${title} (${units})` : title}
        </text>
      </svg>
    </div>
  );
}

function BackboneChart({
  curves,
  displacementHistory,
  restoringForceHistory,
  selectedIndex,
  axisLimits,
}: BackboneChartProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(640);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const nextWidth = Math.floor(entry.contentRect.width);
      if (nextWidth > 0) {
        setContainerWidth((prev) => {
          const clamped = Math.max(260, nextWidth);
          return Math.abs(prev - clamped) > 1 ? clamped : prev;
        });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const width = Math.max(320, containerWidth);
  const height = Math.max(170, Math.min(240, Math.round(width * 0.32)));

  const calcTickCount = (length: number, idealSpacing: number, min = 3, max = 8) => {
    const estimate = Math.max(min, Math.round(length / idealSpacing) + 1);
    return Math.max(min, Math.min(max, estimate));
  };
  const xTickCount = calcTickCount(width, 140);
  const yTickCount = calcTickCount(height, 60, 3, 7);

  const {
    initialPath,
    finalPath,
    hysteresisPath,
    minX,
    maxX,
    minY,
    maxY,
    pointerX,
    pointerY,
    stepIndex,
    xTicks,
    yTicks,
  } = useMemo(() => {
    if (!curves.initial.x.length || !curves.initial.y.length) {
      return {
        initialPath: "",
        finalPath: "",
        hysteresisPath: "",
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        pointerX: width / 2,
        pointerY: height / 2,
        stepIndex: 0,
        xTicks: [] as Array<{ x: number; label: string }>,
        yTicks: [] as Array<{ y: number; label: string }>,
      };
    }

    const allX = [
      ...curves.initial.x,
      ...curves.final.x,
      ...displacementHistory,
    ];
    const allY = [
      ...curves.initial.y,
      ...curves.final.y,
      ...restoringForceHistory,
    ];

    const autoMinX = Math.min(...allX);
    const autoMaxX = Math.max(...allX);
    const autoMinY = Math.min(...allY);
    const autoMaxY = Math.max(...allY);

    const limitXMin = parseStrictNumber(axisLimits.xMin);
    const limitXMax = parseStrictNumber(axisLimits.xMax);
    const limitYMin = parseStrictNumber(axisLimits.yMin);
    const limitYMax = parseStrictNumber(axisLimits.yMax);

    let minXValue = limitXMin ?? autoMinX;
    let maxXValue = limitXMax ?? autoMaxX;
    if (minXValue === maxXValue) {
      const delta = Math.abs(minXValue) || 1;
      minXValue -= delta * 0.5;
      maxXValue += delta * 0.5;
    } else if (minXValue > maxXValue) {
      [minXValue, maxXValue] = [maxXValue, minXValue];
    }

    let minYValue = limitYMin ?? autoMinY;
    let maxYValue = limitYMax ?? autoMaxY;
    if (minYValue === maxYValue) {
      const delta = Math.abs(minYValue) || 1;
      minYValue -= delta * 0.5;
      maxYValue += delta * 0.5;
    } else if (minYValue > maxYValue) {
      [minYValue, maxYValue] = [maxYValue, minYValue];
    }

    const spanX = maxXValue - minXValue || 1;
    const spanY = maxYValue - minYValue || 1;

    const toPath = (xs: number[], ys: number[]) => {
      if (!xs.length || xs.length !== ys.length) {
        return "";
      }
      const commands: string[] = [];
      for (let index = 0; index < xs.length; index += 1) {
        const ratioX = (xs[index] - minXValue) / spanX;
        const ratioY = (ys[index] - minYValue) / spanY;
        const x = ratioX * width;
        const y = height - ratioY * height;
        commands.push(`${index === 0 ? "M" : "L"}${x},${y}`);
      }
      return commands.join(" ");
    };

    const hasHistory =
      displacementHistory.length > 0 &&
      displacementHistory.length === restoringForceHistory.length;

    const clampedIndex = hasHistory
      ? Math.min(Math.max(selectedIndex, 0), displacementHistory.length - 1)
      : 0;

    const hysteresisPath = hasHistory
      ? toPath(
          displacementHistory.slice(0, clampedIndex + 1),
          restoringForceHistory.slice(0, clampedIndex + 1),
        )
      : "";

    let pointerCoordX: number;
    let pointerCoordY: number;

    if (hasHistory) {
      pointerCoordX =
        ((displacementHistory[clampedIndex] - minXValue) / spanX) * width;
      pointerCoordY =
        height -
        ((restoringForceHistory[clampedIndex] - minYValue) / spanY) * height;
    } else if (curves.final.x.length && curves.final.y.length) {
      const lastIndex = curves.final.x.length - 1;
      pointerCoordX =
        ((curves.final.x[lastIndex] - minXValue) / spanX) * width;
      pointerCoordY =
        height - ((curves.final.y[lastIndex] - minYValue) / spanY) * height;
    } else {
      pointerCoordX = width / 2;
      pointerCoordY = height / 2;
    }

    const xTicks: Array<{ x: number; label: string }> = [];
    const yTicks: Array<{ y: number; label: string }> = [];
    for (let i = 0; i < xTickCount; i += 1) {
      const value = minXValue + (spanX * i) / (xTickCount - 1);
      xTicks.push({
        x: ((value - minXValue) / spanX) * width,
        label: value.toFixed(2),
      });
    }
    for (let i = 0; i < yTickCount; i += 1) {
      const value = minYValue + (spanY * i) / (yTickCount - 1);
      yTicks.push({
        y: height - ((value - minYValue) / spanY) * height,
        label: value.toFixed(2),
      });
    }

    return {
      initialPath: toPath(curves.initial.x, curves.initial.y),
      finalPath: toPath(curves.final.x, curves.final.y),
      hysteresisPath,
      minX: minXValue,
      maxX: maxXValue,
      minY: minYValue,
      maxY: maxYValue,
      pointerX: Number.isFinite(pointerCoordX) ? pointerCoordX : width / 2,
      pointerY: Number.isFinite(pointerCoordY) ? pointerCoordY : height / 2,
      stepIndex: hasHistory ? clampedIndex : 0,
      xTicks,
      yTicks,
    };
  }, [
    axisLimits,
    curves,
    displacementHistory,
    height,
    restoringForceHistory,
    selectedIndex,
    width,
    xTickCount,
    yTickCount,
  ]);

  if (!initialPath && !finalPath && !hysteresisPath) {
    return null;
  }

  return (
    <div className="chart-wrapper" ref={wrapperRef}>
      <div className="chart-header">
        <h4>Hysteresis with Backbone – Step {stepIndex}</h4>
        <span>
          disp {formatLimitValue(minX)}..{formatLimitValue(maxX)} in | force {formatLimitValue(minY)}..{formatLimitValue(maxY)}
        </span>
      </div>
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Backbone curve comparison"
      >
        <rect width={width} height={height} fill="#f8fafc" rx={10} />
        <line x1={0} y1={height} x2={width} y2={height} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={0} y1={0} x2={0} y2={height} stroke="#cbd5e1" strokeWidth={1} />
        {xTicks.map((tick) => (
          <g key={tick.x} transform={`translate(${tick.x} ${height})`}>
            <line y1={0} y2={6} stroke="#94a3b8" strokeWidth={1} />
            <text y={18} fill="#1f2937" fontSize="12" textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}
        {yTicks.map((tick) => (
          <g key={tick.y} transform={`translate(0 ${tick.y})`}>
            <line x1={0} x2={-6} stroke="#94a3b8" strokeWidth={1} />
            <text x={-12} y={4} fill="#1f2937" fontSize="12" textAnchor="end">
              {tick.label}
            </text>
          </g>
        ))}
        {initialPath ? (
          <path
            d={initialPath}
            fill="none"
            stroke="#cbd5f5"
            strokeWidth={2}
            strokeDasharray="6 6"
          />
        ) : null}
        {finalPath ? (
          <path d={finalPath} fill="none" stroke="#2563eb" strokeWidth={2.5} />
        ) : null}
        {hysteresisPath ? (
          <path d={hysteresisPath} fill="none" stroke="#0f172a" strokeWidth={2.5} />
        ) : null}
        <line
          x1={pointerX}
          x2={pointerX}
          y1={0}
          y2={height}
          stroke="#0f172a"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          opacity={0.6}
        />
        <line
          x1={0}
          x2={width}
          y1={pointerY}
          y2={pointerY}
          stroke="#0f172a"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
        />
        <circle cx={pointerX} cy={pointerY} r={5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
        <g transform="translate(18 18)">
          <rect width="16" height="2" y="6" fill="#cbd5f5" />
          <text x="24" y="9" fontSize="11" fill="#475569">
            Original backbone
          </text>
          <rect width="16" height="2" y="22" fill="#2563eb" />
          <text x="24" y="25" fontSize="11" fill="#475569">
            Current backbone
          </text>
          <rect width="16" height="2" y="38" fill="#0f172a" />
          <text x="24" y="41" fontSize="11" fill="#475569">
            Hysteresis
          </text>
          <circle cx="8" cy="55" r="4" fill="#ef4444" />
          <text x="24" y="58" fontSize="11" fill="#475569">
            Current point
          </text>
        </g>
        <text className="axis-label axis-label--x" x={width / 2} y={height - 6}>
          Displacement (in)
        </text>
        <text
          className="axis-label axis-label--y"
          transform={`translate(14 ${height / 2}) rotate(-90)`}
        >
          Restoring force
        </text>
      </svg>
    </div>
  );
}






