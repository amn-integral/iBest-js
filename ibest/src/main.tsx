import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import { App } from "./App";
import { EditableGridPlayground } from "./pages/EditableGridPlayground";

const shouldShowPlayground =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().startsWith("/grid-test");

const RootComponent = shouldShowPlayground ? EditableGridPlayground : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);
