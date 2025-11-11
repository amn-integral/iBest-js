import { useCallback, useEffect, useMemo, useState} from 'react';
import renderWebGLChart from './utils/renderWebGLChart';

import { parseStrictNumber } from '@integralrsg/imath'

import { UnitsTable, UserInput, UNIT_SYSTEMS, evaluateExpression } from '@integralrsg/iuicomponents';
import '@integralrsg/iuicomponents/styles';
import appCss from './App.module.css';
import type { SolverSummary, SolverWorkerInputV2, SolverWorkerOutputV2 } from './types';
import { validateSolverInput } from './utils/validateSolverInput';
import { useSolverWorkerV2 } from './hooks/useSolverWorkerV2';

const CHART_DIMENSIONS = { width: 600, height: 300 };

export function App() {
  const [massInput, setMassInput] = useState('0.2553');
  const [rotationLengthInput, setRotationLengthInput] = useState('10.0');
  const [orientation, setOrientation] = useState<'Vertical' | 'Horizontal'>('Vertical');
  const [resistance, setResistance] = useState('-7.5, 0, 7.5');
  const [displacement, setDisplacement] = useState('-0.75,0,0.75');
  const [klmInput, setKlmInput] = useState("1.0");
  const [u0Input, setU0Input] = useState<string>('0.0');
  const [v0Input, setV0Input] = useState<string>('0.0');
  const [force, setForce] = useState('0.0, 5.0, 8.66, 10.0, 8.66, 5.0, 0, 0, 0, 0, 0');
  const [time, setTime] = useState('0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0');

  // Image Stuff
  const [dispImage, setDispImage] = useState<string | null>(null);
  const [rotationImage, setRotationImage] = useState<string | null>(null);
  const [hysterisisImage, setHysterisisImage] = useState<string | null>(null);
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);

  const massValue = useMemo(() => evaluateExpression(massInput), [massInput]);
  const rotationLengthValue = useMemo(() => evaluateExpression(rotationLengthInput), [rotationLengthInput]);
  const klmValue = useMemo(() => evaluateExpression(klmInput), [klmInput]);

  // Unit system state - default to imperial
  const [selectedUnitSystemId, setSelectedUnitSystemId] = useState<string>('lbf-s^2/in-in-secs');

  // Derive unit labels from selected unit system
  const unitLabels = useMemo(() => {
    const system = UNIT_SYSTEMS.find((s: { id: string }) => s.id === selectedUnitSystemId);
    if (!system) {
      return {
        displacement: '',
        velocity: '',
        acceleration: '',
        time: '',
        force: ''
      };
    }
    return {
      displacement: system.length,
      velocity: `${system.length}/${system.time}`,
      acceleration: `${system.length}/${system.time}²`,
      time: system.time,
      force: system.force
    };
  }, [selectedUnitSystemId]);

  const currentSystem = useMemo(() => {
    return UNIT_SYSTEMS.find((s: { id: string }) => s.id === selectedUnitSystemId);
  }, [selectedUnitSystemId]);

  const handleUnitSystemChange = useCallback((unitSystemId: string) => {
    setSelectedUnitSystemId(unitSystemId);
  }, []);


  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<SolverSummary | null>(null);
  const [isSolverRunning, setIsSolverRunning] = useState(false);

  // Web Worker for solver
  const { runSolver: runSolverWorker, terminateWorker } = useSolverWorkerV2();

  // CLEANUP: Terminate worker on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      terminateWorker();
    };
  }, [terminateWorker]);

  const runSolver = async () => {
    const validationErrors: string[] = [];
    let solverInput: SolverWorkerInputV2 | null = null;
    let workerResult: SolverWorkerOutputV2 | null = null;
    let rotationData: Float32Array | null = null;

    let forceList = parseCSVtoNumberArray(force);
    let timeList = parseCSVtoNumberArray(time);
    let displacementList = parseCSVtoNumberArray(displacement);
    let resistanceList = parseCSVtoNumberArray(resistance);
    const parsedU0 = parseStrictNumber(u0Input);
    const parsedV0 = parseStrictNumber(v0Input);

    if (parsedU0 === null) {
      validationErrors.push('Initial displacement (u0) must be a valid number.');
    }

    if (parsedV0 === null) {
      validationErrors.push('Initial velocity (v0) must be a valid number.');
    }

    const initialConditions = { u0: parsedU0 ?? 0, v0: parsedV0 ?? 0 };
    const solverSettings = {
      t: timeList[timeList.length - 1] * 5,
      dt: 0.1,
      auto: true
    };

    const mass = massValue ?? 0;
    const rotationLength = rotationLengthValue ?? 0;
    const klm = klmValue ?? 0;
    const dampingRatio = 0.02;

    const builtSolverInput: SolverWorkerInputV2 = {
      mass: mass,
      klm: klm,
      resistance: resistanceList ?? [],
      displacement: displacementList ?? [],
      dampingRatio: dampingRatio,
      force: forceList ?? [],
      time: timeList ?? [],
      initialConditions: initialConditions,
      solverSettings: solverSettings,
      gravity_effect: orientation === 'Horizontal',
      added_weight: 0.0,
      gravity_constant: currentSystem!.gravity
    };

    validationErrors.push(...validateSolverInput(builtSolverInput));

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setSummary(null);
      setDispImage(null);
      setRotationImage(null);
      setIsGeneratingChart(false);
      return;
    }

    setIsSolverRunning(true);
    solverInput = builtSolverInput;

    try {
      // Run solver in Web Worker
      workerResult = await runSolverWorker(builtSolverInput);
      const result = workerResult;

      setIsGeneratingChart(true);

      try {
        
        const imageUrl = await renderWebGLChart({
          imageType: 'png',
          xValues: [...result.response.t],
          yValues: [...result.response.u],
          yMinMax: { min: result.response.summary.u.min, max: result.response.summary.u.max },
          options: {
            title: 'Displacement vs Time',
            color: '#3b82f6',
            width: CHART_DIMENSIONS.width,
            height: CHART_DIMENSIONS.height,
            xUnits: unitLabels.time,
            yUnits: unitLabels.displacement
          }
        });

        const rotationLengthForChart = rotationLength === 0 ? Number.EPSILON : rotationLength;
        let rotationMin = 0; let rotationMax = 0;
        const displacementData = result.response.u;
        rotationData = displacementData.map((disp) => {
          const angleRad = Math.atan(disp / rotationLengthForChart);
          const angleDeg = angleRad * (180 / Math.PI);
          if (angleDeg < rotationMin) rotationMin = angleDeg;
          if (angleDeg > rotationMax) rotationMax = angleDeg;
          return angleDeg;
        });

        if (!rotationData) {
          throw new Error('Failed to compute rotation data');
        }

        const rotationUrl = await renderWebGLChart({
          imageType: 'png',
          xValues: [...result.response.t],
          yValues: [...rotationData],
          yMinMax: { min: rotationMin, max: rotationMax },
          options: {
          title: 'Rotation vs Time',
          color: '#10b981',
          width: CHART_DIMENSIONS.width,
          height: CHART_DIMENSIONS.height,
          xUnits: unitLabels.time,
          yUnits: 'Degrees'
        }});

        const hysterisisUrl = await renderWebGLChart({
          imageType: 'png',
          xValues: [...result.response.u],
          yValues: [...result.response.fs],
          yMinMax: { min: result.response.summary.fs.min, max: result.response.summary.fs.max },
          xMinMax: { min: result.response.summary.u.min, max: result.response.summary.u.max },
          options: {
            title: 'Hysterisis',
            color: '#050505ff',
            width: CHART_DIMENSIONS.width,
            height: CHART_DIMENSIONS.height,
            xUnits: unitLabels.displacement,
            yUnits: unitLabels.force
          }
        });


        setRotationImage(rotationUrl);
        setDispImage(imageUrl);
        setHysterisisImage(hysterisisUrl);

      } catch (chartError) {
        console.warn('Chart generation failed:', chartError);
        setDispImage(null);
        setRotationImage(null);
      } finally {
        setIsGeneratingChart(false);
      }

      // Set minimal summary data only
      setSummary({
        maxDisplacement: result.response.summary.u.max,
        runtimeMs: result.runtimeMs,
        steps: result.response.steps
      });

      setErrors([]);

      // MEMORY OPTIMIZATION: Clear data after solver completes
      setTimeout(() => {
        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }
      }, 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run solver.';
      setErrors([message]);
      setSummary(null);
      setDispImage(null);
      setRotationImage(null);
      setIsGeneratingChart(false);
    } finally {
      if (solverInput) {
        solverInput.force = [];
        solverInput.time = [];
        solverInput.displacement = [];
        solverInput.resistance = [];
        solverInput = null;
      }
      forceList = [];
      timeList = [];
      displacementList = [];
      resistanceList = [];
      if (rotationData) {
        rotationData = null;
      }
      if (workerResult) {
        workerResult.response.t = new Float32Array();
        workerResult.response.u = new Float32Array();
        workerResult.response.v = new Float32Array();
        workerResult.response.a = new Float32Array();
        workerResult.response.k = new Float32Array();
        workerResult.response.fs = new Float32Array();
        workerResult.response.p = new Float32Array();
        workerResult.response.summary = {
          u: { min: 0, max: 0 },
          fs: { min: 0, max: 0 }
        };
        workerResult = null;
      }

      setIsSolverRunning(false);
    }
  };

  return (
    <div className={appCss.appLayout}>
      <p className={appCss.appHeadingInfo}>
        All the units must be consistent. For consistent units refer to{' '}
        <a className={appCss.appHeadingLink} href="https://www.dynasupport.com/howtos/general/consistent-units" target="_blank" rel="noopener noreferrer">
          this guide
        </a>
        .
      </p>
      <div>
        <UnitsTable selectedUnitSystem={selectedUnitSystemId} onUnitSystemChange={handleUnitSystemChange} />
      </div>
      <main className={appCss.layoutContent}>
        <div className={appCss.panel}>
          <h2>Solver Inputs</h2>

          <section className={appCss.solverInputs}>
            <div className={appCss.solverInputsTable}>
              <UserInput
                label="Mass"
                value={massInput}
                onChange={(value) => setMassInput(value)}
                type="expression"
                unit={currentSystem?.mass}
                validation={{
                  required: true,
                  min: 0,
                  max: 1
                }}
                helpText="Mass of the system"
              />

              <UserInput 
                label="KLM Factor"
                type="expression"
                onChange={(value) => setKlmInput(value)}
                value={klmInput}
                helpText="KLM factor for mass"
                validation={{min:0.1, max:1.0}}
                unit={currentSystem?.length + "/" + currentSystem?.time} />    

              <UserInput
                label="Rotation Length"
                value={rotationLengthInput}
                onChange={(value) => setRotationLengthInput(value)}
                type="expression"
                unit={currentSystem?.length}
                validation={{
                  required: true,
                  min: 0.001
                }}
                helpText="Rotation length of the system to calculate rotation vs time"
              />

              {/* <div className={appCss.solverInputsRow}>
                <span>Automatic Analysis</span>
                <div />
                <div />
                <label className={appCss.solverInputsToggle}>
                  <input aria-label="" title="Automatic time step" type="checkbox" checked={autoAnalysis} onChange={handleAutoAnalysisChange} />
                  <span className={appCss.solverInputsToggleSlider} />
                </label>
              </div> */}

              <div className={appCss.solverInputsRow}>
                <span>Orientation</span>
                <div />
                <div />
                <div className={appCss.orientationSelector}>
                  <select name="te" title="Select orientation direction" value={orientation} onChange={(e) => setOrientation(e.target.value as 'Vertical' | 'Horizontal')}>
                    <option value="Vertical">Vertical</option>
                    <option value="Horizontal">Horizontal</option>
                  </select>
                </div>
              </div>

              <UserInput 
                label="Resistance" 
                type="csv"
                onChange={(value) => setResistance(value)}
                value={resistance}
                helpText="Enter resistance values as a comma-separated list"
                unit={currentSystem?.force} />

              <UserInput 
                 label="Displacement"
                 type="csv"
                 onChange={(value) => setDisplacement(value)}
                 value={displacement}
                 helpText="Enter displacement values of resistance displacement curve as a comma-separated list"
                 unit={currentSystem?.length} />

              <UserInput
               label="Force" 
               type="csv"
               onChange={(value) => setForce(value)}
               value={force}
               helpText="Enter force values as a comma-separated list"
               unit={currentSystem?.force} />

              <UserInput 
                label="Time"
                type="csv"
                onChange={(value) => setTime(value)}
                value={time}
                helpText="Enter time values as a comma-separated list"
                unit={currentSystem?.time} />
            
              <UserInput 
                label="u0"
                type="number"
                onChange={(value) => setU0Input(value === undefined || value === null ? '' : String(value))}
                value={u0Input}
                helpText="Initial displacement"
                validation={{ min: -100, max: 100 }}
                unit={currentSystem?.length} />
              
              <UserInput 
                label="v0"
                type="number"
                onChange={(value) => setV0Input(value === undefined || value === null ? '' : String(value))}
                value={v0Input}
                helpText="Initial velocity"
                unit={currentSystem?.length + "/" + currentSystem?.time} />
            
            </div>
          </section>

          <button type="button" className={appCss.appButton} onClick={runSolver} disabled={isSolverRunning}>
            {isSolverRunning ? 'Running Solver...' : 'Run GSDOF Solver'}
          </button>

          {errors.length > 0 ? (
            <ul className={appCss.errorList}>
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className={appCss.panelResults}>
          <h2>Results</h2>
          {summary ? (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  textAlign: 'center',
                  width: `${CHART_DIMENSIONS.width}px`
                }}
              >
                <p>
                  <strong>Max Displacement:</strong> {summary.maxDisplacement.toFixed(3)} {unitLabels.displacement}
                </p>
                <p>
                  <strong>Runtime:</strong> {summary.runtimeMs.toFixed(1)} ms
                </p>
                <p>
                  <strong>Steps:</strong> {summary.steps} 
                </p>
              </div>
              {isGeneratingChart ? (
                <div
                  style={{
                    padding: '20px',
                    backgroundColor: '#d1ecf1',
                    borderRadius: '8px',
                    marginTop: '10px',
                    color: '#0c5460'
                  }}
                >
                  🔄 Generating chart for {summary.steps.toLocaleString()} data points...
                </div>
              ) : dispImage || rotationImage ? (
                <div className={appCss.chartContainer}>
                  {dispImage && (
                      <img
                        src={dispImage}
                        alt="Displacement vs Time"
                        width={CHART_DIMENSIONS.width}
                        height={CHART_DIMENSIONS.height}
                      />
                  )}
                  {rotationImage && (
                      <img
                        src={rotationImage}
                        alt="Rotation vs Time"
                        width={CHART_DIMENSIONS.width}
                        height={CHART_DIMENSIONS.height}
                      />
                  )}
                  {hysterisisImage && (
                      <img
                        src={hysterisisImage}
                        alt="Hysterisis"
                        width={CHART_DIMENSIONS.width}
                        height={CHART_DIMENSIONS.height}
                      />
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: '20px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '8px',
                    marginTop: '10px',
                    color: '#856404'
                  }}
                >
                  ⚠️ Chart not available - dataset too large for visualization ({summary.steps.toLocaleString()} points)
                </div>
              )}
            </div>
          ) : (
            <div className={appCss.previewPlaceholder}>Configure parameters and run solver to generate results.</div>
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

function parseCSVtoNumberArray(csv: string): number[] {
  const result: number[] = [];
  try {
    const entries = csv.split(',').map((entry) => entry.trim());

    for (const entry of entries) {
      const parsed = parseStrictNumber(entry);
      if (parsed === null) {
        throw new Error(`Invalid number in CSV: "${entry}"`);
      }
      result.push(parsed);
    }
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return []; // Return empty array on error
  }
  return result;
}
