import { useRef, useMemo } from 'react';
import { type OrbitControls as OrbitControlsType } from 'three-stdlib';
import styles from './App.module.css';
import '@integralrsg/iuicomponents/styles';
import { CUBICLE_TYPES, TargetType as TargetTypeConst } from './constants';
import { useCubicleAnalysis } from './hooks/useCubicleAnalysis';
import { Scene3D } from './components/Scene3D';
import { CubicleConfig } from './components/CubicleConfig';
import { OpeningConfig } from './components/OpeningConfig';
import { ThreatConfig } from './components/ThreatConfig';
import { TargetConfig } from './components/TargetConfig';

const formatLabel = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

export default function App() {
  const controlsRef = useRef<OrbitControlsType>(null);
  const state = useCubicleAnalysis();

  // Computed values
  const lengthValue = Number(state.length);
  const widthValue = Number(state.width);
  const heightValue = Number(state.height);
  const stripWidthValue = Number(state.stripWidth);
  const stripHeightValue = Number(state.stripHeight);
  const openingWidthValue = Number(state.openingWidth);
  const openingHeightValue = Number(state.openingHeight);
  const threatXValue = Number(state.threatXLocation);
  const threatYValue = Number(state.threatYLocation);
  const threatZValue = Number(state.threatZLocation);
  const threatWeightValue = Number(state.threatWeight);

  const threatPosition = useMemo<[number, number, number]>(() => [threatXValue, threatYValue, threatZValue], [threatXValue, threatYValue, threatZValue]);

  const opening = useMemo(
    () => ({
      face: state.openingFace,
      width: openingWidthValue,
      height: openingHeightValue
    }),
    [state.openingFace, openingWidthValue, openingHeightValue]
  );

  const volumeValue = (lengthValue * widthValue * heightValue).toFixed(2);
  const cubicleLabel = CUBICLE_TYPES.find(type => type.value === state.cubicleType)?.label ?? formatLabel(state.cubicleType);
  const targetFaceLabel = formatLabel(state.targetFace);
  const targetTypeLabel = formatLabel(state.targetType);
  const openingFaceLabel = formatLabel(state.openingFace);
  const openingSummary = `${state.openingWidth} x ${state.openingHeight} in`;
  const targetSummary = state.targetType === TargetTypeConst.Strip ? `${state.stripWidth} x ${state.stripHeight} ft strip` : targetTypeLabel;
  const analysisStatus = state.isAnalyzing
    ? 'Analyzing scenario...'
    : state.analysisError
      ? 'Analysis failed'
      : state.analysisResult
        ? 'Result ready'
        : 'Awaiting analysis';
  const statusClassName = state.isAnalyzing ? styles.statusActive : state.analysisError ? styles.statusError : styles.statusIdle;
  const analysisSummary = state.isAnalyzing
    ? 'Running blast load calculations.'
    : state.analysisError
      ? 'Resolve the issue below and try again.'
      : state.analysisResult
        ? 'Latest results are shown in the feed.'
        : 'Update inputs and re-run anytime.';
  const showAnalysisPlaceholder = !state.isAnalyzing && !state.analysisResult && !state.analysisError;

  return (
    <div className={styles.appContainer}>
      {/* Navigation Panel */}
      <nav className={styles.navPanel}>
        <div className={styles.navBrand}>
          <h1>iCubicle</h1>
          <p>Blast loads inside cubes</p>
        </div>

        <div className={styles.navBody}>
          <section className={styles.navCard}>
            <header className={styles.navCardHeader}>
              <p className={styles.sectionTitle}>Cubicle Configuration</p>
            </header>
            <CubicleConfig
              cubicleType={state.cubicleType}
              setCubicleType={state.setCubicleType}
              length={state.length}
              setLength={state.setLength}
              width={state.width}
              setWidth={state.setWidth}
              height={state.height}
              setHeight={state.setHeight}
              onValidationChange={state.setFieldError}
            />
          </section>

          <section className={styles.navCard}>
            <header className={styles.navCardHeader}>
              <p className={styles.sectionTitle}>Opening Configuration</p>
            </header>
            <OpeningConfig
              openingFace={state.openingFace}
              setOpeningFace={state.setOpeningFace}
              openingWidth={state.openingWidth}
              setOpeningWidth={state.setOpeningWidth}
              openingHeight={state.openingHeight}
              setOpeningHeight={state.setOpeningHeight}
              onValidationChange={state.setFieldError}
            />
          </section>

          <section className={styles.navCard}>
            <header className={styles.navCardHeader}>
              <p className={styles.sectionTitle}>Threat Configuration</p>
            </header>
            <ThreatConfig
              threatXLocation={state.threatXLocation}
              setThreatXLocation={state.setThreatXLocation}
              threatYLocation={state.threatYLocation}
              setThreatYLocation={state.setThreatYLocation}
              threatZLocation={state.threatZLocation}
              setThreatZLocation={state.setThreatZLocation}
              threatWeight={state.threatWeight}
              setThreatWeight={state.setThreatWeight}
              maxLength={lengthValue}
              maxWidth={widthValue}
              maxHeight={heightValue}
              onValidationChange={state.setFieldError}
            />
          </section>

          <section className={styles.navCard}>
            <header className={styles.navCardHeader}>
              <p className={styles.sectionTitle}>Target Configuration</p>
            </header>
            <TargetConfig
              targetFace={state.targetFace}
              setTargetFace={state.setTargetFace}
              targetType={state.targetType}
              setTargetType={state.setTargetType}
              stripHeight={state.stripHeight}
              setStripHeight={state.setStripHeight}
              stripWidth={state.stripWidth}
              setStripWidth={state.setStripWidth}
              onValidationChange={state.setFieldError}
            />
          </section>

          <section className={styles.navCard}>
            <header className={styles.navCardHeader}>
              <p className={styles.sectionTitle}>Analysis Parameters</p>
            </header>
            <p className={styles.analysisNote}>Contains text output from the model.</p>
          </section>
        </div>

        <div className={styles.navFooter}>
          <button className={styles.analyzeButton} onClick={state.handleAnalyze} disabled={!state.isValid || state.isAnalyzing}>
            {state.isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
          <p className={styles.footerHint}>
            {state.isValid ? 'All fields validated. Ready to compute blast loads.' : 'Adjust inputs until validation passes.'}
          </p>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={styles.contentArea}>
        <header className={styles.dashboardHeader}>
          <div>
            <h2>Model Summary</h2>
          </div>
          <div className={styles.headerStatusGroup}>
            <span className={`${styles.statusPill} ${statusClassName}`}>{analysisStatus}</span>
            <span className={styles.statusHelper}>{analysisSummary}</span>
          </div>
        </header>

        <div className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Volume</span>
            <h3 className={styles.metricValue}>{volumeValue} ft³</h3>
            <p className={styles.metricMeta}>
              {state.length} ft x {state.width} ft x {state.height} ft
            </p>
          </article>

          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Opening</span>
            <h3 className={styles.metricValue}>{openingSummary}</h3>
            <p className={styles.metricMeta}>Face - {openingFaceLabel}</p>
          </article>

          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Target</span>
            <h3 className={styles.metricValue}>{targetSummary}</h3>
            <p className={styles.metricMeta}>Face - {targetFaceLabel}</p>
          </article>

          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Threat</span>
            <h3 className={styles.metricValue}>
              {Number.isFinite(threatWeightValue) ? `${threatWeightValue.toFixed(1)} lbs` : state.threatWeight || 'Unknown'}
            </h3>
            <p className={styles.metricMeta}>
              Location: X {state.threatXLocation} ft, Y {state.threatYLocation} ft, Z {state.threatZLocation} ft
            </p>
          </article>
        </div>

        <section className={styles.visualSection}>
          <div className={styles.visualHeader}>
            <div>
              <p className={styles.eyebrow}>Visualization</p>
            </div>
          </div>
          <Scene3D
            length={lengthValue}
            width={widthValue}
            height={heightValue}
            opening={opening}
            cubicleType={state.cubicleType}
            targetFace={state.targetFace}
            targetType={state.targetType}
            stripWidth={stripWidthValue}
            stripHeight={stripHeightValue}
            threatPosition={threatPosition}
            controlsRef={controlsRef}
          />
        </section>

        {/* Output Section */}
        <section className={styles.outputSection}>
          <div className={styles.outputHeader}>
            <div>
              <p className={styles.eyebrow}>Analysis & Output</p>
            </div>
            <span className={`${styles.statusPill} ${statusClassName}`}>{analysisStatus}</span>
          </div>

          <div className={styles.outputDisplay}>
            <h1>1</h1>
            <h1>2</h1>
            <h1>3</h1>
          </div>
        </section>
      </main>
    </div>
  );
}
