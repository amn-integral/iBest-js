import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { BackboneCurve } from "@integralrsg/imath";
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
import { useSolverWorker } from "./hooks/useSolverWorker";

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
  // Pre-computed bounds to avoid expensive min/max on large arrays
  bounds?: {
    displacement: { min: number; max: number };
    velocity: { min: number; max: number };
    acceleration: { min: number; max: number };
    restoringForce: { min: number; max: number };
    appliedForce: { min: number; max: number };
  };
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
  const [totalTimeInput, setTotalTimeInput] = useState("100000");
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

  // Lazy render Report component only when needed for PDF
  const [shouldRenderReport, setShouldRenderReport] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSolverRunning, setIsSolverRunning] = useState(false);

  // Memory optimization: convert charts to static images
  const [chartImages, setChartImages] = useState<{ [key: string]: string }>({});
  const [useStaticCharts, setUseStaticCharts] = useState(false);
  const [isCapturingCharts, setIsCapturingCharts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const chartsContainerRef = useRef<HTMLDivElement | null>(null);

  // Web Worker for solver
  const { runSolver: runSolverWorker, terminateWorker } = useSolverWorker();

  // Simple component to render either static image or interactive chart
  const ChartOrImage = ({
    chartId,
    children,
    alt,
  }: {
    chartId: string;
    children: React.ReactNode;
    alt: string;
  }) => {
    if (useStaticCharts && chartImages[chartId]) {
      return (
        <div className={appCss.chartContainer} data-chart-id={chartId}>
          <img
            src={chartImages[chartId]}
            alt={alt}
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      );
    }
    return <div data-chart-id={chartId}>{children}</div>;
  };

  // Function to capture charts as static images for memory optimization
  const captureChartsAsImages = useCallback(async () => {
    if (!chartsContainerRef.current) return;

    setIsCapturingCharts(true);
    const images: { [key: string]: string } = {};

    try {
      // Find all chart elements
      const chartElements =
        chartsContainerRef.current.querySelectorAll("[data-chart-id]");

      for (const element of chartElements) {
        const chartId = element.getAttribute("data-chart-id");
        if (chartId && element instanceof HTMLElement) {
          const canvas = await html2canvas(element, {
            backgroundColor: "#ffffff",
            scale: 0.8, // Reduce for memory savings
            logging: false,
            useCORS: true,
            height: element.offsetHeight,
            width: element.offsetWidth,
          });
          images[chartId] = canvas.toDataURL("image/png", 0.6); // Lower quality
        }
      }

      setChartImages(images);
      setUseStaticCharts(true);

      // IMMEDIATELY clear all large data arrays - no delay
      setSeries((prev) =>
        prev
          ? {
              ...prev,
              time: [],
              displacement: [],
              velocity: [],
              acceleration: [],
              restoringForce: [],
              appliedForce: [],
            }
          : null
      );

      // Clear rotation history too
      setRotationHistory((prev) =>
        prev
          ? {
              ...prev,
              angle: [],
            }
          : prev
      );

      console.log(
        `Charts converted to ${Object.keys(images).length} static images, all data cleared immediately`
      );
    } catch (error) {
      console.error("Failed to capture charts:", error);
    } finally {
      setIsCapturingCharts(false);
    }
  }, []);

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
    setIsGeneratingPdf(true);

    // Trigger Report component rendering
    setShouldRenderReport(true);

    // Wait for rendering to complete - give it more time for charts
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!reportRef.current) {
      console.error("Report component is not available.");
      setShouldRenderReport(false);
      setIsGeneratingPdf(false);
      return;
    }

    try {
      // Capture the report component as canvas
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5, // Reduced from 2 for faster capture
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false, // Disable logging for better performance
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

      // Optional: Keep rendered for subsequent PDF generations
      // setShouldRenderReport(false);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
      setShouldRenderReport(false);
    } finally {
      setIsGeneratingPdf(false);
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
    min?: number;
    max?: number;
  }>({ angle: [] });

  const runSolver = async () => {
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

    setIsSolverRunning(true);

    try {
      const backbone = new BackboneCurve(inboundValidRows, reboundValidRows);
      const initialCurve = {
        x: [...backbone.xValues],
        y: [...backbone.yValues],
      };

      // Prepare data for Web Worker
      const solverInput = {
        mass,
        dampingRatio,
        totalTime,
        timeStep,
        autoStep,
        orientation,
        gravity: currentSystem!.gravity,
        length,
        inboundValidRows,
        reboundValidRows,
        forceValidRows,
      };

      const start = performance.now();

      // Run solver in Web Worker
      const result = await runSolverWorker(solverInput);

      const runtime = performance.now() - start;
      console.log(
        "Web Worker solver runtime (ms):",
        runtime,
        result.response.displacement.length.toExponential()
      );

      console.log("Number of worker steps:", result.response.time.length / 1e6);

      const totalPoints = result.response.time.length;

      const finalDisplacement = result.response.displacement[totalPoints - 1];

      setRotationHistory({
        angle: result.rotationArray,
        min: result.rotationBounds.min,
        max: result.rotationBounds.max,
      });

      setSummary({
        maxDisplacement: result.bounds.displacement.max,
        finalDisplacement,
        runtimeMs: runtime,
        steps: totalPoints,
      });

      setSeries({
        time: result.response.time,
        displacement: result.response.displacement,
        velocity: result.response.velocity,
        acceleration: result.response.acceleration,
        restoringForce: result.response.restoringForce,
        appliedForce: result.response.appliedForce,
        bounds: {
          displacement: result.bounds.displacement,
          velocity: result.bounds.velocity,
          acceleration: result.bounds.acceleration,
          restoringForce: result.bounds.restoringForce,
          appliedForce: result.bounds.appliedForce,
        },
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

      // Immediately capture charts as static images to reduce memory usage
      // No delay - aggressive memory optimization
      setTimeout(() => {
        captureChartsAsImages();
      }, 100); // Minimal delay just for DOM rendering
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run solver.";
      setErrors([message]);
      setSummary(null);
      setSeries(null);
      setBackboneCurves(null);
      setIsPlaying(false);
    } finally {
      setIsSolverRunning(false);
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
            disabled={isSolverRunning}
          >
            {isSolverRunning ? "Running Solver..." : "Run GSDOF Solver"}
          </button>

          <button
            type="button"
            className={appCss.appButton}
            onClick={generatePdf}
            disabled={isGeneratingPdf || !series || !backboneCurves}
          >
            {isGeneratingPdf ? "Generating PDF..." : "Print to PDF"}
          </button>

          {errors.length > 0 ? (
            <ul className="error-list">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className={appCss.panelResults} ref={chartsContainerRef}>
          <h2>Results</h2>
          {summary && (series || useStaticCharts) && backboneCurves ? (
            <>
              {isCapturingCharts && (
                <div
                  style={{
                    padding: "10px",
                    backgroundColor: "#fff3cd",
                    border: "1px solid #ffeaa7",
                    borderRadius: "4px",
                    color: "#856404",
                    marginBottom: "10px",
                  }}
                >
                  🔄 Converting charts to images and freeing memory...
                </div>
              )}

              {useStaticCharts && (
                <div
                  style={{
                    padding: "10px",
                    backgroundColor: "#d4edda",
                    border: "1px solid #c3e6cb",
                    borderRadius: "4px",
                    color: "#155724",
                    marginBottom: "10px",
                  }}
                >
                  ✅ Memory optimized: Interactive data converted to static
                  images ({Object.keys(chartImages).length} charts)
                </div>
              )}

              <div className={appCss.chartsGrid}>
                {series && (
                  <>
                    <ChartOrImage
                      chartId="displacement"
                      alt="Displacement Chart"
                    >
                      <HistoryChart
                        title="Displacement"
                        time={series.time}
                        values={series.displacement}
                        color="#3b82f6"
                        className={appCss.chartContainer}
                        selectedIndex={0}
                        logoUrl={integralLogo}
                        xUnits={unitLabels.time}
                        yUnits={unitLabels.displacement}
                      />
                    </ChartOrImage>
                    <ChartOrImage chartId="rotation" alt="Rotation Chart">
                      <HistoryChart
                        title="Rotation"
                        time={series.time}
                        values={rotationHistory.angle}
                        color="#3b82f6"
                        className={appCss.chartContainer}
                        selectedIndex={0}
                        logoUrl={integralLogo}
                        xUnits={unitLabels.time}
                        yUnits="degree"
                      />
                    </ChartOrImage>
                    <ChartOrImage chartId="velocity" alt="Velocity Chart">
                      <HistoryChart
                        title="Velocity"
                        time={series.time}
                        values={series.velocity}
                        color="#16a34a"
                        className={appCss.chartContainer}
                        selectedIndex={0}
                        logoUrl={integralLogo}
                        xUnits={unitLabels.time}
                        yUnits={unitLabels.velocity}
                      />
                    </ChartOrImage>
                    <ChartOrImage
                      chartId="acceleration"
                      alt="Acceleration Chart"
                    >
                      <HistoryChart
                        title="Acceleration"
                        time={series.time}
                        values={series.acceleration}
                        color="#dc2626"
                        className={appCss.chartContainer}
                        selectedIndex={0}
                        logoUrl={integralLogo}
                        xUnits={unitLabels.time}
                        yUnits={unitLabels.acceleration}
                      />
                    </ChartOrImage>
                    <ChartOrImage
                      chartId="restoringForce"
                      alt="Restoring Force Chart"
                    >
                      <HistoryChart
                        title="Restoring force"
                        time={series.time}
                        values={series.restoringForce}
                        color="#f59e0b"
                        className={appCss.chartContainer}
                        selectedIndex={0}
                        logoUrl={integralLogo}
                        xUnits={unitLabels.time}
                        yUnits={unitLabels.force}
                      />
                    </ChartOrImage>
                    <ChartOrImage
                      chartId="appliedForce"
                      alt="Applied Force Chart"
                    >
                      <HistoryChart
                        title="Applied force"
                        time={series.time}
                        values={series.appliedForce}
                        color="#9333ea"
                        className={appCss.chartContainer}
                        selectedIndex={0}
                        logoUrl={integralLogo}
                        xUnits={unitLabels.time}
                        yUnits={unitLabels.force}
                      />
                    </ChartOrImage>
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

      {/* Lazy-rendered Report component for PDF generation - only renders when needed */}
      {/* <div className={appCss.printContainer} ref={reportRef}>
        {shouldRenderReport && series && backboneCurves && (
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
      </div> */}
    </div>
  );
}
