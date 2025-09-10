// App.tsx — Simplified main entry with component separation
import { useState } from "react";
import { CubicleForm } from "./components/CubicleForm";
import { CubicleViewer } from "./components/CubicleViewer";
import { Results } from "./components/Results";
import { useCubicleConfig } from "./hooks/useCubicleConfig";
import appCss from "./App.module.css";

// import {lerp} from "@integralrsg/imath"

export default function App() {
  const [plotTrigger, setPlotTrigger] = useState(0);
  const cubicleConfig = useCubicleConfig();

  return (
    <div className={appCss.rootLayout}>
      <div className={appCss.header}></div>
      <div className={appCss.appLayout}>
        <aside className={appCss.formPane}>
          <CubicleForm {...cubicleConfig} onSubmit={() => setPlotTrigger(p => p + 1)} />
        </aside>
        <main className={appCss.viewerPane}>
          <CubicleViewer {...cubicleConfig} plotTrigger={plotTrigger} />
          <Results />
        </main>
      </div>
      <div className={appCss.footer}>
      </div>
    </div>
  );
}
