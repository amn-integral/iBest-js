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

  const threatPosition = useMemo<[number, number, number]>(() => [threatXValue, threatYValue, threatZValue], [threatXValue, threatYValue, threatZValue]);

  const opening = useMemo(
    () => ({
      face: state.openingFace,
      width: openingWidthValue,
      height: openingHeightValue
    }),
    [state.openingFace, openingWidthValue, openingHeightValue]
  );

  return (
    <div className={styles.appContainer}>
      {/* Navigation Panel */}
      <nav className={styles.navPanel}>
        <h1 className={styles.navHeader}>Cubicle Designer</h1>

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

        <OpeningConfig
          openingFace={state.openingFace}
          setOpeningFace={state.setOpeningFace}
          openingWidth={state.openingWidth}
          setOpeningWidth={state.setOpeningWidth}
          openingHeight={state.openingHeight}
          setOpeningHeight={state.setOpeningHeight}
          onValidationChange={state.setFieldError}
        />

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

        <hr />
        <button className={styles.analyzeButton} onClick={state.handleAnalyze} disabled={!state.isValid || state.isAnalyzing}>
          {state.isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
      </nav>

      {/* Main Content Area */}
      <main className={styles.contentArea}>
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

        {/* Output Section */}
        <section className={styles.outputSection}>
          <h2 className={styles.outputHeader}>Analysis & Output</h2>
          <div className={styles.outputContent}>
            <p>
              <strong>Dimensions:</strong> {state.length} × {state.width} × {state.height} ft
            </p>
            <p>
              <strong>Volume:</strong> {(lengthValue * widthValue * heightValue).toFixed(2)} ft³
            </p>
            <p>
              <strong>Opening:</strong> {state.openingWidth} × {state.openingHeight} in on {state.openingFace} face
            </p>
            {state.targetType === TargetTypeConst.Strip && (
              <p>
                <strong>Target Strip:</strong> {state.stripWidth} × {state.stripHeight} ft
              </p>
            )}
            <p>
              <strong>Cubicle Type:</strong> {CUBICLE_TYPES.find(type => type.value === state.cubicleType)?.label || 'Unknown'}
            </p>

            <hr className={styles.outputDivider} />

            {state.isAnalyzing && (
              <div className={styles.analysisLoading}>
                <p>
                  <strong>Analyzing...</strong>
                </p>
              </div>
            )}

            {state.analysisResult && (
              <div className={styles.analysisResultOutput}>
                <h3>Analysis Results</h3>
                <div className={styles.resultContent} dangerouslySetInnerHTML={{ __html: state.analysisResult }} />
              </div>
            )}

            {state.analysisError && (
              <div className={styles.analysisErrorOutput}>
                <h3>Error</h3>
                <p>{state.analysisError}</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
