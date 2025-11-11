import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";

const RootComponent =App;

ReactDOM.createRoot(document.getElementById("react-root") as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);