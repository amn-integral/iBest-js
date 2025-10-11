import { BackboneCurve } from "./backbone";
import { ForceCurve } from "./force";

export interface InitialConditions {
  u0: number;
  v0: number;
}

export interface SolverSettings {
  t: number;
  dt?: number;
  auto?: boolean;
}

export interface NewmarkParameters {
  gamma: number;
  beta: number;
}

export interface NewmarkResponse {
  time: number[];
  displacement: number[];
  velocity: number[];
  acceleration: number[];
  stiffness: number[];
  restoringForce: number[];
  appliedForce: number[];
}

export const averageAcceleration: NewmarkParameters = {
  gamma: 0.5,
  beta: 0.25,
};

export const linearAcceleration: NewmarkParameters = {
  gamma: 0.5,
  beta: 1 / 6,
};

const TWO_PI = Math.PI * 2;
const DEFAULT_TOLERANCE = 0.01;
const MAX_ITERATIONS = 20;

export function newmarkSolver(
  mass: number,
  resistance: BackboneCurve,
  dampingRatio: number,
  force: ForceCurve,
  initialConditions: InitialConditions,
  settings: SolverSettings,
  params: NewmarkParameters = averageAcceleration,
): NewmarkResponse {
  const beta = params.beta;
  const gamma = params.gamma;

  const auto = settings.auto !== undefined ? settings.auto : true;
  const totalTime = settings.t;

  if (!auto && (!settings.dt || settings.dt <= 0)) {
    throw new Error("dt must be greater than 0 for fixed time step");
  }

  const naturalPeriod =
    TWO_PI * Math.sqrt(mass / resistance.inboundStiffness);
  const dt = auto ? 0.001 * naturalPeriod : (settings.dt as number);
  const steps = Math.floor(totalTime / dt) + 1;

  const invBeta = 1 / beta;
  const invBetaDt = invBeta / dt;
  const invBetaDt2 = invBetaDt / dt;
  const gammaOverBeta = gamma * invBeta;
  const gammaOverBetaDt = gammaOverBeta / dt;
  const oneMinusGammaOverBeta = 1 - gammaOverBeta;
  const oneMinusGammaOver2beta = 1 - 0.5 * gammaOverBeta;
  const dtOneMinusGammaOver2beta = dt * oneMinusGammaOver2beta;
  const inv2betaMinusOne = 0.5 * invBeta - 1;

  const rHat = new Array<number>(steps).fill(0);
  const pHat = new Array<number>(steps).fill(0);
  const kT = new Array<number>(steps).fill(0);
  const kTHat = new Array<number>(steps).fill(0);
  const u = new Array<number>(steps).fill(0);
  const v = new Array<number>(steps).fill(0);
  const a = new Array<number>(steps).fill(0);
  const time = new Array<number>(steps);
  const fs = new Array<number>(steps).fill(0);
  const applied = new Array<number>(steps).fill(0);

  for (let i = 0; i < steps; i += 1) {
    time[i] = i * dt;
  }

  u[0] = initialConditions.u0;
  v[0] = initialConditions.v0;

  resistance.updateCurrentRegion(u[0]);

  const forceDiscretized = force.discretizeCurve(steps, dt);
  const forces = forceDiscretized.f;
  applied[0] = forces[0];

  fs[0] = resistance.getAt(u[0]);
  kT[0] = resistance.getStiffnessInRegion(resistance.currentRegion);

  let klm = resistance.getKlmInRegion();
  const baseMass = mass;
  let effectiveMass = klm * baseMass;

  if (Math.abs(effectiveMass) < 1e-12) {
    throw new Error("Effective mass must be non-zero");
  }

  const stiffness0 = kT[0];
  let c =
    2 *
    dampingRatio *
    Math.sqrt(Math.abs(effectiveMass * stiffness0));
  if (effectiveMass * stiffness0 < 0) {
    c = -c;
  }

  a[0] = (applied[0] - c * v[0] - fs[0]) / effectiveMass;

  let a1 = effectiveMass * invBetaDt2 + c * gammaOverBetaDt;
  let a2 = effectiveMass * invBetaDt - c * oneMinusGammaOverBeta;
  let a3 = effectiveMass * inv2betaMinusOne - c * dtOneMinusGammaOver2beta;

  let prevRegion = resistance.currentRegion;
  const convTolSq = DEFAULT_TOLERANCE * DEFAULT_TOLERANCE;

  for (let i = 0; i < steps - 1; i += 1) {
    u[i + 1] = u[i];
    fs[i + 1] = fs[i];
    kT[i + 1] = kT[i];

    applied[i + 1] = forces[i + 1];

    pHat[i + 1] = applied[i + 1] + a1 * u[i] + a2 * v[i] + a3 * a[i];

    let iterations = 0;
    while (true) {
      rHat[i + 1] = pHat[i + 1] - fs[i + 1] - a1 * u[i + 1];
      if (rHat[i + 1] * rHat[i + 1] < convTolSq) {
        v[i + 1] =
          gammaOverBetaDt * (u[i + 1] - u[i]) +
          oneMinusGammaOverBeta * v[i] +
          dtOneMinusGammaOver2beta * a[i];
        a[i + 1] =
          invBetaDt2 * (u[i + 1] - u[i]) -
          invBetaDt * v[i] -
          inv2betaMinusOne * a[i];

        if (i > 0 && v[i] * v[i + 1] < 0) {
          resistance.shiftBackbone(u[i + 1]);
        }

        if (resistance.currentRegion !== prevRegion) {
          prevRegion = resistance.currentRegion;
          const newKlm = resistance.getKlmInRegion();
          if (newKlm !== klm) {
            klm = newKlm;
            effectiveMass = klm * baseMass;
            if (Math.abs(effectiveMass) < 1e-12) {
              throw new Error("Effective mass must be non-zero");
            }
            const newStiffness = kT[i + 1];
            let newC =
              2 *
              dampingRatio *
              Math.sqrt(Math.abs(effectiveMass * newStiffness));
            if (effectiveMass * newStiffness < 0) {
              newC = -newC;
            }
            c = newC;

            a1 = effectiveMass * invBetaDt2 + c * gammaOverBetaDt;
            a2 = effectiveMass * invBetaDt - c * oneMinusGammaOverBeta;
            a3 =
              effectiveMass * inv2betaMinusOne -
              c * dtOneMinusGammaOver2beta;
          }
        }
        break;
      }

      kTHat[i + 1] = kT[i + 1] + a1;
      const du = rHat[i + 1] / kTHat[i + 1];
      u[i + 1] += du;

      resistance.updateCurrentRegion(u[i + 1]);
      fs[i + 1] = resistance.getAt(u[i + 1]);
      kT[i + 1] = resistance.getStiffnessInRegion(resistance.currentRegion);

      iterations += 1;
      if (iterations > MAX_ITERATIONS) {
        break;
      }
    }

    prevRegion = resistance.currentRegion;
  }

  return {
    time,
    displacement: u,
    velocity: v,
    acceleration: a,
    stiffness: kT,
    restoringForce: fs,
    appliedForce: applied,
  };
}
