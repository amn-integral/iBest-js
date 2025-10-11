import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distRoot = pathToFileURL(resolve(__dirname, "../dist/index.js")).href;

const {
  BackboneCurve,
  ForceCurve,
  newmarkSolver,
  averageAcceleration,
} = await import(distRoot);

function approxEqual(actual, expected, tolerance = 1e-3) {
  assert.equal(actual.length, expected.length, "Array lengths differ");
  for (let i = 0; i < actual.length; i += 1) {
    const diff = Math.abs(actual[i] - expected[i]);
    assert.ok(
      diff <= tolerance,
      `Value mismatch at index ${i}: expected=${expected[i]} actual=${actual[i]} diff=${diff}`,
    );
  }
}

(function runChopraValidationCase() {
  const inboundPoints = [
    { displacement: 0.75, resistance: 7.5, klm: 1.0 },
    { displacement: 10, resistance: 7.5, klm: 1.0 },
  ];
  const reboundPoints = [
    { displacement: -0.75, resistance: -7.5, klm: 1.0 },
    { displacement: -10, resistance: -7.5, klm: 1.0 },
  ];
  const backbone = new BackboneCurve(inboundPoints, reboundPoints);

  const force = new ForceCurve(
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    [0, 5, 8.66, 10, 8.66, 5, 0.0, 0.0, 0.0, 0.0, 0.0],
  );

  const start = process.hrtime.bigint();
  const response = newmarkSolver(
    0.2553,
    backbone,
    0.05,
    force,
    { u0: 0.0, v0: 0.0 },
    { t: 1, dt: 0.1, auto: false },
    averageAcceleration,
  );
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;

  const expected = {
    time: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    displacement: [
      0.0, 0.043359, 0.231092, 0.608534, 1.108713, 1.613999, 1.980945,
      2.08824, 1.920129, 1.559493, 1.142098,
    ],
    velocity: [
      0.0, 0.867185, 2.887468, 4.661377, 5.342198, 4.763526, 2.57539,
      -0.429482, -2.932746, -4.279976, -4.067924,
    ],
    acceleration: [
      0.0, 17.343704, 23.061958, 12.41621, 1.200226, -12.773683, -30.989027,
      -29.108409, -20.95687, -5.987726, 10.228757,
    ],
    stiffness: [10.0, 10.0, 10.0, 10.0, 0.0, 0.0, 0.0, 0.0, 10.0, 10.0, 10.0],
    restoringForce: [
      0.0, 0.433593, 2.310919, 6.085342, 7.5, 7.5, 7.5, 7.5, 5.818886,
      2.212526, -1.961424,
    ],
    appliedForce: [0, 5, 8.66, 10, 8.66, 5, 0, 0, 0, 0, 0],
  };

  approxEqual(response.time, expected.time);
  approxEqual(response.displacement, expected.displacement);
  approxEqual(response.velocity, expected.velocity);
  approxEqual(response.acceleration, expected.acceleration);
  approxEqual(response.stiffness, expected.stiffness, 1e-6);
  approxEqual(response.restoringForce, expected.restoringForce);
  approxEqual(response.appliedForce, expected.appliedForce, 1e-6);

  const maxDisplacement = Math.max(...response.displacement);
  const lastDisplacement = response.displacement[response.displacement.length - 1];
  console.log(`Solver run time: ${durationMs.toFixed(3)} ms`);
  console.log(
    `Max displacement: ${maxDisplacement.toFixed(6)}, final displacement: ${lastDisplacement.toFixed(6)}`,
  );
})();

console.log("All Newmark solver tests passed.");
