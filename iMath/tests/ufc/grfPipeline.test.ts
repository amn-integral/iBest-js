/**
 * UFC Examples - TypeScript Translation
 * 
 * Direct translation of ufc_examples.py demonstrating the full
 * GRF interpolation pipeline for UFC Example 2A-4(A) and 2A-4(B)
 * 
 * Run with: npx tsx iMath/tests/ufc/grfPipeline.test.ts
 */

import { GRFPipeline, getGRFApi, breakLine } from "../../src/ufc/index.js";

// ---------------------------------------------------------------------------
// Example 2A-4(A)
// ---------------------------------------------------------------------------
async function example2A_4A() {
  breakLine();
  console.log("Example 2A-4(A)");
  breakLine();

  // Generate pressure curve names
  const pressureCurveList = Array.from({ length: 28 }, (_, i) => i + 73);
  const pressureCurveNames: string[] = [];
  for (const num of pressureCurveList) {
    pressureCurveNames.push(`02_${num.toString().padStart(3, "0")}A.GRF`);
    pressureCurveNames.push(`02_${num.toString().padStart(3, "0")}B.GRF`);
    pressureCurveNames.push(`02_${num.toString().padStart(3, "0")}C.GRF`);
    pressureCurveNames.push(`02_${num.toString().padStart(3, "0")}D.GRF`);
  }

  // Define parameters
  const ft = 1,
    lbs = 1;
  const H = 16 * ft;
  const L = 32 * ft;
  const h = 6 * ft;
  const Charge_weight = 205 * lbs;
  const l = 12 * ft;
  const RA = 5.33 * ft;
  const N = 2;

  console.log(` H=${H} ft`);
  console.log(` L=${L} ft`);
  console.log(` h=${h} ft`);
  console.log(` Charge_weight=${Charge_weight} lbs`);
  console.log(` l=${l} ft`);
  console.log(` RA=${RA} ft`);
  console.log(` N=${N}`);

  const W = 1.2 * Charge_weight;
  console.log(` W=${W} lbs`);

  const h_over_H = h / H;
  const l_over_L = l / L;
  const L_over_RA = L / RA;
  const L_over_H = L / H;
  const Za = RA / Math.pow(W, 1 / 3);

  console.log(` h_over_H=${h_over_H}`);
  console.log(` l_over_L=${l_over_L}`);
  console.log(` L_over_RA=${L_over_RA}`);
  console.log(` L_over_H=${L_over_H}`);
  console.log(` Za=${Za}`);

  // Pressure pipeline
  const p = new GRFPipeline(pressureCurveNames, getGRFApi);
  await p.getData(["N", "l/L", "h/H", "L/H"]);
  p.filterData("N", 2.0);

  p.interpolate(Za, "Za");
  p.combineBy("L/H", `Collapsed at Za =${Za}`);

  p.interpolate(L_over_H, "L/H");
  p.combineBy("l/L", `Collapsed at Za =${Za}, L/H = ${L_over_H}`);

  p.interpolate(l_over_L, "l/L");
  p.combineBy("h/H", `Collapsed at Za =${Za}, L/H = ${L_over_H}, h/H = ${h_over_H}`);

  p.interpolate(h_over_H, "h/H");

  const Pr = p.evaluate(L_over_RA);
  console.log(`Pr=${Pr}`);

  // Generate impulse curve names
  const impulseCurveList = Array.from({ length: 48 }, (_, i) => i + 101);
  const impulseCurveNames: string[] = [];
  for (const num of impulseCurveList) {
    impulseCurveNames.push(`02_${num.toString().padStart(3, "0")}A.GRF`);
    impulseCurveNames.push(`02_${num.toString().padStart(3, "0")}B.GRF`);
    impulseCurveNames.push(`02_${num.toString().padStart(3, "0")}C.GRF`);
    impulseCurveNames.push(`02_${num.toString().padStart(3, "0")}D.GRF`);
  }

  // Impulse pipeline
  const i = new GRFPipeline(impulseCurveNames, getGRFApi);
  await i.getData(["N", "l/L", "h/H", "L/H"]);
  i.filterData("N", 2.0);

  i.interpolate(Za, "Za");
  i.combineBy("L/H", `Collapsed at Za =${Za}`);

  i.interpolate(L_over_H, "L/H");
  i.combineBy("l/L", `Collapsed at Za =${Za}, L/H = ${L_over_H}`);

  i.interpolate(l_over_L, "l/L");
  i.combineBy("h/H", `Collapsed at Za =${Za}, L/H = ${L_over_H}, h/H = ${h_over_H}`);

  i.interpolate(h_over_H, "h/H");

  const ir_over_w_cube_root = i.evaluate(L_over_RA);
  console.log(`ir_over_w_cube_root=${ir_over_w_cube_root}`);

  breakLine();
}

// ---------------------------------------------------------------------------
// Example 2A-4(B)
// ---------------------------------------------------------------------------
async function example2A_4B() {
  console.log("Example 2A-4(B)");
  breakLine();

  // Generate pressure curve names
  const pressureCurveList = Array.from({ length: 28 }, (_, i) => i + 73);
  const pressureCurveNames: string[] = [];
  for (const num of pressureCurveList) {
    pressureCurveNames.push(`02_${num.toString().padStart(3, "0")}A.GRF`);
    pressureCurveNames.push(`02_${num.toString().padStart(3, "0")}B.GRF`);
    pressureCurveNames.push(`02_${num.toString().padStart(3, "0")}C.GRF`);
    pressureCurveNames.push(`02_${num.toString().padStart(3, "0")}D.GRF`);
  }

  // Generate impulse curve names
  const impulseCurveList = Array.from({ length: 48 }, (_, i) => i + 101);
  const impulseCurveNames: string[] = [];
  for (const num of impulseCurveList) {
    impulseCurveNames.push(`02_${num.toString().padStart(3, "0")}A.GRF`);
    impulseCurveNames.push(`02_${num.toString().padStart(3, "0")}B.GRF`);
    impulseCurveNames.push(`02_${num.toString().padStart(3, "0")}C.GRF`);
    impulseCurveNames.push(`02_${num.toString().padStart(3, "0")}D.GRF`);
  }

  // Define parameters
  const ft = 1,
    lbs = 1;
  const H = 16 * ft;
  const L = 36 * ft;
  const Charge_weight = 3750 * lbs;
  const h = 4 * ft;
  const l = 9 * ft;
  const Ra = 16.5 * ft;

  console.log(` H=${H} ft`);
  console.log(` L=${L} ft`);
  console.log(` Charge_weight=${Charge_weight} lbs`);
  console.log(` h=${h} ft`);
  console.log(` l=${l} ft`);
  console.log(` Ra=${Ra} ft`);

  const W = 1.2 * Charge_weight;
  console.log(` W=${W} lbs`);

  const h_over_H = h / H;
  const l_over_L = l / L;
  const L_over_RA = L / Ra;
  const L_over_H = L / H;
  const Za = Ra / Math.pow(W, 1 / 3);

  console.log(` h_over_H=${h_over_H}`);
  console.log(` l_over_L=${l_over_L}`);
  console.log(` L_over_RA=${L_over_RA}`);
  console.log(` L_over_H=${L_over_H}`);
  console.log(` Za=${Za}`);

  // Pressure pipeline
  const p = new GRFPipeline(pressureCurveNames, getGRFApi);
  await p.getData(["N", "l/L", "h/H", "L/H"]);
  p.filterData("N", 3.0);

  p.interpolate(Za, "Za");
  p.combineBy("L/H", `Collapsed at Za =${Za}`);

  p.interpolate(L_over_H, "L/H");
  p.combineBy("l/L", `Collapsed at Za =${Za}, L/H = ${L_over_H}`);

  p.interpolate(l_over_L, "l/L");
  p.combineBy("h/H", `Collapsed at Za =${Za}, L/H = ${L_over_H}, h/H = ${h_over_H}`);

  p.interpolate(h_over_H, "h/H");

  const Pr = p.evaluate(L_over_RA);
  console.log(`Pr=${Pr}`);

  // Impulse pipeline
  const i = new GRFPipeline(impulseCurveNames, getGRFApi);
  await i.getData(["N", "l/L", "h/H", "L/H"]);
  i.filterData("N", 3.0);

  i.interpolate(Za, "Za");
  i.combineBy("L/H", `Collapsed at Za =${Za}`);

  i.interpolate(L_over_H, "L/H");
  i.combineBy("l/L", `Collapsed at Za =${Za}, L/H = ${L_over_H}`);

  i.interpolate(l_over_L, "l/L");
  i.combineBy("h/H", `Collapsed at Za =${Za}, L/H = ${L_over_H}, h/H = ${h_over_H}`);

  i.interpolate(h_over_H, "h/H");

  const ir_over_w_cube_root = i.evaluate(L_over_RA);
  console.log(`ir_over_w_cube_root=${ir_over_w_cube_root}`);

  breakLine();
}

// Run all examples
async function main() {
  try {
    await example2A_4A();
    await example2A_4B();
    console.log("\n✅ All examples completed successfully!");
  } catch (error) {
    console.error("\n❌ Example failed:", error);
    throw error;
  }
}

main();
