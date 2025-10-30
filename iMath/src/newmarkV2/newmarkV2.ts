import { BackboneCurveV2 } from './backboneV2';
import { ForceCurveV2 } from './forceV2';
import type { InitialConditions, SolverSettings, NewmarkParameters } from '../newmark/types';
import type { NewmarkResponseV2 } from './types';
import { averageAcceleration } from '../newmark/solver';

const TWO_PI = Math.PI * 2;
const MAX_ITERATIONS = 20;
const CONVERGNCE_TOLERANCE = 0.0001;

export function newmarkSolverV2(mass: number, klm: number, resistance: BackboneCurveV2, dampingRatio: number, force: ForceCurveV2, initialConditions: InitialConditions, settings: SolverSettings, gravity_effect: boolean = false, added_weight: number = 0, gravity_constant: number = 386, params: NewmarkParameters = averageAcceleration): NewmarkResponseV2 {
  const beta = params.beta,
    gamma = params.gamma;

  const auto = settings.auto !== undefined ? settings.auto : true;
  const totalTime = settings.t;

  if (!auto && (!settings.dt || settings.dt <= 0)) {
    throw new Error('dt must be greater than 0 for fixed time step');
  }

  const naturalPeriod = TWO_PI * Math.sqrt(mass / resistance.inboundStiffness);
  const dt = auto ? naturalPeriod / 50 : (settings.dt as number);
  const steps = Math.floor(totalTime / dt) + 1;

  const inv_beta = 1 / beta;
  const inv_beta_dt = inv_beta / dt;
  const inv_beta_dt2 = inv_beta_dt / dt;
  const gamma_over_beta = gamma * inv_beta;
  const gamma_over_beta_dt = gamma_over_beta / dt;
  const one_minus_gamma_over_beta = 1 - gamma_over_beta;
  const one_minus_gamma_over_2beta = 1 - 0.5 * gamma_over_beta;
  const dt_one_minus_gamma_over_2beta = dt * one_minus_gamma_over_2beta;
  const inv_2beta_minus_one = 0.5 * inv_beta - 1;

  // Initialize as Float32Array instead of regular arrays
  const rHat = new Float32Array(steps),pHat = new Float32Array(steps);
  const kT = new Float32Array(steps),kTHat = new Float32Array(steps);
  const u = new Float32Array(steps), v = new Float32Array(steps);
  const a = new Float32Array(steps), t = new Float32Array(steps);
  const fs = new Float32Array(steps), p = new Float32Array(steps);

  // Time array
  for (let i = 0; i < steps; i++) {
    t[i] = i * dt;
  }

  // Initial conditions
  ((u[0] = initialConditions.u0), (v[0] = initialConditions.v0));

  let gravity_force = 0.0;
  if (gravity_effect) {
    gravity_force += mass * gravity_constant + added_weight;
    u[0] = u[0] + gravity_force / resistance.inboundStiffness;
  }

  // Discretize force curve
  const force_discretized = force.discretizeCurve(steps, dt);
  const forces = force_discretized.f;
  p[0] = forces[0];

  // Initial calculations
  const [fs0, kt0] = resistance.getAt(u[0]);
  ((fs[0] = fs0), (kT[0] = kt0));

  if (gravity_force > resistance.maxResistance) {
    throw new Error(`Gravity force ${gravity_force.toFixed(4)} beyond backbone maximum resistance ${resistance.maxResistance.toFixed(4)}.`);
  }

  const m_eff = klm * mass;

  const c = 2 * dampingRatio * (m_eff * kT[0]) ** 0.5;
  a[0] = (p[0] - c * v[0] - fs[0] + gravity_force) / m_eff;

  // Newmark constants (using effective mass)
  const a1 = m_eff * inv_beta_dt2 + c * gamma_over_beta_dt;
  const a2 = m_eff * inv_beta_dt - c * one_minus_gamma_over_beta;
  const a3 = m_eff * inv_2beta_minus_one - c * dt_one_minus_gamma_over_2beta;

  console.log(['ti', 'pi', 'R̂i', '(kT)i', '(k̂T)i', 'Δu', 'ui', '(fS)i', 'u̇i', 'üi'].map((s) => s.padStart(10)).join(' '));
  console.log([t[0].toFixed(4).padStart(10), p[0].toFixed(4).padStart(10), ''.padStart(10), kT[0].toFixed(0).padStart(10), ''.padStart(10), ''.padStart(10), u[0].toFixed(4).padStart(10), ''.padStart(10), v[0].toFixed(4).padStart(10), a[0].toFixed(4).padStart(10)].join(' '));

  for (let i = 0; i < steps - 1; i++) {
    u[i + 1] = u[i];
    fs[i + 1] = fs[i];
    kT[i + 1] = kT[i];
    p[i + 1] = forces[i + 1];

    pHat[i + 1] = p[i + 1] + a1 * u[i] + a2 * v[i] + a3 * a[i] + gravity_force;
    let j = 1; // iteration counter

    // These are float64 by default
    let u_num = u[i + 1];
    let fs_num = fs[i + 1];
    let kT_num = kT[i + 1];
    let kTHat_num = kTHat[i + 1];
    let rHat_num = 0;
    let du = 0.0;
    
    while (true) {
      rHat_num = pHat[i + 1] - fs_num - a1 * u_num;
      // Check convergence
      if (rHat_num * rHat_num < CONVERGNCE_TOLERANCE) {

        u[i+1] = u_num;
        fs[i+1] = fs_num;
        kT[i+1] = kT_num;
        rHat[i+1] = rHat_num;
        kTHat[i+1] = kTHat_num;

        v[i + 1] = gamma_over_beta_dt * (u[i + 1] - u[i]) + one_minus_gamma_over_beta * v[i] + dt_one_minus_gamma_over_2beta * a[i];
        a[i + 1] = inv_beta_dt2 * (u[i + 1] - u[i]) - inv_beta_dt * v[i] - inv_2beta_minus_one * a[i];

        if (i > 0 && v[i] * v[i + 1] < 0) {
          resistance.shiftBackbone(u[i + 1]);
        }

        if (j === 1) {
          console.log([t[i + 1].toFixed(4).padStart(10), p[i + 1].toFixed(4).padStart(10), kTHat[i + 1].toFixed(0).padStart(10), kT[i + 1].toFixed(0).padStart(10), du.toFixed(4).padStart(10), u[i + 1].toFixed(4).padStart(10), fs[i + 1].toFixed(4).padStart(10), v[i + 1].toFixed(4).padStart(10), a[i + 1].toFixed(4).padStart(10)].join(' '));
        } else {
          console.log([''.padStart(20), rHat[i + 1].toFixed(4).padStart(10), kT[i + 1].toFixed(0).padStart(10), kTHat[i + 1].toFixed(0).padStart(10), du.toFixed(4).padStart(10), u[i + 1].toFixed(4).padStart(10), fs[i + 1].toFixed(4).padStart(10), v[i + 1].toFixed(4).padStart(10), a[i + 1].toFixed(4).padStart(10)].join(' '));
        }

        break;
      }

      kTHat_num = kT_num + a1;
      du = rHat_num / kTHat_num;
      u_num = u_num + du;
      [fs_num, kT_num] = resistance.getAt(u_num);

      if (j === 1) {
        console.log([t[i + 1].toFixed(4).padStart(10), p[i + 1].toFixed(4).padStart(10), rHat[i + 1].toFixed(4).padStart(10), kT[i + 1].toFixed(0).padStart(10), kTHat[i + 1].toFixed(0).padStart(10), du.toFixed(4).padStart(10), u[i + 1].toFixed(4).padStart(10), fs[i + 1].toFixed(4).padStart(10), v[i + 1].toFixed(4).padStart(10), a[i + 1].toFixed(4).padStart(10)].join(' '));
      }
      else {
        console.log([''.padStart(21), rHat[i + 1].toFixed(4).padStart(10), kT[i + 1].toFixed(0).padStart(10), kTHat[i + 1].toFixed(0).padStart(10), du.toFixed(4).padStart(10), u[i + 1].toFixed(4).padStart(10), fs[i + 1].toFixed(4).padStart(10), v[i + 1].toFixed(4).padStart(10), a[i + 1].toFixed(4).padStart(10)].join(' '));
      }
      j += 1;
      if (j > MAX_ITERATIONS) {
        throw new Error(`Newton-Raphson did not converge in ${MAX_ITERATIONS} iterations at time ${t[i + 1].toFixed(4)}s.`);
      }
    }
  }

  return {
    t: t,
    u: u,
    v: v,
    a: a,
    k: kT,
    fs: fs,
    p: p
  };
}
