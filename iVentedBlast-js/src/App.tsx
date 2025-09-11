// App.tsx — Simplified main entry with component separation
import { useState } from "react";
import { CubicleForm } from "./components/CubicleForm";
import { CubicleViewer } from "./components/CubicleViewer";
import { Results } from "./components/Results";
import { useCubicleConfig } from "./hooks/useCubicleConfig";
import appCss from "./App.module.css";
import {type PostData, type ResultData} from "./api/api-types";
import { PostVentedtedBlast } from "./api/api"; 

// import {lerp} from "@integralrsg/imath"



export default function App() {
  const [plotTrigger, setPlotTrigger] = useState(0);
  const cubicleConfig = useCubicleConfig();
  const [results, setResults] = useState<ResultData | null>(null);

  const handleAnalyze = async () => {

    const postData : PostData = {
      cubicleType: cubicleConfig.cubicleType,
      l : cubicleConfig.dims.l,
      b : cubicleConfig.dims.b,
      h : cubicleConfig.dims.h,
      openingFace: cubicleConfig.opening.face || undefined,
      openingWidth: cubicleConfig.opening.w || undefined,
      openingHeight: cubicleConfig.opening.h || undefined,
      chargeWeight: cubicleConfig.charge.W,
      chargeStandoff: cubicleConfig.charge.R,
      chargeAngle: cubicleConfig.charge.angle,
      pMax: cubicleConfig.charge.Pmax,
      iMax: cubicleConfig.charge.Imax
    }

    const analysisResults = await PostVentedtedBlast(postData);
    setResults(analysisResults);
  };

  return (
    <div className={appCss.rootLayout}>
      <div className={appCss.appLayout}>
        <aside className={appCss.formPane}>
          <CubicleForm {...cubicleConfig} onPlot={() => setPlotTrigger(p => p + 1)} onAnalyze={handleAnalyze} />
        </aside>
        <main className={appCss.viewerPane}>
          <CubicleViewer {...cubicleConfig} plotTrigger={plotTrigger} />
          <Results results={results} />
        </main>
      </div>
      </div>
  );
}
