import type { SolverWorkerInputV2 } from "../types";



export function validateSolverInput(inp : SolverWorkerInputV2):  string[] {

  const errors: string[] = [];

  if (inp.mass <= 0) {
    errors.push("Mass must be positive");
  }

  if (inp.klm <= 0 || inp.klm > 1) {
    errors.push("Invalid klm: must be in (0, 1]");
  }

  if (inp.dampingRatio < 0 || inp.dampingRatio > 1) {
    errors.push("Invalid damping ratio: must be in [0, 1]");
  }

  if (inp.gravity_effect && (inp.added_weight < 0 || inp.gravity_constant <= 0)) {
    errors.push("Invalid gravity parameters: added weight and gravity constant must be positive when gravity effect is enabled");
  }

  if (inp.force.length !== inp.time.length) {
    errors.push("Force and time arrays must be of the same length");
  }

  if (inp.displacement.length !== inp.resistance.length) {
    errors.push("Displacement and resistance arrays must be of the same length");
  }

  return errors;
}