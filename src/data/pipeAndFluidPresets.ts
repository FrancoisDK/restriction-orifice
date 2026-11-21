export type PipeSchedule = 'Sch 10' | 'Sch 40 / STD' | 'Sch 80 / XS' | 'Sch 160' | 'XXS';

export interface PipeSizeSpec {
  nps: string;
  dn: number;
  odMm: number;
  schedules: Partial<Record<PipeSchedule, number>>; // Internal diameter in mm
}

// Accurate ASME B36.10M / B36.19M pipe internal diameters (mm)
export const PIPE_CATALOG: PipeSizeSpec[] = [
  {
    nps: '1"',
    dn: 25,
    odMm: 33.4,
    schedules: { 'Sch 10': 27.86, 'Sch 40 / STD': 26.64, 'Sch 80 / XS': 24.30, 'Sch 160': 20.70, 'XXS': 15.22 },
  },
  {
    nps: '1.5"',
    dn: 40,
    odMm: 48.3,
    schedules: { 'Sch 10': 42.72, 'Sch 40 / STD': 40.89, 'Sch 80 / XS': 38.10, 'Sch 160': 33.99, 'XXS': 27.94 },
  },
  {
    nps: '2"',
    dn: 50,
    odMm: 60.3,
    schedules: { 'Sch 10': 54.79, 'Sch 40 / STD': 52.50, 'Sch 80 / XS': 49.25, 'Sch 160': 42.85, 'XXS': 38.18 },
  },
  {
    nps: '3"',
    dn: 80,
    odMm: 88.9,
    schedules: { 'Sch 10': 82.80, 'Sch 40 / STD': 77.93, 'Sch 80 / XS': 73.66, 'Sch 160': 66.65, 'XXS': 58.42 },
  },
  {
    nps: '4"',
    dn: 100,
    odMm: 114.3,
    schedules: { 'Sch 10': 108.20, 'Sch 40 / STD': 102.26, 'Sch 80 / XS': 97.18, 'Sch 160': 87.33, 'XXS': 80.06 },
  },
  {
    nps: '6"',
    dn: 150,
    odMm: 168.3,
    schedules: { 'Sch 10': 161.47, 'Sch 40 / STD': 154.05, 'Sch 80 / XS': 146.33, 'Sch 160': 131.75, 'XXS': 124.38 },
  },
  {
    nps: '8"',
    dn: 200,
    odMm: 219.1,
    schedules: { 'Sch 10': 211.56, 'Sch 40 / STD': 202.72, 'Sch 80 / XS': 193.68, 'Sch 160': 173.05, 'XXS': 174.63 },
  },
  {
    nps: '10"',
    dn: 250,
    odMm: 273.1,
    schedules: { 'Sch 10': 264.67, 'Sch 40 / STD': 254.51, 'Sch 80 / XS': 247.65, 'Sch 160': 215.90, 'XXS': 222.25 },
  },
  {
    nps: '12"',
    dn: 300,
    odMm: 323.9,
    schedules: { 'Sch 10': 314.71, 'Sch 40 / STD': 304.80, 'Sch 80 / XS': 298.45, 'Sch 160': 257.20, 'XXS': 273.05 },
  },
  {
    nps: '16"',
    dn: 400,
    odMm: 406.4,
    schedules: { 'Sch 10': 393.70, 'Sch 40 / STD': 387.35, 'Sch 80 / XS': 381.00, 'Sch 160': 325.40 },
  },
  {
    nps: '20"',
    dn: 500,
    odMm: 508.0,
    schedules: { 'Sch 10': 495.30, 'Sch 40 / STD': 488.95, 'Sch 80 / XS': 482.60, 'Sch 160': 408.00 },
  },
];

export interface LiquidPreset {
  id: string;
  name: string;
  densityKgM3: number;
  viscosityCp: number;
  vaporPressureBarA: number;
  criticalPressureBarA: number;
  defaultTempC: number;
  note: string;
}

export const LIQUID_PRESETS: LiquidPreset[] = [
  {
    id: 'water_20c',
    name: 'Water (20 °C)',
    densityKgM3: 998.2,
    viscosityCp: 1.002,
    vaporPressureBarA: 0.0234,
    criticalPressureBarA: 220.64,
    defaultTempC: 20,
    note: 'Standard ambient cooling / process water',
  },
  {
    id: 'bfw_120c',
    name: 'Boiler Feedwater (120 °C)',
    densityKgM3: 943.1,
    viscosityCp: 0.232,
    vaporPressureBarA: 1.985,
    criticalPressureBarA: 220.64,
    defaultTempC: 120,
    note: 'High-temperature deaerated BFW (elevated Pv cavitation risk)',
  },
  {
    id: 'light_crude',
    name: 'Light Crude Oil (40 °C)',
    densityKgM3: 825.0,
    viscosityCp: 4.2,
    vaporPressureBarA: 0.45,
    criticalPressureBarA: 28.0,
    defaultTempC: 40,
    note: '38° API hydrocarbon crude service',
  },
  {
    id: 'naphtha',
    name: 'Gasoline / Naphtha (25 °C)',
    densityKgM3: 735.0,
    viscosityCp: 0.48,
    vaporPressureBarA: 0.62,
    criticalPressureBarA: 31.5,
    defaultTempC: 25,
    note: 'Volatile light distillate fraction',
  },
  {
    id: 'brine_25',
    name: 'Brine 25% NaCl (25 °C)',
    densityKgM3: 1189.0,
    viscosityCp: 1.85,
    vaporPressureBarA: 0.024,
    criticalPressureBarA: 220.6,
    defaultTempC: 25,
    note: 'Produced water / concentrated saline stream',
  },
];

export interface GasPreset {
  id: string;
  name: string;
  molecularWeight: number; // g/mol (kg/kmol)
  kRatio: number; // Cp/Cv
  zFactor: number; // Compressibility Z1
  viscosityCp: number;
  defaultTempC: number;
  note: string;
}

export const GAS_PRESETS: GasPreset[] = [
  {
    id: 'natural_gas',
    name: 'Natural Gas (Methane-rich)',
    molecularWeight: 17.4,
    kRatio: 1.29,
    zFactor: 0.96,
    viscosityCp: 0.0115,
    defaultTempC: 30,
    note: 'Pipeline sales gas (~94% CH4)',
  },
  {
    id: 'air_dry',
    name: 'Dry Air (25 °C)',
    molecularWeight: 28.96,
    kRatio: 1.40,
    zFactor: 1.00,
    viscosityCp: 0.0185,
    defaultTempC: 25,
    note: 'Instrument / utility compressed air',
  },
  {
    id: 'nitrogen',
    name: 'Nitrogen (N₂)',
    molecularWeight: 28.01,
    kRatio: 1.40,
    zFactor: 1.00,
    viscosityCp: 0.0178,
    defaultTempC: 25,
    note: 'Inert purge / blanket gas',
  },
  {
    id: 'steam_superheated',
    name: 'Superheated Steam (260 °C)',
    molecularWeight: 18.015,
    kRatio: 1.31,
    zFactor: 0.95,
    viscosityCp: 0.0184,
    defaultTempC: 260,
    note: 'Medium-pressure superheated vapor',
  },
  {
    id: 'hydrogen',
    name: 'Hydrogen (H₂)',
    molecularWeight: 2.016,
    kRatio: 1.41,
    zFactor: 1.01,
    viscosityCp: 0.0089,
    defaultTempC: 35,
    note: 'High sonic velocity light gas service',
  },
  {
    id: 'co2',
    name: 'Carbon Dioxide (CO₂)',
    molecularWeight: 44.01,
    kRatio: 1.29,
    zFactor: 0.92,
    viscosityCp: 0.0152,
    defaultTempC: 30,
    note: 'Dense acid gas / capture stream',
  },
];
