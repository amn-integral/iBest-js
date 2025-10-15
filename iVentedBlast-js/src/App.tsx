// App.tsx — Simplified main entry with component separation
import { useState } from "react";
import { CubicleForm } from "./components/CubicleForm";
import { CubicleViewer } from "./components/CubicleViewer";
import { Results } from "./components/Results";
import { useCubicleConfig } from "./hooks/useCubicleConfig";
import appCss from "./App.module.css";
import type { CubicleProps, ResultProps } from "../../iMath/src/ventedCubicle";
import { runVentedAnalysis } from "../../iMath/src/ventedCubicle";
import { fetchGRFData } from "./api/api";

export default function App() {
  const [plotTrigger, setPlotTrigger] = useState(0);
  const cubicleConfig = useCubicleConfig();
  const [results, setResults] = useState<ResultProps | null>(null);

  const handleAnalyze = async () => {
    const cubicleProps: CubicleProps = {
      cubicleType: cubicleConfig.cubicleType,
      fullyVentedType:
        cubicleConfig.cubicleType === "fully_vented"
          ? undefined
          : cubicleConfig.fullyVentedType,
      l: cubicleConfig.dims.l,
      b: cubicleConfig.dims.b,
      h: cubicleConfig.dims.h,
      openingFace: cubicleConfig.opening.face || undefined,
      openingWidth: cubicleConfig.opening.w || undefined,
      openingHeight: cubicleConfig.opening.h || undefined,
      chargeWeight: cubicleConfig.charge.W,
      chargeStandoff: cubicleConfig.charge.R,
      chargeAngle: cubicleConfig.charge.angle,
      pMax: cubicleConfig.charge.Pmax,
      iMax: cubicleConfig.charge.Imax,
    };

    try {
      const p_02_168 = await fetchGRFData("02_168.GRF");
      const analysisResults = await runVentedAnalysis(cubicleProps, p_02_168);
      setResults(analysisResults);
    } catch (err) {
      console.error("Analysis error:", err);
      setResults(null);
    }
  };

  return (
    <div className={appCss.rootLayout}>
      <div className={appCss.appLayout}>
        <aside className={appCss.formPane}>
          <CubicleForm
            {...cubicleConfig}
            onPlot={() => setPlotTrigger((p) => p + 1)}
            onAnalyze={handleAnalyze}
          />
        </aside>
        <main className={appCss.viewerPane}>
          <CubicleViewer {...cubicleConfig} plotTrigger={plotTrigger} />
          <Results results={results} />
        </main>
      </div>
    </div>
  );
}
