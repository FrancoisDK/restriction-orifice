export type FluidPhase = 'liquid' | 'gas';
export type SolveTarget = 'diameter' | 'flowrate' | 'pressureDrop';
export type EdgeProfile = 'sharp' | 'thick';
export type FlowInputMode = 'mass' | 'volumetric';

export interface OrificeInputs {
  phase: FluidPhase;
  solveTarget: SolveTarget;
  flowInputMode: FlowInputMode;

  // Pipe & Orifice Geometry (canonical SI)
  pipeIdMm: number;
  orificeDiaMm: number; // Used when solveTarget !== 'diameter'
  plateThicknessMm: number;
  edgeProfile: EdgeProfile;

  // Operating Conditions (canonical SI)
  upstreamPressureBarA: number; // P1 in bar(a)
  upstreamTempC: number; // T1 in °C
  permPressureDropBar: number; // ΔP_perm in bar (used when solveTarget !== 'pressureDrop')
  massFlowKgH: number; // Mass flow in kg/h (used when solveTarget !== 'flowrate' & flowInputMode === 'mass')
  volFlowLiquidM3H: number; // Liquid vol flow in m³/h
  stdVolFlowGasNm3H: number; // Gas std vol flow in Nm³/h (at 0 °C, 1.01325 bar(a))

  // Liquid Properties (canonical SI)
  liquidDensityKgM3: number;
  liquidViscosityCp: number;
  vaporPressureBarA: number; // Pv in bar(a)
  criticalPressureBarA: number; // Pc in bar(a)

  // Gas Properties (canonical SI)
  molecularWeight: number; // kg/kmol
  kRatio: number; // Cp/Cv
  zFactor: number; // Compressibility Z1
  gasViscosityCp: number;
}

export type RegimeSeverity = 'nominal' | 'warning' | 'critical';

export interface StageAnalysisRow {
  stages: number;
  dpPerStageBar: number; // Final/worst-stage ΔP (bar)
  boreDiaMm: number; // Worst-stage bore diameter (mm)
  beta: number;
  worstPvcBarA: number;
  machOrSigma: number; // Mo for gas, σ for liquid
  statusLabel: string;
  severity: RegimeSeverity;
}

export interface SweepPoint {
  dpPermBar: number;
  massFlowKgH: number;
  volFlowDisplaySi: number; // m3/h for liquid, Nm3/h for gas
  orificeDiaMm: number;
  machOrSigma: number;
  isChokedOrCavitating: boolean;
}

export interface OrificeResults {
  valid: boolean;
  errorMessage?: string;
  warnings: string[];

  // Solved / Effective Primary Values (SI)
  orificeDiaMm: number;
  pipeIdMm: number;
  beta: number;
  massFlowKgH: number;
  volFlowM3H: number; // Actual volumetric flow at upstream conditions (m3/h)
  stdVolFlowNm3H: number; // For gas: Nm3/h; for liquid: m3/h
  permPressureDropBar: number; // Non-recoverable ΔP_perm (bar)
  vcPressureDropBar: number; // Total vena contracta ΔP_vc (bar)
  pressureRecoveryPct: number; // % of ΔP_vc recovered downstream

  // Pressures (SI bar(a))
  p1BarA: number;
  pVcBarA: number;
  p2BarA: number;
  pCritOrPvBarA: number; // P_crit for gas, Pv for liquid

  // Coefficients & Dimensionless Numbers
  cd: number;
  expansionFactor: number; // ε (1.0 for liquid)
  reynoldsPipe: number;
  reynoldsOrifice: number;
  kLossPipe: number; // Permanent loss coefficient based on pipe velocity head

  // Velocities (SI m/s)
  velocityPipeInletMs: number;
  velocityOrificeMs: number;
  velocityPipeOutletMs: number;

  // Liquid Specific Diagnostics
  cavitationIndexSigma: number;
  incipientSigmaLimit: number;
  recoveryFactorFl: number;
  ffFactor: number;
  dpChokedBar: number;
  flashingMarginBar: number; // P2 - Pv

  // Gas Specific Diagnostics
  densityUpstreamKgM3: number;
  densityDownstreamKgM3: number;
  sonicVelocityUpstreamMs: number;
  sonicVelocityThroatMs: number;
  machOrifice: number;
  machDownstream: number;
  criticalPressureRatioRc: number;
  chokedMassFlowKgH: number;

  // Regime Classification (text-first + semantic severity)
  regimeLabel: string;
  regimeDetail: string;
  regimeSeverity: RegimeSeverity;
  isChoked: boolean;

  // Multi-stage & Sweep
  recommendedStages: number;
  stageAnalysis: StageAnalysisRow[];
  sweepCurve: SweepPoint[];
}

const R_UNIVERSAL = 8314.4626; // J / (kmol * K)
const P_STD_PA = 101325; // 1.01325 bar(a)
const T_STD_K = 273.15; // 0 °C

/**
 * ISO 5167-2 Reader-Harris/Gallagher Discharge Coefficient (D & D/2 taps)
 * with optional thick-plate reattachment adjustment when edgeProfile === 'thick'.
 */
export function computeCd(
  beta: number,
  rePipe: number,
  orificeDiaM: number,
  plateThicknessM: number,
  edgeProfile: EdgeProfile
): number {
  const b = Math.min(Math.max(beta, 0.01), 0.92);
  const re = Math.max(rePipe, 2000);
  const L1 = 1.0;
  const L2p = 0.47;
  const A = Math.pow((19000 * b) / re, 0.8);
  const M2p = (2 * L2p) / (1 - b);
  const b4 = Math.pow(b, 4);
  const b8 = b4 * b4;

  let cd =
    0.5961 +
    0.0261 * b * b -
    0.216 * b8 +
    0.000521 * Math.pow((1e6 * b) / re, 0.7) +
    (0.0188 + 0.0063 * A) * Math.pow(b, 3.5) * Math.pow(1e6 / re, 0.3) +
    (0.043 + 0.08 * Math.exp(-10 * L1) - 0.123 * Math.exp(-7 * L1)) *
      (1 - 0.11 * A) *
      (b4 / Math.max(1 - b4, 1e-6)) -
    0.031 * (M2p - 0.8 * Math.pow(M2p, 1.1)) * Math.pow(b, 1.3);

  // Clamp to physically sensible sharp-edged bounds
  cd = Math.min(Math.max(cd, 0.56), 0.66);

  if (edgeProfile === 'thick' && orificeDiaM > 0) {
    const tOverD = plateThicknessM / orificeDiaM;
    if (tOverD > 0.02) {
      // Idelchik / Ward-Smith thick-orifice reattachment boost
      const boost = 1 + 0.33 * (1 - Math.exp(-2.1 * (tOverD - 0.02)));
      cd = Math.min(cd * boost, 0.82);
    }
  }

  return cd;
}

/**
 * ISO 5167-2 Permanent Pressure Loss Ratio: ΔP_perm / ΔP_vc
 */
export function computePermLossRatio(beta: number, cd: number): number {
  const b = Math.min(Math.max(beta, 0.01), 0.95);
  const b2 = b * b;
  const b4 = b2 * b2;
  const root = Math.sqrt(Math.max(1 - b4 * (1 - cd * cd), 1e-9));
  const num = root - cd * b2;
  const den = root + cd * b2;
  return Math.min(Math.max(num / den, 0.02), 0.9999);
}

/**
 * ISO 5167-2 Gas Expansibility Factor ε
 */
export function computeExpansionFactor(
  beta: number,
  k: number,
  pVcPa: number,
  p1Pa: number
): number {
  const b = Math.min(Math.max(beta, 0.01), 0.92);
  const b4 = Math.pow(b, 4);
  const b8 = b4 * b4;
  const ratio = Math.min(Math.max(pVcPa / p1Pa, 0.01), 1.0);
  const eps = 1 - (0.351 + 0.256 * b4 + 0.93 * b8) * (1 - Math.pow(ratio, 1 / k));
  return Math.min(Math.max(eps, 0.45), 1.0);
}

function gasStdDensityKgM3(mw: number): number {
  // Normal conditions: 0 °C (273.15 K), 1.01325 bar(a), Z ≈ 1.0
  return (P_STD_PA * mw) / (1.0 * R_UNIVERSAL * T_STD_K);
}

/**
 * Compute mass flow rate (kg/s) for a given beta and permanent pressure drop (Pa)
 */
function evalMassFlowForBetaAndDpPerm(
  inputs: OrificeInputs,
  beta: number,
  dpPermPa: number,
  p1Pa: number,
  rho1: number,
  muPas: number
): {
  mDotKgS: number;
  cd: number;
  eps: number;
  psi: number;
  dpVcReqPa: number;
  dpVcEffPa: number;
  isChoked: boolean;
  rePipe: number;
} {
  const D = inputs.pipeIdMm / 1000;
  const d = beta * D;
  const Ao = (Math.PI * d * d) / 4;
  const Apipe = (Math.PI * D * D) / 4;
  const tM = inputs.plateThicknessMm / 1000;
  const b4 = Math.pow(beta, 4);
  const geomFactor = Ao / Math.sqrt(Math.max(1 - b4, 1e-9));

  let cd = 0.61;
  let psi = computePermLossRatio(beta, cd);
  let dpVcReqPa = dpPermPa / psi;
  let dpVcEffPa = dpVcReqPa;
  let eps = 1.0;
  let isChoked = false;
  let mDot = 0;
  let rePipe = 1e5;

  // Fixed-point iteration for Cd(Re_D) and psi(beta, Cd)
  for (let iter = 0; iter < 18; iter++) {
    psi = computePermLossRatio(beta, cd);
    dpVcReqPa = dpPermPa / psi;

    if (inputs.phase === 'liquid') {
      const pvPa = inputs.vaporPressureBarA * 1e5;
      const pcPa = Math.max(inputs.criticalPressureBarA * 1e5, pvPa * 1.05);
      const ff = 0.96 - 0.28 * Math.sqrt(Math.max(pvPa / pcPa, 0));
      const dpVcChoked = Math.max(p1Pa - ff * pvPa, 0);
      if (dpVcReqPa >= dpVcChoked && dpVcChoked > 0) {
        dpVcEffPa = dpVcChoked;
        isChoked = true;
      } else {
        dpVcEffPa = Math.max(dpVcReqPa, 0);
        isChoked = false;
      }
      eps = 1.0;
      mDot = cd * geomFactor * Math.sqrt(Math.max(2 * rho1 * dpVcEffPa, 0));
    } else {
      const k = Math.max(inputs.kRatio, 1.05);
      const rc = Math.pow(2 / (k + 1), k / (k - 1));
      const dpVcCrit = p1Pa * (1 - rc);
      if (dpVcReqPa >= dpVcCrit) {
        dpVcEffPa = dpVcCrit;
        isChoked = true;
      } else {
        dpVcEffPa = Math.max(dpVcReqPa, 0);
        isChoked = false;
      }
      const pVcEff = Math.max(p1Pa - dpVcEffPa, p1Pa * rc);
      eps = computeExpansionFactor(beta, k, pVcEff, p1Pa);
      mDot = cd * eps * geomFactor * Math.sqrt(Math.max(2 * rho1 * dpVcEffPa, 0));
    }

    const vPipe = mDot / Math.max(rho1 * Apipe, 1e-12);
    rePipe = Math.max((rho1 * vPipe * D) / Math.max(muPas, 1e-7), 100);
    const nextCd = computeCd(beta, rePipe, d, tM, inputs.edgeProfile);
    if (Math.abs(nextCd - cd) < 1e-6) {
      cd = nextCd;
      break;
    }
    cd = 0.5 * cd + 0.5 * nextCd;
  }

  return { mDotKgS: mDot, cd, eps, psi, dpVcReqPa, dpVcEffPa, isChoked, rePipe };
}

/**
 * Solve for permanent pressure drop (Pa) given mass flow (kg/s) and beta
 */
function solveDpPermForFlowAndBeta(
  inputs: OrificeInputs,
  beta: number,
  targetMDotKgS: number,
  p1Pa: number,
  rho1: number,
  muPas: number
): { dpPermPa: number; exceededChoked: boolean; maxChokedMDotKgS: number } {
  // First evaluate choked ceiling at ΔP_perm = P1 (or full vacuum)
  const maxEval = evalMassFlowForBetaAndDpPerm(inputs, beta, p1Pa * 0.9999, p1Pa, rho1, muPas);
  if (targetMDotKgS > maxEval.mDotKgS * 1.0001) {
    return {
      dpPermPa: p1Pa * 0.9999,
      exceededChoked: true,
      maxChokedMDotKgS: maxEval.mDotKgS,
    };
  }

  // Bisection on dpPermPa in [0, p1Pa * 0.9999]
  let lo = 0;
  let hi = p1Pa * 0.9999;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const res = evalMassFlowForBetaAndDpPerm(inputs, beta, mid, p1Pa, rho1, muPas);
    if (res.mDotKgS < targetMDotKgS) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return {
    dpPermPa: 0.5 * (lo + hi),
    exceededChoked: false,
    maxChokedMDotKgS: maxEval.mDotKgS,
  };
}

/**
 * Solve for beta given mass flow (kg/s) and permanent pressure drop (Pa)
 */
function solveBetaForFlowAndDpPerm(
  inputs: OrificeInputs,
  targetMDotKgS: number,
  dpPermPa: number,
  p1Pa: number,
  rho1: number,
  muPas: number
): { beta: number; exceededPipeCapacity: boolean } {
  const maxBeta = 0.92;
  const maxFlowEval = evalMassFlowForBetaAndDpPerm(inputs, maxBeta, dpPermPa, p1Pa, rho1, muPas);
  if (targetMDotKgS > maxFlowEval.mDotKgS) {
    return { beta: maxBeta, exceededPipeCapacity: true };
  }

  let lo = 0.015;
  let hi = maxBeta;
  for (let i = 0; i < 65; i++) {
    const mid = 0.5 * (lo + hi);
    const res = evalMassFlowForBetaAndDpPerm(inputs, mid, dpPermPa, p1Pa, rho1, muPas);
    if (res.mDotKgS < targetMDotKgS) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { beta: 0.5 * (lo + hi), exceededPipeCapacity: false };
}

export function calculateOrifice(inputs: OrificeInputs): OrificeResults {
  const warnings: string[] = [];

  // Validate basic geometry & state
  const D = inputs.pipeIdMm / 1000;
  const p1BarA = inputs.upstreamPressureBarA;
  const p1Pa = p1BarA * 1e5;
  const tempK = inputs.upstreamTempC + 273.15;

  if (D <= 0 || !Number.isFinite(D)) {
    return makeErrorResult(inputs, 'Pipe internal diameter must be greater than zero.');
  }
  if (p1Pa <= 0 || !Number.isFinite(p1Pa)) {
    return makeErrorResult(inputs, 'Upstream absolute pressure P₁ must be greater than zero.');
  }
  if (tempK <= 10 || !Number.isFinite(tempK)) {
    return makeErrorResult(inputs, 'Upstream temperature must be above absolute zero.');
  }

  // Fluid density & viscosity at upstream conditions
  let rho1 = 1000;
  let muPas = 1e-3;
  if (inputs.phase === 'liquid') {
    rho1 = inputs.liquidDensityKgM3;
    muPas = inputs.liquidViscosityCp * 1e-3;
    if (rho1 <= 0 || muPas <= 0) {
      return makeErrorResult(inputs, 'Liquid density and viscosity must be positive.');
    }
    if (inputs.vaporPressureBarA >= p1BarA) {
      warnings.push('Upstream pressure P₁ is at or below vapor pressure Pv — liquid enters flashing.');
    }
  } else {
    if (inputs.molecularWeight <= 0 || inputs.kRatio <= 1.01 || inputs.zFactor <= 0 || inputs.gasViscosityCp <= 0) {
      return makeErrorResult(inputs, 'Gas molecular weight, k (>1.01), Z-factor, and viscosity must be positive.');
    }
    rho1 = (p1Pa * inputs.molecularWeight) / (inputs.zFactor * R_UNIVERSAL * tempK);
    muPas = inputs.gasViscosityCp * 1e-3;
  }

  // Resolve target input mass flowrate (if not solving for flowrate)
  const rhoStdGas = gasStdDensityKgM3(inputs.molecularWeight);
  let inputMassFlowKgH = inputs.massFlowKgH;
  if (inputs.flowInputMode === 'volumetric') {
    if (inputs.phase === 'liquid') {
      inputMassFlowKgH = inputs.volFlowLiquidM3H * rho1;
    } else {
      inputMassFlowKgH = inputs.stdVolFlowGasNm3H * rhoStdGas;
    }
  }

  let solvedBeta = Math.min(Math.max(inputs.orificeDiaMm / inputs.pipeIdMm, 0.015), 0.92);
  let solvedDpPermPa = inputs.permPressureDropBar * 1e5;
  let solvedMDotKgS = inputMassFlowKgH / 3600;

  if (inputs.solveTarget === 'diameter') {
    if (inputMassFlowKgH <= 0) {
      return makeErrorResult(inputs, 'Flowrate must be greater than zero when solving for orifice diameter.');
    }
    if (inputs.permPressureDropBar <= 0 || inputs.permPressureDropBar >= p1BarA) {
      return makeErrorResult(
        inputs,
        'Non-recoverable ΔP must be positive and strictly less than upstream pressure P₁.'
      );
    }
    const sol = solveBetaForFlowAndDpPerm(inputs, solvedMDotKgS, solvedDpPermPa, p1Pa, rho1, muPas);
    solvedBeta = sol.beta;
    if (sol.exceededPipeCapacity) {
      warnings.push(
        'Requested flowrate exceeds maximum orifice capacity (β = 0.92) at this ΔP. Increase pipe diameter or ΔP.'
      );
    }
  } else if (inputs.solveTarget === 'flowrate') {
    if (inputs.orificeDiaMm <= 0 || inputs.orificeDiaMm >= inputs.pipeIdMm * 0.95) {
      return makeErrorResult(
        inputs,
        'Orifice bore diameter must be positive and smaller than pipe internal diameter.'
      );
    }
    if (inputs.permPressureDropBar <= 0 || inputs.permPressureDropBar >= p1BarA) {
      return makeErrorResult(
        inputs,
        'Non-recoverable ΔP must be positive and strictly less than upstream pressure P₁.'
      );
    }
    const evalFlow = evalMassFlowForBetaAndDpPerm(inputs, solvedBeta, solvedDpPermPa, p1Pa, rho1, muPas);
    solvedMDotKgS = evalFlow.mDotKgS;
  } else {
    // solveTarget === 'pressureDrop'
    if (inputs.orificeDiaMm <= 0 || inputs.orificeDiaMm >= inputs.pipeIdMm * 0.95) {
      return makeErrorResult(
        inputs,
        'Orifice bore diameter must be positive and smaller than pipe internal diameter.'
      );
    }
    if (inputMassFlowKgH <= 0) {
      return makeErrorResult(inputs, 'Flowrate must be greater than zero when solving for pressure drop.');
    }
    const solDp = solveDpPermForFlowAndBeta(inputs, solvedBeta, solvedMDotKgS, p1Pa, rho1, muPas);
    solvedDpPermPa = solDp.dpPermPa;
    if (solDp.exceededChoked) {
      const maxKgH = solDp.maxChokedMDotKgS * 3600;
      warnings.push(
        `Requested flowrate exceeds choked capacity (${maxKgH.toFixed(1)} kg/h) for this bore at P₁. Increase bore diameter or upstream pressure.`
      );
    }
  }

  // Final evaluation at converged (solvedBeta, solvedDpPermPa)
  const finalEval = evalMassFlowForBetaAndDpPerm(inputs, solvedBeta, solvedDpPermPa, p1Pa, rho1, muPas);
  if (inputs.solveTarget === 'flowrate') {
    solvedMDotKgS = finalEval.mDotKgS;
  }

  const d = solvedBeta * D;
  const orificeDiaMm = d * 1000;
  const Apipe = (Math.PI * D * D) / 4;
  const Ao = (Math.PI * d * d) / 4;
  const massFlowKgH = solvedMDotKgS * 3600;
  const volFlowM3H = (solvedMDotKgS / rho1) * 3600;
  const stdVolFlowNm3H = inputs.phase === 'liquid' ? volFlowM3H : massFlowKgH / rhoStdGas;

  const permPressureDropBar = solvedDpPermPa / 1e5;
  const vcPressureDropBar = finalEval.dpVcReqPa / 1e5;
  const p2BarA = Math.max(p1BarA - permPressureDropBar, 0.0001);
  // Actual vena contracta minimum pressure (cannot go below Pv in choked liquid or below P_crit if unrecovered? Wait: physically P_vc drops to Pv in liquid cavitation or toward P_crit/lower in gas supersonic expansion, show physical P_vc clamped >= 0.001)
  const pVcBarA =
    inputs.phase === 'liquid'
      ? Math.max(p1BarA - vcPressureDropBar, inputs.vaporPressureBarA * 0.85, 0.001)
      : Math.max(p1BarA - vcPressureDropBar, 0.001);
  const pressureRecoveryPct = (1 - finalEval.psi) * 100;

  // Velocities & Reynolds
  const vPipeIn = solvedMDotKgS / (rho1 * Apipe);
  const rePipe = finalEval.rePipe;
  const reOrifice = (rePipe / solvedBeta);

  // K loss coefficient based on pipe velocity head: ΔP_perm = K * 0.5 * rho * v_pipe^2
  const dynHeadPipe = 0.5 * rho1 * vPipeIn * vPipeIn;
  const kLossPipe = dynHeadPipe > 1e-6 ? solvedDpPermPa / dynHeadPipe : 0;

  // Phase-specific diagnostics
  let cavitationIndexSigma = 0;
  let incipientSigmaLimit = 0;
  let recoveryFactorFl = Math.sqrt(finalEval.psi);
  let ffFactor = 0.96;
  let dpChokedBar = 0;
  let flashingMarginBar = 0;

  let densityDownstreamKgM3 = rho1;
  let sonicVelocityUpstreamMs = 0;
  let sonicVelocityThroatMs = 0;
  let machOrifice = 0;
  let machDownstream = 0;
  let criticalPressureRatioRc = 0.528;
  let chokedMassFlowKgH = 0;
  let vOrifice = solvedMDotKgS / (rho1 * Ao);
  let vPipeOut = vPipeIn;
  let pCritOrPvBarA = inputs.vaporPressureBarA;

  let regimeLabel = 'Nominal Flow';
  let regimeDetail = 'Operating well within single-phase subcooled bounds.';
  let regimeSeverity: RegimeSeverity = 'nominal';

  if (inputs.phase === 'liquid') {
    const pv = inputs.vaporPressureBarA;
    const pc = Math.max(inputs.criticalPressureBarA, pv * 1.05);
    ffFactor = 0.96 - 0.28 * Math.sqrt(Math.max(pv / pc, 0));
    dpChokedBar = Math.max(finalEval.psi * (p1BarA - ffFactor * pv), 0);
    flashingMarginBar = p2BarA - pv;
    cavitationIndexSigma = permPressureDropBar > 1e-6 ? (p1BarA - pv) / permPressureDropBar : 999;
    incipientSigmaLimit = 1.35 / Math.max(finalEval.psi, 0.05);
    pCritOrPvBarA = pv;

    if (p2BarA <= pv) {
      regimeLabel = 'Downstream Flashing';
      regimeDetail = `Downstream pressure P₂ (${p2BarA.toFixed(2)} bar(a)) drops below vapor pressure Pv (${pv.toFixed(3)} bar(a)). Permanent two-phase vapor formation occurs.`;
      regimeSeverity = 'critical';
    } else if (finalEval.isChoked || p1BarA - vcPressureDropBar <= pv) {
      regimeLabel = 'Choked Cavitation';
      regimeDetail = `Vena contracta pressure dips below vapor pressure Pv (${pv.toFixed(3)} bar(a)); flow is cavitation-choked at ΔP_choked = ${dpChokedBar.toFixed(2)} bar. Multi-stage plates strongly recommended.`;
      regimeSeverity = 'critical';
    } else if (cavitationIndexSigma < incipientSigmaLimit) {
      regimeLabel = 'Incipient Cavitation Risk';
      regimeDetail = `Cavitation index σ (${cavitationIndexSigma.toFixed(2)}) is below the incipient threshold σᵢ (${incipientSigmaLimit.toFixed(2)}). Localized vapor bubble collapse may cause erosion/noise.`;
      regimeSeverity = 'warning';
    } else {
      regimeLabel = 'Subcooled Nominal';
      regimeDetail = `Cavitation index σ (${cavitationIndexSigma.toFixed(2)}) exceeds σᵢ (${incipientSigmaLimit.toFixed(2)}) and P_vc remains above Pv.`;
      regimeSeverity = 'nominal';
    }
  } else {
    const k = Math.max(inputs.kRatio, 1.05);
    const p2Pa = p2BarA * 1e5;
    densityDownstreamKgM3 = (p2Pa * inputs.molecularWeight) / (inputs.zFactor * R_UNIVERSAL * tempK);
    sonicVelocityUpstreamMs = Math.sqrt((k * inputs.zFactor * R_UNIVERSAL * tempK) / inputs.molecularWeight);
    sonicVelocityThroatMs = sonicVelocityUpstreamMs * Math.sqrt(2 / (k + 1));
    criticalPressureRatioRc = Math.pow(2 / (k + 1), k / (k - 1));
    const pCritBarA = p1BarA * criticalPressureRatioRc;
    pCritOrPvBarA = pCritBarA;

    // Choked mass flow ceiling for current bore
    const chokedEval = evalMassFlowForBetaAndDpPerm(inputs, solvedBeta, p1Pa * 0.9999, p1Pa, rho1, muPas);
    chokedMassFlowKgH = chokedEval.mDotKgS * 3600;

    // Orifice vena contracta Mach number from isentropic pressure ratio P1 / P_vc
    const pVcActualBarA = Math.max(p1BarA - finalEval.dpVcEffPa / 1e5, pCritBarA);
    const prRatio = Math.max(p1BarA / pVcActualBarA, 1.0);
    machOrifice = finalEval.isChoked
      ? 1.0
      : Math.min(Math.sqrt((2 / (k - 1)) * (Math.pow(prRatio, (k - 1) / k) - 1)), 1.0);

    // Local throat temperature & acoustic velocity at Mach M_o
    const tThroatK = tempK / (1 + ((k - 1) / 2) * machOrifice * machOrifice);
    const aLocal = Math.sqrt((k * inputs.zFactor * R_UNIVERSAL * tThroatK) / inputs.molecularWeight);
    vOrifice = machOrifice * aLocal;

    vPipeOut = solvedMDotKgS / (densityDownstreamKgM3 * Apipe);
    machDownstream = vPipeOut / sonicVelocityUpstreamMs;

    if (finalEval.isChoked || machOrifice >= 0.995) {
      regimeLabel = 'Choked / Sonic Flow (M = 1.0)';
      regimeDetail = `Vena contracta reaches critical pressure P* (${pCritBarA.toFixed(2)} bar(a)) at sonic velocity ${sonicVelocityThroatMs.toFixed(1)} m/s. Mass flow is capped at ${chokedMassFlowKgH.toFixed(0)} kg/h.`;
      regimeSeverity = 'critical';
    } else if (machOrifice >= 0.8 || machDownstream >= 0.3) {
      regimeLabel = 'Near-Sonic High Velocity';
      regimeDetail = `Orifice Mach number (${machOrifice.toFixed(2)}) or downstream Mach (${machDownstream.toFixed(2)}) is elevated. High acoustic noise / vibration likely.`;
      regimeSeverity = 'warning';
    } else {
      regimeLabel = 'Subsonic Nominal';
      regimeDetail = `Orifice Mach number (${machOrifice.toFixed(2)}) and downstream Mach (${machDownstream.toFixed(2)}) remain safely subsonic.`;
      regimeSeverity = 'nominal';
    }
  }

  // Geometry & Standard Validity Warnings
  if (solvedBeta < 0.15) {
    warnings.push(`Low beta ratio (β = ${solvedBeta.toFixed(3)} < 0.15): small bore may risk plugging or deviate from ISO 5167-2 tolerances.`);
  } else if (solvedBeta > 0.75) {
    warnings.push(`High beta ratio (β = ${solvedBeta.toFixed(3)} > 0.75): outside ISO 5167-2 standard range (0.10–0.75).`);
  }
  if (rePipe < 5000) {
    warnings.push(`Low pipe Reynolds number (Re_D = ${Math.round(rePipe).toLocaleString()} < 5,000): transitional/laminar regime increases Cd uncertainty.`);
  }
  if (inputs.phase === 'gas' && machDownstream > 0.3) {
    warnings.push(`Downstream pipe Mach (${machDownstream.toFixed(2)}) exceeds 0.30 — consider larger downstream pipe schedule to control noise.`);
  }

  // Multi-Stage Analysis (1 to 5 stages)
  const stageAnalysis: StageAnalysisRow[] = [];
  let recommendedStages = 1;
  let foundNominal = false;

  for (let n = 1; n <= 5; n++) {
    if (inputs.phase === 'liquid') {
      // Equal ΔP per stage (worst case is the final stage where inlet pressure is lowest)
      const dpStageBar = permPressureDropBar / n;
      const pStageInBarA = p1BarA - (n - 1) * dpStageBar;
      const stageInputs: OrificeInputs = {
        ...inputs,
        solveTarget: 'diameter',
        upstreamPressureBarA: pStageInBarA,
        permPressureDropBar: dpStageBar,
      };
      const solStage = solveBetaForFlowAndDpPerm(
        stageInputs,
        solvedMDotKgS,
        dpStageBar * 1e5,
        pStageInBarA * 1e5,
        rho1,
        muPas
      );
      const evalStage = evalMassFlowForBetaAndDpPerm(
        stageInputs,
        solStage.beta,
        dpStageBar * 1e5,
        pStageInBarA * 1e5,
        rho1,
        muPas
      );
      const pv = inputs.vaporPressureBarA;
      const sigmaStage = dpStageBar > 1e-6 ? (pStageInBarA - pv) / dpStageBar : 999;
      const sigmaLimStage = 1.35 / Math.max(evalStage.psi, 0.05);
      const pVcStage = pStageInBarA - evalStage.dpVcReqPa / 1e5;

      let sLabel = 'Subcooled';
      let sSev: RegimeSeverity = 'nominal';
      if (pStageInBarA - dpStageBar <= pv) {
        sLabel = 'Flashing';
        sSev = 'critical';
      } else if (evalStage.isChoked || pVcStage <= pv) {
        sLabel = 'Choked Cavitation';
        sSev = 'critical';
      } else if (sigmaStage < sigmaLimStage) {
        sLabel = 'Incipient Cav.';
        sSev = 'warning';
      }

      if (!foundNominal && sSev === 'nominal') {
        recommendedStages = n;
        foundNominal = true;
      }

      stageAnalysis.push({
        stages: n,
        dpPerStageBar: dpStageBar,
        boreDiaMm: solStage.beta * inputs.pipeIdMm,
        beta: solStage.beta,
        worstPvcBarA: Math.max(pVcStage, 0.001),
        machOrSigma: sigmaStage,
        statusLabel: sLabel,
        severity: sSev,
      });
    } else {
      // Equal pressure ratio per stage: r_stage = (P2/P1)^(1/n)
      // Worst case is final stage (lowest pressure -> largest bore, same Mach)
      const k = Math.max(inputs.kRatio, 1.05);
      const rTotal = p2BarA / p1BarA;
      const rStage = Math.pow(rTotal, 1 / n);
      const pStageInBarA = p1BarA * Math.pow(rStage, n - 1);
      const dpStageBar = pStageInBarA * (1 - rStage);
      const rhoStageIn = (pStageInBarA * 1e5 * inputs.molecularWeight) / (inputs.zFactor * R_UNIVERSAL * tempK);

      const stageInputs: OrificeInputs = {
        ...inputs,
        solveTarget: 'diameter',
        upstreamPressureBarA: pStageInBarA,
        permPressureDropBar: dpStageBar,
      };
      const solStage = solveBetaForFlowAndDpPerm(
        stageInputs,
        solvedMDotKgS,
        dpStageBar * 1e5,
        pStageInBarA * 1e5,
        rhoStageIn,
        muPas
      );
      const evalStage = evalMassFlowForBetaAndDpPerm(
        stageInputs,
        solStage.beta,
        dpStageBar * 1e5,
        pStageInBarA * 1e5,
        rhoStageIn,
        muPas
      );
      const rc = Math.pow(2 / (k + 1), k / (k - 1));
      const pVcStage = Math.max(pStageInBarA - evalStage.dpVcEffPa / 1e5, pStageInBarA * rc);
      const prRatio = Math.max(pStageInBarA / pVcStage, 1.0);
      const machStage = evalStage.isChoked
        ? 1.0
        : Math.min(Math.sqrt((2 / (k - 1)) * (Math.pow(prRatio, (k - 1) / k) - 1)), 1.0);

      let sLabel = 'Subsonic';
      let sSev: RegimeSeverity = 'nominal';
      if (evalStage.isChoked || machStage >= 0.995) {
        sLabel = 'Choked (M=1.0)';
        sSev = 'critical';
      } else if (machStage >= 0.8) {
        sLabel = 'Near-Sonic';
        sSev = 'warning';
      }

      if (!foundNominal && sSev === 'nominal') {
        recommendedStages = n;
        foundNominal = true;
      }

      stageAnalysis.push({
        stages: n,
        dpPerStageBar: dpStageBar,
        boreDiaMm: solStage.beta * inputs.pipeIdMm,
        beta: solStage.beta,
        worstPvcBarA: pVcStage,
        machOrSigma: machStage,
        statusLabel: sLabel,
        severity: sSev,
      });
    }
  }
  if (!foundNominal) {
    recommendedStages = 5;
  }

  // Parametric Sweep Curve (28 points from 2% of P1 up to 92% of P1)
  const sweepCurve: SweepPoint[] = [];
  const maxDpSweep = Math.min(p1BarA * 0.92, Math.max(permPressureDropBar * 1.8, p1BarA * 0.65));
  const steps = 28;
  for (let i = 1; i <= steps; i++) {
    const dpBar = (maxDpSweep * i) / steps;
    const dpPa = dpBar * 1e5;
    if (inputs.solveTarget === 'diameter') {
      // Sweep ΔP vs Orifice Diameter (at fixed flowrate)
      const sol = solveBetaForFlowAndDpPerm(inputs, solvedMDotKgS, dpPa, p1Pa, rho1, muPas);
      const ev = evalMassFlowForBetaAndDpPerm(inputs, sol.beta, dpPa, p1Pa, rho1, muPas);
      let ms = 0;
      let isBad = ev.isChoked;
      if (inputs.phase === 'liquid') {
        ms = (p1BarA - inputs.vaporPressureBarA) / dpBar;
        if (ms < 1.35 / Math.max(ev.psi, 0.05)) isBad = true;
      } else {
        const k = Math.max(inputs.kRatio, 1.05);
        const rc = Math.pow(2 / (k + 1), k / (k - 1));
        const pVcB = Math.max(p1BarA - ev.dpVcEffPa / 1e5, p1BarA * rc);
        ms = ev.isChoked ? 1.0 : Math.min(Math.sqrt((2 / (k - 1)) * (Math.pow(p1BarA / pVcB, (k - 1) / k) - 1)), 1.0);
        if (ms >= 0.8) isBad = true;
      }
      sweepCurve.push({
        dpPermBar: dpBar,
        massFlowKgH,
        volFlowDisplaySi: stdVolFlowNm3H,
        orificeDiaMm: sol.beta * inputs.pipeIdMm,
        machOrSigma: ms,
        isChokedOrCavitating: isBad,
      });
    } else {
      // Sweep ΔP vs Flowrate (at fixed orifice diameter)
      const ev = evalMassFlowForBetaAndDpPerm(inputs, solvedBeta, dpPa, p1Pa, rho1, muPas);
      const mKgH = ev.mDotKgS * 3600;
      const vSi = inputs.phase === 'liquid' ? (ev.mDotKgS / rho1) * 3600 : mKgH / rhoStdGas;
      let ms = 0;
      let isBad = ev.isChoked;
      if (inputs.phase === 'liquid') {
        ms = (p1BarA - inputs.vaporPressureBarA) / dpBar;
        if (ms < 1.35 / Math.max(ev.psi, 0.05)) isBad = true;
      } else {
        const k = Math.max(inputs.kRatio, 1.05);
        const rc = Math.pow(2 / (k + 1), k / (k - 1));
        const pVcB = Math.max(p1BarA - ev.dpVcEffPa / 1e5, p1BarA * rc);
        ms = ev.isChoked ? 1.0 : Math.min(Math.sqrt((2 / (k - 1)) * (Math.pow(p1BarA / pVcB, (k - 1) / k) - 1)), 1.0);
        if (ms >= 0.8) isBad = true;
      }
      sweepCurve.push({
        dpPermBar: dpBar,
        massFlowKgH: mKgH,
        volFlowDisplaySi: vSi,
        orificeDiaMm,
        machOrSigma: ms,
        isChokedOrCavitating: isBad,
      });
    }
  }

  return {
    valid: true,
    warnings,
    orificeDiaMm,
    pipeIdMm: inputs.pipeIdMm,
    beta: solvedBeta,
    massFlowKgH,
    volFlowM3H,
    stdVolFlowNm3H,
    permPressureDropBar,
    vcPressureDropBar,
    pressureRecoveryPct,
    p1BarA,
    pVcBarA,
    p2BarA,
    pCritOrPvBarA,
    cd: finalEval.cd,
    expansionFactor: finalEval.eps,
    reynoldsPipe: rePipe,
    reynoldsOrifice: reOrifice,
    kLossPipe,
    velocityPipeInletMs: vPipeIn,
    velocityOrificeMs: vOrifice,
    velocityPipeOutletMs: vPipeOut,
    cavitationIndexSigma,
    incipientSigmaLimit,
    recoveryFactorFl,
    ffFactor,
    dpChokedBar,
    flashingMarginBar,
    densityUpstreamKgM3: rho1,
    densityDownstreamKgM3,
    sonicVelocityUpstreamMs,
    sonicVelocityThroatMs,
    machOrifice,
    machDownstream,
    criticalPressureRatioRc,
    chokedMassFlowKgH,
    regimeLabel,
    regimeDetail,
    regimeSeverity,
    isChoked: finalEval.isChoked,
    recommendedStages,
    stageAnalysis,
    sweepCurve,
  };
}

function makeErrorResult(inputs: OrificeInputs, errorMessage: string): OrificeResults {
  return {
    valid: false,
    errorMessage,
    warnings: [],
    orificeDiaMm: inputs.orificeDiaMm,
    pipeIdMm: inputs.pipeIdMm,
    beta: 0,
    massFlowKgH: 0,
    volFlowM3H: 0,
    stdVolFlowNm3H: 0,
    permPressureDropBar: 0,
    vcPressureDropBar: 0,
    pressureRecoveryPct: 0,
    p1BarA: inputs.upstreamPressureBarA,
    pVcBarA: 0,
    p2BarA: 0,
    pCritOrPvBarA: 0,
    cd: 0,
    expansionFactor: 1,
    reynoldsPipe: 0,
    reynoldsOrifice: 0,
    kLossPipe: 0,
    velocityPipeInletMs: 0,
    velocityOrificeMs: 0,
    velocityPipeOutletMs: 0,
    cavitationIndexSigma: 0,
    incipientSigmaLimit: 0,
    recoveryFactorFl: 0,
    ffFactor: 0,
    dpChokedBar: 0,
    flashingMarginBar: 0,
    densityUpstreamKgM3: 0,
    densityDownstreamKgM3: 0,
    sonicVelocityUpstreamMs: 0,
    sonicVelocityThroatMs: 0,
    machOrifice: 0,
    machDownstream: 0,
    criticalPressureRatioRc: 0,
    chokedMassFlowKgH: 0,
    regimeLabel: 'Invalid Input',
    regimeDetail: errorMessage,
    regimeSeverity: 'critical',
    isChoked: false,
    recommendedStages: 1,
    stageAnalysis: [],
    sweepCurve: [],
  };
}
