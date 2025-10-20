import React from "react";
import ReactDOM from "react-dom/client";
import { UserInputExample } from "./UserInputExample";
import "./main.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="app">
      <h1>iUIComponents Examples</h1>
      <UserInputExample />
    </div>
  </React.StrictMode>
);
