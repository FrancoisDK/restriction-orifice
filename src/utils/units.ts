export type UnitSystem = 'SI' | 'US';

export interface UnitLabels {
  pressureAbs: string;
  pressureDiff: string;
  diameter: string;
  temperature: string;
  density: string;
  viscosity: string;
  massFlow: string;
  volFlowLiquid: string;
  volFlowGas: string; // Standard volumetric flowrate
  velocity: string;
}

export const UNIT_LABELS: Record<UnitSystem, UnitLabels> = {
  SI: {
    pressureAbs: 'bar(a)',
    pressureDiff: 'bar',
    diameter: 'mm',
    temperature: '°C',
    density: 'kg/m³',
    viscosity: 'cP',
    massFlow: 'kg/h',
    volFlowLiquid: 'm³/h',
    volFlowGas: 'Nm³/h',
    velocity: 'm/s',
  },
  US: {
    pressureAbs: 'psia',
    pressureDiff: 'psi',
    diameter: 'in',
    temperature: '°F',
    density: 'lb/ft³',
    viscosity: 'cP',
    massFlow: 'lb/h',
    volFlowLiquid: 'gpm',
    volFlowGas: 'SCFM',
    velocity: 'ft/s',
  },
};

// Conversion factors relative to internal canonical SI units:
// Pressure: bar(a) / bar
// Diameter: mm
// Temperature: °C
// Density: kg/m³
// Viscosity: cP (mPa·s)
// Mass flow: kg/h
// Liquid Vol flow: m³/h
// Gas Std Vol flow: Nm³/h (at 0 °C, 1.01325 bar(a)) -> US uses SCFM (60 °F, 14.696 psia)
// Velocity: m/s

const BAR_TO_PSI = 14.5037738;
const MM_TO_IN = 0.0393700787;
const KGM3_TO_LBFT3 = 0.0624279606;
const KGH_TO_LBH = 2.20462262;
const M3H_TO_GPM = 4.40286754;
const MS_TO_FTS = 3.2808399;
// 1 Nm3/h (0 C, 1 atm) = 0.62135 SCFM (60 F, 1 atm)
const NM3H_TO_SCFM = (35.3146667 / 60) * (288.70556 / 273.15);

export function toDisplay(
  valueSi: number,
  kind:
    | 'pressureAbs'
    | 'pressureDiff'
    | 'diameter'
    | 'temperature'
    | 'density'
    | 'viscosity'
    | 'massFlow'
    | 'volFlowLiquid'
    | 'volFlowGas'
    | 'velocity',
  unitSystem: UnitSystem
): number {
  if (!Number.isFinite(valueSi)) return valueSi;
  if (unitSystem === 'SI') return valueSi;
  switch (kind) {
    case 'pressureAbs':
    case 'pressureDiff':
      return valueSi * BAR_TO_PSI;
    case 'diameter':
      return valueSi * MM_TO_IN;
    case 'temperature':
      return (valueSi * 9) / 5 + 32;
    case 'density':
      return valueSi * KGM3_TO_LBFT3;
    case 'viscosity':
      return valueSi;
    case 'massFlow':
      return valueSi * KGH_TO_LBH;
    case 'volFlowLiquid':
      return valueSi * M3H_TO_GPM;
    case 'volFlowGas':
      return valueSi * NM3H_TO_SCFM;
    case 'velocity':
      return valueSi * MS_TO_FTS;
  }
}

export function fromDisplay(
  valueDisplay: number,
  kind:
    | 'pressureAbs'
    | 'pressureDiff'
    | 'diameter'
    | 'temperature'
    | 'density'
    | 'viscosity'
    | 'massFlow'
    | 'volFlowLiquid'
    | 'volFlowGas'
    | 'velocity',
  unitSystem: UnitSystem
): number {
  if (!Number.isFinite(valueDisplay)) return valueDisplay;
  if (unitSystem === 'SI') return valueDisplay;
  switch (kind) {
    case 'pressureAbs':
    case 'pressureDiff':
      return valueDisplay / BAR_TO_PSI;
    case 'diameter':
      return valueDisplay / MM_TO_IN;
    case 'temperature':
      return ((valueDisplay - 32) * 5) / 9;
    case 'density':
      return valueDisplay / KGM3_TO_LBFT3;
    case 'viscosity':
      return valueDisplay;
    case 'massFlow':
      return valueDisplay / KGH_TO_LBH;
    case 'volFlowLiquid':
      return valueDisplay / M3H_TO_GPM;
    case 'volFlowGas':
      return valueDisplay / NM3H_TO_SCFM;
    case 'velocity':
      return valueDisplay / MS_TO_FTS;
  }
}

export function fmtNum(val: number, decimals = 2): string {
  if (!Number.isFinite(val)) return '—';
  const abs = Math.abs(val);
  if (abs === 0) return (0).toFixed(decimals);
  if (abs >= 10000) {
    return val.toLocaleString('en-US', { maximumFractionDigits: Math.min(decimals, 1), minimumFractionDigits: 0 });
  }
  if (abs < 0.01 && decimals < 4) {
    return val.toFixed(4);
  }
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
