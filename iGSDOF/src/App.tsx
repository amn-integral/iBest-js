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
  type InitialConditions,
  type SolverSettings,
  type NewmarkParameters,
  type NewmarkResponse,
} from "@integralrsg/imath";
import {
  HistoryChart,
  BackboneChart,
  parseStrictNumber,
  formatLimitValue,
} from "@integralrsg/igraph";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  EditableGrid,
  UnitsTable,
  UserInput,
  UNIT_SYSTEMS,
  type ColumnConfig,
} from "@integralrsg/iuicomponents";
import "@integralrsg/iuicomponents/styles";
const integralLogo = `${import.meta.env.BASE_URL}integralLogo.svg`;

import { Report } from "./components/Report";
import appCss from "./App.module.css";

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
  const [rotationLengthInput, setRotationLengthInput] = useState("10.0");
  const [dampingRatioInput, setDampingRatioInput] = useState("0.05");
  const [totalTimeInput, setTotalTimeInput] = useState("1.0");
  const [autoStep, setAutoStep] = useState(false);
  const [timeStepInput, setTimeStepInput] = useState("0.1");
  const [orientation, setOrientation] = useState<"Vertical" | "Horizontal">(
    "Vertical"
  );

  // Unit system state - default to imperial
  const [selectedUnitSystemId, setSelectedUnitSystemId] =
    useState<string>("lbf-s^2/in-in-secs");

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

  const length = useMemo(
    () => parseStrictNumber(rotationLengthInput) ?? Number.NaN,
    [rotationLengthInput]
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

  // Derive unit labels from selected unit system
  const unitLabels = useMemo(() => {
    const system = UNIT_SYSTEMS.find(
      (s: { id: string }) => s.id === selectedUnitSystemId
    );
    if (!system) {
      return {
        displacement: "",
        velocity: "",
        acceleration: "",
        time: "",
        force: "",
      };
    }
    return {
      displacement: system.length,
      velocity: `${system.length}/${system.time}`,
      acceleration: `${system.length}/${system.time}²`,
      time: system.time,
      force: system.force,
    };
  }, [selectedUnitSystemId]);

  const currentSystem = useMemo(() => {
    return UNIT_SYSTEMS.find(
      (s: { id: string }) => s.id === selectedUnitSystemId
    );
  }, [selectedUnitSystemId]);

  const handleUnitSystemChange = useCallback((unitSystemId: string) => {
    setSelectedUnitSystemId(unitSystemId);
  }, []);

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
        label: "Time",
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
  const reportRef = useRef<HTMLDivElement | null>(null);

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

  const generatePdf = useCallback(async () => {
    if (!reportRef.current) {
      console.error("Report component is not available.");
      return;
    }

    try {
      // Capture the report component as canvas
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
      });

      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Calculate dimensions to fit the canvas on A4 page
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      // Save the PDF
      pdf.save("solver-report.pdf");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  }, []);

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

  // Rotation calculations
  const [rotationHistory, setRotationHistory] = useState<{
    angle: number[];
  }>({  angle: [] });

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

      const initialConditions: InitialConditions = { u0: 0, v0: 0 };
      const solverSettings: SolverSettings = autoStep
        ? { t: totalTime, auto: true }
        : { t: totalTime, dt: timeStep, auto: false };
      const newmarkParams: NewmarkParameters = averageAcceleration;

      const response: NewmarkResponse = newmarkSolver(
        mass,
        backbone,
        dampingRatio,
        force,
        initialConditions,
        solverSettings,
        newmarkParams,
        orientation === "Vertical" ? false : true,
        0.0,
        currentSystem!.gravity
      );
      const runtime = performance.now() - start;

      const maxDisplacement = Math.max(...response.displacement);
      const finalDisplacement =
        response.displacement[response.displacement.length - 1];

      // Rotation is calculated as atan of response.displacement / (length / 2)
      const rotationAngles = response.displacement.map((disp) => {
        const angleRad = Math.atan(disp / length);
        return angleRad * (180 / Math.PI);
      });

      setRotationHistory({
        angle: rotationAngles,
      });

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

  const forceToolbar = (
    <>
      {/* Hidden file input */}
      <input
        id="force-csv-input"
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleForceCsvImport}
        className={appCss.hiddenInput}
      />

      {/* Use label as stylable trigger */}
      <label htmlFor="force-csv-input" className={appCss.gridButton}>
        Import CSV
      </label>
    </>
  );

  return (
    <div className={appCss.appLayout}>
      <p className={appCss.appHeadingInfo}>
        All the units must be consistent. For consistent units refer to{" "}
        <a
          className={appCss.appHeadingLink}
          href="https://www.dynasupport.com/howtos/general/consistent-units"
          target="_blank"
          rel="noopener noreferrer"
        >
          this guide
        </a>
        .
      </p>
      <div>
        <UnitsTable
          selectedUnitSystem={selectedUnitSystemId}
          onUnitSystemChange={handleUnitSystemChange}
        />
      </div>
      <main className={appCss.layoutContent}>
        <div className={appCss.panel}>
          <h2>Solver Inputs</h2>

          <section className={appCss.solverInputs}>
            <div className={appCss.solverInputsTable}>
              <UserInput
                label="Mass"
                value={massInput}
                onChange={setMassInput}
                type="expression"
                unit={currentSystem?.mass}
                validation={{
                  required: true,
                  min: 0,
                }}
                helpText="Mass of the system"
              />

              <UserInput
                label="Rotation Length"
                value={rotationLengthInput}
                onChange={setRotationLengthInput}
                type="expression"
                unit={currentSystem?.length}
                validation={{
                  required: true,
                  min: 0,
                }}
                helpText="Rotation length of the system to calculate rotation vs time"
              />

              <UserInput
                label="Damping ratio"
                value={dampingRatioInput}
                onChange={setDampingRatioInput}
                type="expression"
                validation={{
                  required: true,
                  min: 0,
                  max: 1,
                }}
                helpText="Damping ratio, 0.02, 0.05 typically for steel and concrete systems respectively"
              />

              <UserInput
                label="Total time"
                value={totalTimeInput}
                onChange={setTotalTimeInput}
                type="number"
                unit={currentSystem?.time}
                validation={{
                  required: true,
                  min: 0,
                }}
                helpText="Analysis duration (typically set 2 times the force duration or until response stabilizes)"
              />

              <div className={appCss.solverInputsRow}>
                <span>Automatic time step</span>
                <div />
                <div />
                <label className={appCss.solverInputsToggle}>
                  <input
                    aria-label=""
                    title="Automatic time step"
                    type="checkbox"
                    checked={autoStep}
                    onChange={handleAutoStepChange}
                  />
                  <span className={appCss.solverInputsToggleSlider} />
                </label>
              </div>

              <UserInput
                label="Fixed time step"
                value={timeStepInput}
                onChange={setTimeStepInput}
                type="number"
                unit={currentSystem?.time}
                disabled={autoStep}
                validation={{
                  min: 0,
                }}
                helpText="Fixed time step value (only used when automatic time step is off). Automatic time step is period/1000."
              />

              <div className={appCss.solverInputsRow}>
                <span>Orientation</span>
                <div />
                <div />
                <div className={appCss.orientationSelector}>
                  <select
                    name="te"
                    title="Select orientation direction"
                    value={orientation}
                    onChange={(e) =>
                      setOrientation(
                        e.target.value as "Vertical" | "Horizontal"
                      )
                    }
                  >
                    <option value="Vertical">Vertical</option>
                    <option value="Horizontal">Horizontal</option>
                  </select>
                </div>
              </div>

              <UserInput
                label="Gravity Constant"
                type="number"
                onChange={() => {
                  // Do nothing as this is read-only
                }}
                value={currentSystem!.gravity}
                unit={currentSystem!.acceleration}
                disabled={true}
                helpText="Gravity constant used if the gravity is enabled"
              />
            </div>
          </section>

          <EditableGrid
            gridClassName={appCss.gridClassName}
            title="Backbone (inbound)"
            columns={backboneColumns}
            rows={inboundRows}
            onRowsChange={setInboundRows}
            createRow={createInboundRow}
            onValidatedRows={setInboundValidRows}
            rowCountType="dropdown"
            minRows={2}
            maxRows={50}
          />

          <EditableGrid
            title="Backbone (rebound)"
            gridClassName={appCss.gridClassName}
            columns={backboneColumns}
            rows={reboundRows}
            onRowsChange={setReboundRows}
            createRow={createReboundRow}
            onValidatedRows={setReboundValidRows}
            rowCountType="dropdown"
            minRows={2}
            maxRows={50}
          />

          <EditableGrid
            title="Force history"
            gridClassName={appCss.gridClassName}
            columns={forceColumns}
            rows={forceRows}
            onRowsChange={setForceRows}
            createRow={createForceRow}
            onValidatedRows={setForceValidRows}
            toolbar={forceToolbar}
            rowCountType="input"
            maxRows={5000}
          />

          <button
            type="button"
            className={appCss.appButton}
            onClick={runSolver}
          >
            Run GSDOF Solver
          </button>

          <button
            type="button"
            className={appCss.appButton}
            onClick={generatePdf}
          >
            Print to PDF
          </button>

          {errors.length > 0 ? (
            <ul className="error-list">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className={appCss.panelResults}>
          <h2>Results</h2>
          {summary && series && backboneCurves ? (
            <>
              <div className={appCss.playbackControls}>
                <button
                  type="button"
                  className={appCss.playbackButton}
                  onClick={() => setIsPlaying((playing) => !playing)}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <input
                  id="step-input"
                  type="number"
                  className={appCss.solverInputsInput}
                  title="step-number"
                  min={0}
                  max={series.time.length - 1}
                  value={Math.min(playIndex, series.time.length - 1)}
                  onChange={(event) => {
                    setPlayIndex(Number(event.target.value));
                    setIsPlaying(false);
                  }}
                />
                <label className={appCss.speedSelect}>
                  Speed
                  <select
                    value={playbackSpeed}
                    onChange={(event) =>
                      setPlaybackSpeed(Number(event.target.value))
                    }
                  >
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={4}>4×</option>
                    <option value={8}>8×</option>
                    <option value={16}>16×</option>
                  </select>
                </label>
              </div>

              {selection ? (
                <div className={appCss.sampleReadout}>
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

              <div className={appCss.chartsGrid}>
                {series && (
                  <>
                    <HistoryChart
                      title="Displacement"
                      time={series.time}
                      values={series.displacement}
                      color="#3b82f6"
                      className={appCss.chartContainer}
                      selectedIndex={selection?.index ?? 0}
                      logoUrl={integralLogo}
                      xUnits={unitLabels.time}
                      yUnits={unitLabels.displacement}
                    />
                    <HistoryChart
                      title="Rotation"
                      time={series.time}
                      values={rotationHistory.angle}
                      color="#3b82f6"
                      className={appCss.chartContainer}
                      selectedIndex={selection?.index ?? 0}
                      logoUrl={integralLogo}
                      xUnits={unitLabels.time}
                      yUnits="degree"
                    />
                    <HistoryChart
                      title="Velocity"
                      time={series.time}
                      values={series.velocity}
                      color="#16a34a"
                      className={appCss.chartContainer}
                      selectedIndex={selection?.index ?? 0}
                      logoUrl={integralLogo}
                      xUnits={unitLabels.time}
                      yUnits={unitLabels.velocity}
                    />
                    <HistoryChart
                      title="Acceleration"
                      time={series.time}
                      values={series.acceleration}
                      color="#f97316"
                      selectedIndex={selection?.index ?? 0}
                      className={appCss.chartContainer}
                      logoUrl={integralLogo}
                      xUnits={unitLabels.time}
                      yUnits={unitLabels.acceleration}
                    />
                  </>
                )}
                {backboneCurves && (
                  <BackboneChart
                    curves={backboneCurves}
                    displacementHistory={series?.displacement ?? []}
                    restoringForceHistory={series?.restoringForce ?? []}
                    selectedIndex={selection?.index ?? 0}
                    className={appCss.chartContainer}
                    logoUrl={integralLogo}
                    xUnits={unitLabels.displacement}
                    yUnits={unitLabels.force}
                  />
                )}
              </div>
            </>
          ) : (
            <div className={appCss.previewGrid}>
              {backbonePreview ? (
                <BackboneChart
                  curves={backbonePreview}
                  displacementHistory={[]}
                  restoringForceHistory={[]}
                  selectedIndex={0}
                  className={appCss.chartContainer}
                  logoUrl={integralLogo}
                  xUnits={unitLabels.displacement}
                  yUnits={unitLabels.force}
                />
              ) : (
                <div className={appCss.previewPlaceholder}>
                  Provide at least two inbound and two rebound points to preview
                  the backbone curve.
                </div>
              )}
              {forcePreviewSeries ? (
                <HistoryChart
                  title="Force preview"
                  className={appCss.chartContainer}
                  time={forcePreviewSeries.time}
                  values={forcePreviewSeries.values}
                  color="#0ea5e9"
                  selectedIndex={forcePreviewSeries.time.length - 1}
                  logoUrl={integralLogo}
                  xUnits={unitLabels.time}
                  yUnits={unitLabels.force}
                />
              ) : (
                <div className={appCss.previewPlaceholder}>
                  Provide at least two time-force samples to preview the force
                  history.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Hidden Report component for PDF generation */}
      <div className={appCss.printContainer} ref={reportRef}>
        {series && backboneCurves && (
          <Report
            mass={massInput}
            dampingRatio={dampingRatioInput}
            totalTime={totalTimeInput}
            timeStep={timeStepInput}
            autoStep={autoStep}
            inboundRows={inboundRows}
            reboundRows={reboundRows}
            forceRows={forceRows}
            series={series}
            backboneCurves={backboneCurves}
            backboneColumns={backboneColumns}
            forceColumns={forceColumns}
            unitLabels={unitLabels}
          />
        )}
      </div>
    </div>
  );
}
