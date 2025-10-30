import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distRoot = pathToFileURL(resolve(__dirname, "../dist/index.js")).href;

import {
  BackboneCurveV2,
  ForceCurveV2,
  newmarkSolverV2,
} from "../dist/index.js";
import { averageAcceleration } from "../dist/index.js";


(function runChopraValidationCase() {
  const resistance = [-7.5, 0, 7.5];
  const displacement = [-0.75, 0, 0.75];
  const backbone = new BackboneCurveV2(resistance, displacement);

  const force = new ForceCurveV2(
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    [0, 5, 8.66, 10, 8.66, 5, 0.0, 0.0, 0.0, 0.0, 0.0]
  );

  const start = process.hrtime.bigint();
  const response = newmarkSolverV2(
    0.2553,
    1.0,
    backbone,
    0.05,
    force,
    { u0: 0.0, v0: 0.0 },
    { t: 1, dt: 0.1, auto: false },
  );
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;
  console.log(`Solver run time: ${durationMs.toFixed(3)} ms`);
})();
