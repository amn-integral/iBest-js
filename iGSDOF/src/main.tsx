import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import { App } from "./App";
import "@integralrsg/igraph/styles";
// import { ReportPage } from "./pages/ReportPage";

// const RootComponent = ReportPage;
const RootComponent =App;

ReactDOM.createRoot(document.getElementById("react-root") as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);