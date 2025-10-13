import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  BackboneCurve,
  ForceCurve,
  newmarkSolver,
  averageAcceleration,
} from "@integralrsg/imath";

import "./App.css";

type BackbonePointForm = {
  id: number;
  displacement: string;
  resistance: string;
  klm: string;
};

type ForcePointForm = {
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

type HistoryChartProps = {
  title: string;
  time: number[];
  values: number[];
  color: string;
  units: string;
  selectedIndex: number;
};

type BackboneCurves = {
  initial: { x: number[]; y: number[] };
  final: { x: number[]; y: number[] };
};

type BackboneChartProps = {
  curves: BackboneCurves;
  displacementHistory: number[];
  restoringForceHistory: number[];
  selectedIndex: number;
  axisLimits: {
    xMin: string;
    xMax: string;
    yMin: string;
    yMax: string;
  };
};

type BackboneSetter = Dispatch<SetStateAction<BackbonePointForm[]>>;

const INITIAL_INBOUND: BackbonePointForm[] = [
  { id: 1, displacement: "0.75", resistance: "7.5", klm: "1" },
  { id: 2, displacement: "10", resistance: "7.5", klm: "1" },
];

const INITIAL_REBOUND: BackbonePointForm[] = [
  { id: 3, displacement: "-0.75", resistance: "-7.5", klm: "1" },
  { id: 4, displacement: "-10", resistance: "-7.5", klm: "1" },
];

const INITIAL_FORCE: ForcePointForm[] = [
  { id: 1, time: "0.0", force: "0.0" },
  { id: 2, time: "0.1", force: "5.0" },
  { id: 3, time: "0.2", force: "8.66" },
  { id: 4, time: "0.3", force: "10.0" },
  { id: 5, time: "0.4", force: "8.66" },
  { id: 6, time: "0.5", force: "5.0" },
  { id: 7, time: "0.6", force: "0.0" },
  { id: 8, time: "0.7", force: "0.0" },
  { id: 9, time: "0.8", force: "0.0" },
  { id: 10, time: "0.9", force: "0.0" },
  { id: 11, time: "1.0", force: "0.0" },
];

export function App() {
  const [mass, setMass] = useState(0.2553);
  const [dampingRatio, setDampingRatio] = useState(0.05);
  const [totalTime, setTotalTime] = useState(1);
  const [timeStep, setTimeStep] = useState(0.1);
  const [autoStep, setAutoStep] = useState(false);

  const [inboundPoints, setInboundPoints] =
    useState<BackbonePointForm[]>(INITIAL_INBOUND);
  const [reboundPoints, setReboundPoints] =
    useState<BackbonePointForm[]>(INITIAL_REBOUND);
  const [forcePoints, setForcePoints] =
    useState<ForcePointForm[]>(INITIAL_FORCE);

  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<SolverSummary | null>(null);
  const [series, setSeries] = useState<SolverSeries | null>(null);
  const [backboneCurves, setBackboneCurves] = useState<BackboneCurves | null>(
    null,
  );

  const [playIndex, setPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [forceDisplacementLimits, setForceDisplacementLimits] = useState({
    xMin: "",
    xMax: "",
    yMin: "",
    yMax: "",
  });

  const idRef = useRef(1000);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const nextId = () => {
    idRef.current += 1;
    return idRef.current;
  };

  const handleBackboneChange = (
    setFn: BackboneSetter,
    id: number,
    key: keyof BackbonePointForm,
    value: string,
  ) => {
    setFn((prev) =>
      prev.map((point) =>
        point.id === id ? { ...point, [key]: value } : point,
      ),
    );
  };

  const addBackbonePoint = (
    setFn: BackboneSetter,
    template: Partial<BackbonePointForm> = {},
  ) => {
    setFn((prev) => [
      ...prev,
      {
        id: nextId(),
        displacement: template.displacement ?? "",
        resistance: template.resistance ?? "",
        klm: template.klm ?? "1",
      },
    ]);
  };

  const removeBackbonePoint = (setFn: BackboneSetter, id: number) => {
    setFn((prev) => prev.filter((point) => point.id !== id));
  };

  const handleForceChange = (
    id: number,
    key: keyof ForcePointForm,
    value: string,
  ) => {
    setForcePoints((prev) =>
      prev.map((point) =>
        point.id === id ? { ...point, [key]: value } : point,
      ),
    );
  };

  const addForcePoint = () => {
    setForcePoints((prev) => [
      ...prev,
      {
        id: nextId(),
        time:
          prev.length > 0
            ? (Number(prev[prev.length - 1].time) + 0.1).toFixed(2)
            : "0.0",
        force: "0.0",
      },
    ]);
  };

  const removeForcePoint = (id: number) => {
    setForcePoints((prev) => prev.filter((point) => point.id !== id));
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

      const parsed: ForcePointForm[] = [];
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
          id: nextId(),
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

      setForcePoints(parsed.sort((a, b) => Number(a.time) - Number(b.time)));
      setErrors([]);
      event.target.value = "";
    };

    reader.readAsText(file);
  };

  const handleAxisLimitChange = (
    key: keyof typeof forceDisplacementLimits,
    value: string,
  ) => {
    setForceDisplacementLimits((prev) => ({ ...prev, [key]: value }));
  };

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
    if (inboundPoints.length < 2) {
      validationErrors.push("Inbound backbone must contain at least two points.");
    }
    if (reboundPoints.length < 2) {
      validationErrors.push("Rebound backbone must contain at least two points.");
    }
    if (forcePoints.length < 2) {
      validationErrors.push("Force history must contain at least two samples.");
    }

    const inboundParsed = inboundPoints.map((point, index) => {
      const displacement = Number(point.displacement);
      const resistance = Number(point.resistance);
      const klm = Number(point.klm);
      if (!Number.isFinite(displacement)) {
        validationErrors.push(
          `Inbound point ${index + 1}: displacement must be numeric.`,
        );
      }
      if (!Number.isFinite(resistance)) {
        validationErrors.push(
          `Inbound point ${index + 1}: resistance must be numeric.`,
        );
      }
      if (!Number.isFinite(klm) || klm <= 0) {
        validationErrors.push(
          `Inbound point ${index + 1}: klm must be a positive number.`,
        );
      }
      return { displacement, resistance, klm };
    });

    const reboundParsed = reboundPoints.map((point, index) => {
      const displacement = Number(point.displacement);
      const resistance = Number(point.resistance);
      const klm = Number(point.klm);
      if (!Number.isFinite(displacement)) {
        validationErrors.push(
          `Rebound point ${index + 1}: displacement must be numeric.`,
        );
      }
      if (!Number.isFinite(resistance)) {
        validationErrors.push(
          `Rebound point ${index + 1}: resistance must be numeric.`,
        );
      }
      if (!Number.isFinite(klm) || klm <= 0) {
        validationErrors.push(
          `Rebound point ${index + 1}: klm must be a positive number.`,
        );
      }
      return { displacement, resistance, klm };
    });

    const inboundSorted = [...inboundParsed].sort(
      (a, b) => a.displacement - b.displacement,
    );
    const reboundSorted = [...reboundParsed].sort(
      (a, b) => a.displacement - b.displacement,
    );

    for (let i = 1; i < inboundSorted.length; i += 1) {
      if (inboundSorted[i].displacement === inboundSorted[i - 1].displacement) {
        validationErrors.push("Inbound backbone displacements must be unique.");
        break;
      }
    }
    for (let i = 1; i < reboundSorted.length; i += 1) {
      if (reboundSorted[i].displacement === reboundSorted[i - 1].displacement) {
        validationErrors.push("Rebound backbone displacements must be unique.");
        break;
      }
    }

    const forceParsed = forcePoints.map((point, index) => {
      const time = Number(point.time);
      const force = Number(point.force);
      if (!Number.isFinite(time)) {
        validationErrors.push(`Force sample ${index + 1}: time must be numeric.`);
      }
      if (!Number.isFinite(force)) {
        validationErrors.push(`Force sample ${index + 1}: force must be numeric.`);
      }
      return { time, force };
    });

    const forceSorted = [...forceParsed].sort((a, b) => a.time - b.time);
    for (let i = 1; i < forceSorted.length; i += 1) {
      if (forceSorted[i].time === forceSorted[i - 1].time) {
        validationErrors.push("Force sample times must be unique.");
        break;
      }
      if (forceSorted[i].time <= forceSorted[i - 1].time) {
        validationErrors.push("Force sample times must increase monotonically.");
        break;
      }
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
      const backbone = new BackboneCurve(inboundSorted, reboundSorted);
      const initialCurve = {
        x: [...backbone.xValues],
        y: [...backbone.yValues],
      };
      const force = new ForceCurve(
        forceSorted.map((sample) => sample.time),
        forceSorted.map((sample) => sample.force),
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

  const selection = useMemo(() => {
    if (!series || series.time.length === 0 || playIndex >= series.time.length) {
      return null;
    }
    const clamped = Math.max(Math.min(playIndex, series.time.length - 1), 0);
    return {
      index: clamped,
      time: series.time[clamped],
      displacement: series.displacement[clamped],
      velocity: series.velocity[clamped],
      acceleration: series.acceleration[clamped],
      restoringForce: series.restoringForce[clamped],
      appliedForce: series.appliedForce[clamped],
    };
  }, [series, playIndex]);

  return (
    <div className="layout">
      <header className="layout__header">
        <h1>iGSDOF Front End</h1>
        <p>
          Configure the generalized single-degree-of-freedom solver and review
          Newmark results with interactive playback, backbone overlay, and
          force–displacement hysteresis.
        </p>
      </header>

      <main className="layout__content">
        <div className="panel panel--form">
          <h2>Solver Inputs</h2>
          <div className="form-grid">
            <label>
              Mass (m)
              <input
                type="number"
                step="any"
                value={mass}
                onChange={(event) => setMass(Number(event.target.value))}
              />
            </label>
            <label>
              Damping ratio (xi)
              <input
                type="number"
                step="any"
                value={dampingRatio}
                onChange={(event) =>
                  setDampingRatio(Number(event.target.value))
                }
              />
            </label>
            <label>
              Total time (s)
              <input
                type="number"
                step="any"
                value={totalTime}
                onChange={(event) => setTotalTime(Number(event.target.value))}
              />
            </label>
            <label>
              Time step (dt)
              <input
                type="number"
                step="any"
                value={timeStep}
                disabled={autoStep}
                onChange={(event) => setTimeStep(Number(event.target.value))}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={autoStep}
                onChange={(event) => setAutoStep(event.target.checked)}
              />
              Automatic time step
            </label>
          </div>

          <section className="points-section">
            <header>
              <h3>Backbone (inbound)</h3>
              <div className="section-actions">
                <button type="button" onClick={() => addBackbonePoint(setInboundPoints)}>
                  + Add row
                </button>
              </div>
            </header>
            <table className="point-table">
              <thead>
                <tr>
                  <th>Displacement</th>
                  <th>Resistance</th>
                  <th>klm</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inboundPoints.map((point) => (
                  <tr key={point.id}>
                    <td>
                      <input
                        type="number"
                        step="any"
                        value={point.displacement}
                        onChange={(event) =>
                          handleBackboneChange(
                            setInboundPoints,
                            point.id,
                            "displacement",
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        value={point.resistance}
                        onChange={(event) =>
                          handleBackboneChange(
                            setInboundPoints,
                            point.id,
                            "resistance",
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        value={point.klm}
                        onChange={(event) =>
                          handleBackboneChange(
                            setInboundPoints,
                            point.id,
                            "klm",
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => removeBackbonePoint(setInboundPoints, point.id)}
                        disabled={inboundPoints.length <= 2}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="points-section">
            <header>
              <h3>Backbone (rebound)</h3>
              <div className="section-actions">
                <button type="button" onClick={() => addBackbonePoint(setReboundPoints)}>
                  + Add row
                </button>
              </div>
            </header>
            <table className="point-table">
              <thead>
                <tr>
                  <th>Displacement</th>
                  <th>Resistance</th>
                  <th>klm</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reboundPoints.map((point) => (
                  <tr key={point.id}>
                    <td>
                      <input
                        type="number"
                        step="any"
                        value={point.displacement}
                        onChange={(event) =>
                          handleBackboneChange(
                            setReboundPoints,
                            point.id,
                            "displacement",
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        value={point.resistance}
                        onChange={(event) =>
                          handleBackboneChange(
                            setReboundPoints,
                            point.id,
                            "resistance",
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        value={point.klm}
                        onChange={(event) =>
                          handleBackboneChange(
                            setReboundPoints,
                            point.id,
                            "klm",
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => removeBackbonePoint(setReboundPoints, point.id)}
                        disabled={reboundPoints.length <= 2}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="points-section">
            <header>
              <h3>Force history</h3>
              <div className="section-actions">
                <button type="button" onClick={addForcePoint}>
                  + Add sample
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import CSV
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={handleForceCsvImport}
              />
            </header>
            <table className="point-table">
              <thead>
                <tr>
                  <th>Time (s)</th>
                  <th>Force</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {forcePoints.map((point) => (
                  <tr key={point.id}>
                    <td>
                      <input
                        type="number"
                        step="any"
                        value={point.time}
                        onChange={(event) =>
                          handleForceChange(point.id, "time", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        value={point.force}
                        onChange={(event) =>
                          handleForceChange(point.id, "force", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => removeForcePoint(point.id)}
                        disabled={forcePoints.length <= 2}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

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
          {summary && series ? (
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
                    <strong>{selection.acceleration.toFixed(4)} in/s²</strong>
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
                  units="in/s²"
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
                {backboneCurves ? (
                  <BackboneChart
                    curves={backboneCurves}
                    displacementHistory={series.displacement}
                    restoringForceHistory={series.restoringForce}
                    selectedIndex={playIndex}
                    axisLimits={forceDisplacementLimits}
                  />
                ) : null}
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
            <p className="placeholder">
              Configure the parameters on the left and run the solver to generate
              playback-ready response plots.
            </p>
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
  return `${(runtimeMs * 1000).toFixed(2)} μs`;
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
  const width = 640;
  const height = 220;

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

    const tickCount = 5;
    const xTicks: Array<{ x: number; label: string }> = [];
    const yTicks: Array<{ y: number; label: string }> = [];
    for (let i = 0; i < tickCount; i += 1) {
      const t = minTime + (spanTime * i) / (tickCount - 1);
      const ratio = (t - minTime) / spanTime;
      xTicks.push({
        x: ratio * width,
        label: spanTime === 0 ? minTime.toFixed(2) : t.toFixed(2),
      });
    }
    for (let i = 0; i < tickCount; i += 1) {
      const v = minVal + (spanVal * i) / (tickCount - 1);
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
  }, [time, values, selectedIndex]);

  if (!time.length || !values.length || !path) {
    return null;
  }

  return (
    <div className="chart-wrapper">
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
        <rect width={width} height={height} fill="#f8fafc" rx={12} />
        <line x1={0} y1={height} x2={width} y2={height} stroke="#d1d9e6" strokeWidth={1} />
        <line x1={0} y1={0} x2={0} y2={height} stroke="#d1d9e6" strokeWidth={1} />
        {xTicks.map((tick) => (
          <g key={tick.x} transform={`translate(${tick.x} ${height})`}>
            <line y1={0} y2={6} stroke="#94a3b8" strokeWidth={1} />
            <text y={18} fill="#64748b" fontSize="10" textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}
        {yTicks.map((tick) => (
          <g key={tick.y} transform={`translate(0 ${tick.y})`}>
            <line x1={0} x2={-6} stroke="#94a3b8" strokeWidth={1} />
            <text x={-10} y={4} fill="#64748b" fontSize="10" textAnchor="end">
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
  const width = 640;
  const height = 220;

  const parseLimit = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return undefined;
    }
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : undefined;
  };

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
    if (
      !displacementHistory.length ||
      displacementHistory.length !== restoringForceHistory.length
    ) {
      return {
        initialPath: "",
        finalPath: "",
        hysteresisPath: "",
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        pointerX: 0,
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

    const limitXMin = parseLimit(axisLimits.xMin);
    const limitXMax = parseLimit(axisLimits.xMax);
    const limitYMin = parseLimit(axisLimits.yMin);
    const limitYMax = parseLimit(axisLimits.yMax);

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

    const clampedIndex = Math.min(
      Math.max(selectedIndex, 0),
      displacementHistory.length - 1,
    );

    const hysteresisPath = toPath(
      displacementHistory.slice(0, clampedIndex + 1),
      restoringForceHistory.slice(0, clampedIndex + 1),
    );

    const pointerX =
      ((displacementHistory[clampedIndex] - minXValue) / spanX) * width;
    const pointerY =
      height -
      ((restoringForceHistory[clampedIndex] - minYValue) / spanY) * height;

    const tickCount = 5;
    const xTicks: Array<{ x: number; label: string }> = [];
    const yTicks: Array<{ y: number; label: string }> = [];
    for (let i = 0; i < tickCount; i += 1) {
      const value = minXValue + (spanX * i) / (tickCount - 1);
      xTicks.push({
        x: ((value - minXValue) / spanX) * width,
        label: value.toFixed(2),
      });
    }
    for (let i = 0; i < tickCount; i += 1) {
      const value = minYValue + (spanY * i) / (tickCount - 1);
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
      pointerX: Number.isFinite(pointerX) ? pointerX : 0,
      pointerY: Number.isFinite(pointerY) ? pointerY : height / 2,
      stepIndex: clampedIndex,
      xTicks,
      yTicks,
    };
  }, [axisLimits, curves, displacementHistory, restoringForceHistory, selectedIndex]);

  if (!initialPath && !finalPath && !hysteresisPath) {
    return null;
  }

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <h4>Hysteresis with Backbone – Step {stepIndex}</h4>
        <span>
          disp {minX.toFixed(3)}..{maxX.toFixed(3)} in | force {minY.toFixed(3)}..{maxY.toFixed(3)}
        </span>
      </div>
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Backbone curve comparison"
      >
        <rect width={width} height={height} fill="#f8fafc" rx={12} />
        <line x1={0} y1={height} x2={width} y2={height} stroke="#d1d9e6" strokeWidth={1} />
        <line x1={0} y1={0} x2={0} y2={height} stroke="#d1d9e6" strokeWidth={1} />
        {xTicks.map((tick) => (
          <g key={tick.x} transform={`translate(${tick.x} ${height})`}>
            <line y1={0} y2={6} stroke="#94a3b8" strokeWidth={1} />
            <text y={18} fill="#64748b" fontSize="10" textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}
        {yTicks.map((tick) => (
          <g key={tick.y} transform={`translate(0 ${tick.y})`}>
            <line x1={0} x2={-6} stroke="#94a3b8" strokeWidth={1} />
            <text x={-10} y={4} fill="#64748b" fontSize="10" textAnchor="end">
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
