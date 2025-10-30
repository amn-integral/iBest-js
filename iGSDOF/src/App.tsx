import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import renderChartJS from './utils/renderChartJSImage';

import { parseStrictNumber } from '@integralrsg/igraph';

import { UnitsTable, UserInput, UNIT_SYSTEMS, evaluateExpression } from '@integralrsg/iuicomponents';
import '@integralrsg/iuicomponents/styles';
import appCss from './App.module.css';
import type { SolverSummary, SolverWorkerInputV2 } from './types';
import { validateSolverInput } from './utils/validateSolverInput';
import { useSolverWorkerV2 } from './hooks/useSolverWorkerV2';

const MAX_SOLVER_STEPS = 1000000;
const CHART_DIMENSIONS = { width: 600, height: 300 };
// const IMAGE_DIMENSIONS = { width: 800, height: 400 };

export function App() {
  const [massInput, setMassInput] = useState('0.2553');
  const [rotationLengthInput, setRotationLengthInput] = useState('10.0');
  const [dampingRatioInput, setDampingRatioInput] = useState('0.05');
  const [totalTime, setTotalTime] = useState(1);
  const [autoAnalysis, setAutoAnalysis] = useState(true);
  const [timeStep, setTimeStep] = useState(0.1);
  const [orientation, setOrientation] = useState<'Vertical' | 'Horizontal'>('Vertical');
  const [dispImage, setDispImage] = useState<string | null>(null);
  const [rotationImage, setRotationImage] = useState<string | null>(null);
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);
  const [resistance, setResistance] = useState('-7.5,0,7.5');
  const [displacement, setDisplacement] = useState('-0.75,0,0.75');
  const [klm, setKlm] = useState(1.0);
  const [u0, setU0] = useState(0.0);
  const [v0, setV0] = useState(0.0);
  const [force, setForce] = useState('0.0, 5.0, 8.66, 10.0, 8.66, 5.0, 0, 0, 0, 0, 0');
  const [time, setTime] = useState('0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0');

  const massValue = useMemo(() => evaluateExpression(massInput), [massInput]);
  const rotationLengthValue = useMemo(() => evaluateExpression(rotationLengthInput), [rotationLengthInput]);
  const dampingRatioValue = useMemo(() => evaluateExpression(dampingRatioInput), [dampingRatioInput]);

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

  const handleAutoAnalysisChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAutoAnalysis(event.target.checked);
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

    if (massValue === null) {
      validationErrors.push('Mass must be a valid expression');
    }

    if (rotationLengthValue === null) {
      validationErrors.push('Rotation length must be a valid expression');
    }

    if (dampingRatioValue === null) {
      validationErrors.push('Damping ratio must be a valid expression');
    }

    const forceList: number[] = parseCSVtoNumberArray(force);
    const timeList: number[] = parseCSVtoNumberArray(time);
    const displacementList: number[] = parseCSVtoNumberArray(displacement);
    const resistanceList: number[] = parseCSVtoNumberArray(resistance);
    const initialConditions = { u0: u0, v0: v0 };
    const solverSettings = {
      t: autoAnalysis ? timeList[timeList.length - 1] * 1: totalTime,
      dt: timeStep,
      auto: autoAnalysis
    };

    const mass = massValue ?? 0;
    const rotationLength = rotationLengthValue ?? 0;
    const dampingRatio = dampingRatioValue ?? 0;

    const solverInput: SolverWorkerInputV2 = {
      mass: mass,
      klm: klm,
      resistance: resistanceList,
      displacement: displacementList,
      dampingRatio: dampingRatio,
      force: forceList,
      time: timeList,
      initialConditions: initialConditions,
      solverSettings: solverSettings,
      gravity_effect: orientation === 'Horizontal',
      added_weight: 0.0,
      gravity_constant: currentSystem!.gravity
    };

    validationErrors.push(...validateSolverInput(solverInput));

    // Add step limit validation to prevent Web Worker memory issues
    const estimatedSteps = autoAnalysis
      ? Math.ceil(totalTime / 0.001) // Conservative estimate for auto step
      : Math.ceil(totalTime / timeStep);

    if (estimatedSteps > MAX_SOLVER_STEPS) {
      validationErrors.push(`Estimated ${estimatedSteps.toLocaleString()} steps exceeds maximum limit of ${MAX_SOLVER_STEPS.toLocaleString()}. ` + `Reduce total time or increase time step to prevent memory issues. ` + `Suggested: Total time ≤ ${(MAX_SOLVER_STEPS * (autoAnalysis ? 0.001 : timeStep)).toFixed(1)} ${unitLabels.time}`);
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setSummary(null);
      setDispImage(null);
      setRotationImage(null);
      setIsGeneratingChart(false);
      return;
    }

    setIsSolverRunning(true);

    try {
      // Run solver in Web Worker
      const result = await runSolverWorker(solverInput);

      // Add validation for the Web Worker result
      if (!result || !result.response) {
        throw new Error('Web Worker returned invalid response');
      }

      if (!result.response.t || !result.response.u) {
        throw new Error('Web Worker returned invalid response data - missing time or displacement arrays');
      }

      // Use full resolution data - no sampling
      const timeData = result.response.t;
      const displacementData = result.response.u;

      // Add validation that arrays have data
      if (!timeData.length || !displacementData.length) {
        throw new Error('Solver returned empty data arrays');
      }

      if (timeData.length !== displacementData.length) {
        throw new Error('Time and displacement data arrays have mismatched lengths');
      }

      console.log(`Solver completed: ${timeData.length} data points - using full resolution for charts`);

      setIsGeneratingChart(true);

      try {
        // Create copies of data to prevent mutation by Chart.js
        const timeDataCopy = [...timeData];
        const displacementDataCopy = [...displacementData];

        console.log(`Before chart generation: timeData=${timeData.length}, displacementData=${displacementData.length}`);

        const imageUrl = await renderChartJS('png', timeDataCopy, displacementDataCopy, {
          title: 'Displacement vs Time',
          color: '#3b82f6',
          width: CHART_DIMENSIONS.width,
          height: CHART_DIMENSIONS.height,
          xUnits: unitLabels.time,
          yUnits: unitLabels.displacement
        });

        const rotationLengthForChart = rotationLength === 0 ? Number.EPSILON : rotationLength;
        const rotationData = displacementData.map((disp) => {
          const angleRad = Math.atan(disp / rotationLengthForChart);
          return angleRad * (180 / Math.PI);
        });

        const timeDataRotationCopy = [...timeData];
        const rotationDataCopy = [...rotationData];

        const rotationUrl = await renderChartJS('png', timeDataRotationCopy, rotationDataCopy, {
          title: 'Rotation vs Time',
          color: '#10b981',
          width: CHART_DIMENSIONS.width,
          height: CHART_DIMENSIONS.height,
          xUnits: unitLabels.time,
          yUnits: 'Degrees'
        });
        setRotationImage(rotationUrl);
        setDispImage(imageUrl);
      } catch (chartError) {
        console.warn('Chart generation failed:', chartError);
        setDispImage(null);
        setRotationImage(null);
      } finally {
        setIsGeneratingChart(false);
      }

      const totalPoints = result.response.t.length; // Use validated data length
      const finalDisplacement = result.response.u[totalPoints - 1]?.toFixed(2) ?? 'NA';
      const maxDisp = result.bounds?.displacement?.max?.toFixed(2) ?? '0';

      // Set minimal summary data only
      setSummary({
        maxDisplacement: maxDisp,
        finalDisplacement: finalDisplacement,
        runtimeMs: result.runtimeMs,
        steps: totalPoints
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
                type="number"
                onChange={(value) => setKlm(parseFloat(value))}
                value={klm}
                helpText="KLM factor for mass"
                unit={currentSystem?.length + "/" + currentSystem?.time} />    

              <UserInput
                label="Rotation Length"
                value={rotationLengthInput}
                onChange={(value) => setRotationLengthInput(value)}
                type="expression"
                unit={currentSystem?.length}
                validation={{
                  required: true,
                  min: 0
                }}
                helpText="Rotation length of the system to calculate rotation vs time"
              />

              <div className={appCss.solverInputsRow}>
                <span>Automatic Analysis</span>
                <div />
                <div />
                <label className={appCss.solverInputsToggle}>
                  <input aria-label="" title="Automatic time step" type="checkbox" checked={autoAnalysis} onChange={handleAutoAnalysisChange} />
                  <span className={appCss.solverInputsToggleSlider} />
                </label>
              </div>

              {!autoAnalysis && (
                <>
                  <UserInput
                    label="Damping ratio"
                    value={dampingRatioInput}
                    onChange={(value) => setDampingRatioInput(value)}
                    type="expression"
                    validation={{
                      required: true,
                      min: 0,
                      max: 1
                    }}
                    helpText="Damping ratio, 0.02, 0.05 typically for steel and concrete systems respectively"
                  />

                  <UserInput
                    label="Total time"
                    value={totalTime}
                    onChange={(value) => setTotalTime(parseFloat(value) || 0)}
                    type="number"
                    unit={currentSystem?.time}
                    validation={{
                      required: true,
                      min: 0
                    }}
                    helpText="Analysis duration (typically set 2 times the force duration or until response stabilizes)"
                  />

                  <UserInput
                    label="Fixed time step"
                    value={timeStep}
                    onChange={(value) => setTimeStep(parseFloat(value) || 0)}
                    type="number"
                    unit={currentSystem?.time}
                    disabled={autoAnalysis}
                    validation={{
                      min: 0
                    }}
                    helpText="Fixed time step value (only used when automatic time step is off). Automatic time step is period/1000."
                  />
                </>
              )}

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
                label="uo"
                type="number"
                onChange={(value) => {
                  setU0(parseFloat(value));
                }}
                value={u0}
                helpText="Initial displacement"
                validation={{ min: -100, max: 100 }}
                unit={currentSystem?.length} />
              
              <UserInput 
                label="vo"
                type="number"
                onChange={(value) => setV0(parseFloat(value))}
                value={v0}
                helpText="Initial velocity"
                unit={currentSystem?.length + "/" + currentSystem?.time} />
            
            </div>
          </section>

          <button type="button" className={appCss.appButton} onClick={runSolver} disabled={isSolverRunning}>
            {isSolverRunning ? 'Running Solver...' : 'Run GSDOF Solver'}
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
          {summary ? (
            <div>
              <div
                style={{
                  padding: '1px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  textAlign: 'center'
                }}
              >
                <p>
                  <strong>Max Displacement:</strong> {summary.maxDisplacement} {unitLabels.displacement}
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
                        style={{
                          width: `${CHART_DIMENSIONS.width}px`,
                          height: `${CHART_DIMENSIONS.height}px`,
                          boxSizing: 'content-box'
                        }}
                      />
                  )}
                  {rotationImage && (
                      <img
                        src={rotationImage}
                        alt="Rotation vs Time"
                        width={CHART_DIMENSIONS.width}
                        height={CHART_DIMENSIONS.height}
                        style={{
                          width: `${CHART_DIMENSIONS.width}px`,
                          height: `${CHART_DIMENSIONS.height}px`,
                          boxSizing: 'content-box'
                        }}
                      />
                  )}
                  {!rotationImage && dispImage && (
                    <div
                      style={{
                        padding: '10px',
                        backgroundColor: '#fff3cd',
                        borderRadius: '4px',
                        color: '#856404',
                        marginTop: '10px'
                      }}
                    >
                      ℹ️ Rotation chart not available - check length parameter ({length})
                    </div>
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
