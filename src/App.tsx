import React, { useState, useMemo } from 'react';
import { Download, RotateCcw, AlertTriangle, ArrowRight, FileCode, FileText } from 'lucide-react';
import {
  PIPE_CATALOG,
  LIQUID_PRESETS,
  GAS_PRESETS,
  PipeSchedule,
} from './data/pipeAndFluidPresets';
import { UnitSystem, UNIT_LABELS, toDisplay, fmtNum } from './utils/units';
import {
  OrificeInputs,
  SolveTarget,
  FluidPhase,
  calculateOrifice,
} from './utils/orificeCalculations';
import { NumericField } from './components/NumericField';
import { HydraulicProfileSvg } from './components/HydraulicProfileSvg';
import { PerformanceCurveSvg } from './components/PerformanceCurveSvg';
import { DatasheetExportModal } from './components/DatasheetExportModal';
import { EngineeringReference } from './components/EngineeringReference';
import { exportOrificePdf } from './utils/pdfExport';
import { buildStandaloneHtml, StandaloneAppState } from './utils/standaloneHtmlBuilder';

const INITIAL_INPUTS: OrificeInputs = {
  phase: 'liquid',
  solveTarget: 'diameter',
  flowInputMode: 'volumetric',
  pipeIdMm: 77.93, // 3" Sch 40
  orificeDiaMm: 35.0,
  plateThicknessMm: 3.2,
  edgeProfile: 'sharp',
  upstreamPressureBarA: 10.0,
  upstreamTempC: 20.0,
  permPressureDropBar: 4.5,
  massFlowKgH: 25000,
  volFlowLiquidM3H: 25.0,
  stdVolFlowGasNm3H: 3500,
  liquidDensityKgM3: 998.2,
  liquidViscosityCp: 1.002,
  vaporPressureBarA: 0.0234,
  criticalPressureBarA: 220.64,
  molecularWeight: 17.4,
  kRatio: 1.29,
  zFactor: 0.96,
  gasViscosityCp: 0.0115,
};

export default function App() {
  const [inputs, setInputs] = useState<OrificeInputs>(INITIAL_INPUTS);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('SI');
  const [pipeMode, setPipeMode] = useState<'standard' | 'custom'>('standard');
  const [selectedNps, setSelectedNps] = useState<string>('3"');
  const [selectedSchedule, setSelectedSchedule] = useState<PipeSchedule>('Sch 40 / STD');
  const [selectedLiquidPresetId, setSelectedLiquidPresetId] = useState<string>('water_20c');
  const [selectedGasPresetId, setSelectedGasPresetId] = useState<string>('natural_gas');
  const [exportOpen, setExportOpen] = useState(false);

  const labels = UNIT_LABELS[unitSystem];
  const results = useMemo(() => calculateOrifice(inputs), [inputs]);

  // Iterative carry-over when switching solveTarget so engineers can size -> round -> re-verify seamlessly
  const handleChangeSolveTarget = (nextTarget: SolveTarget) => {
    if (nextTarget === inputs.solveTarget) return;
    setInputs((prev) => {
      const next = { ...prev, solveTarget: nextTarget };
      if (results.valid) {
        if (prev.solveTarget === 'diameter') {
          next.orificeDiaMm = Number(results.orificeDiaMm.toFixed(2));
        } else if (prev.solveTarget === 'flowrate') {
          next.massFlowKgH = Number(results.massFlowKgH.toFixed(1));
          next.volFlowLiquidM3H = Number(results.volFlowM3H.toFixed(2));
          next.stdVolFlowGasNm3H = Number(results.stdVolFlowNm3H.toFixed(1));
        } else if (prev.solveTarget === 'pressureDrop') {
          next.permPressureDropBar = Number(results.permPressureDropBar.toFixed(3));
        }
      }
      return next;
    });
  };

  const handlePhaseChange = (nextPhase: FluidPhase) => {
    if (nextPhase === inputs.phase) return;
    setInputs((prev) => ({
      ...prev,
      phase: nextPhase,
      upstreamTempC:
        nextPhase === 'liquid'
          ? LIQUID_PRESETS.find((p) => p.id === selectedLiquidPresetId)?.defaultTempC ?? 20
          : GAS_PRESETS.find((p) => p.id === selectedGasPresetId)?.defaultTempC ?? 30,
    }));
  };

  const handleSelectPipeSpec = (nps: string, sched: PipeSchedule) => {
    setSelectedNps(nps);
    setSelectedSchedule(sched);
    const spec = PIPE_CATALOG.find((p) => p.nps === nps);
    const idMm = spec?.schedules[sched] ?? spec?.schedules['Sch 40 / STD'];
    if (idMm) {
      setInputs((prev) => ({ ...prev, pipeIdMm: idMm }));
    }
  };

  const handleSelectLiquidPreset = (presetId: string) => {
    setSelectedLiquidPresetId(presetId);
    if (presetId === 'custom') return;
    const p = LIQUID_PRESETS.find((item) => item.id === presetId);
    if (p) {
      setInputs((prev) => ({
        ...prev,
        liquidDensityKgM3: p.densityKgM3,
        liquidViscosityCp: p.viscosityCp,
        vaporPressureBarA: p.vaporPressureBarA,
        criticalPressureBarA: p.criticalPressureBarA,
        upstreamTempC: p.defaultTempC,
      }));
    }
  };

  const handleSelectGasPreset = (presetId: string) => {
    setSelectedGasPresetId(presetId);
    if (presetId === 'custom') return;
    const g = GAS_PRESETS.find((item) => item.id === presetId);
    if (g) {
      setInputs((prev) => ({
        ...prev,
        molecularWeight: g.molecularWeight,
        kRatio: g.kRatio,
        zFactor: g.zFactor,
        gasViscosityCp: g.viscosityCp,
        upstreamTempC: g.defaultTempC,
      }));
    }
  };

  const handleReset = () => {
    setInputs(INITIAL_INPUTS);
    setPipeMode('standard');
    setSelectedNps('3"');
    setSelectedSchedule('Sch 40 / STD');
    setSelectedLiquidPresetId('water_20c');
    setSelectedGasPresetId('natural_gas');
  };

  const currentPipeSpec = PIPE_CATALOG.find((p) => p.nps === selectedNps);
  const availableSchedules = currentPipeSpec
    ? (Object.keys(currentPipeSpec.schedules) as PipeSchedule[])
    : (['Sch 40 / STD'] as PipeSchedule[]);

  const currentFluidLabel =
    inputs.phase === 'liquid'
      ? LIQUID_PRESETS.find((p) => p.id === selectedLiquidPresetId)?.name ?? 'Custom Liquid'
      : GAS_PRESETS.find((g) => g.id === selectedGasPresetId)?.name ?? 'Custom Gas';

  const currentPipeLabel =
    pipeMode === 'standard'
      ? `NPS ${selectedNps} (DN${currentPipeSpec?.dn ?? ''}) ${selectedSchedule}`
      : 'Custom Pipe ID';

  // Primary solved readout details
  const primaryMetric = useMemo(() => {
    if (!results.valid) {
      return {
        kicker: 'Calculation Error',
        value: '—',
        unit: '',
        sub: results.errorMessage ?? 'Check input parameters',
      };
    }
    if (inputs.solveTarget === 'diameter') {
      return {
        kicker: 'Solved Orifice Bore Diameter (d)',
        value: fmtNum(toDisplay(results.orificeDiaMm, 'diameter', unitSystem), 2),
        unit: labels.diameter,
        sub: `Beta Ratio β = ${results.beta.toFixed(3)} · Discharge Coeff Cd = ${results.cd.toFixed(4)}`,
      };
    }
    if (inputs.solveTarget === 'flowrate') {
      const showVol = inputs.flowInputMode === 'volumetric';
      const val = showVol
        ? toDisplay(
            results.stdVolFlowNm3H,
            inputs.phase === 'liquid' ? 'volFlowLiquid' : 'volFlowGas',
            unitSystem
          )
        : toDisplay(results.massFlowKgH, 'massFlow', unitSystem);
      const unit = showVol
        ? inputs.phase === 'liquid'
          ? labels.volFlowLiquid
          : labels.volFlowGas
        : labels.massFlow;
      const altVal = showVol
        ? `${fmtNum(toDisplay(results.massFlowKgH, 'massFlow', unitSystem), 1)} ${labels.massFlow}`
        : `${fmtNum(
            toDisplay(
              results.stdVolFlowNm3H,
              inputs.phase === 'liquid' ? 'volFlowLiquid' : 'volFlowGas',
              unitSystem
            ),
            2
          )} ${inputs.phase === 'liquid' ? labels.volFlowLiquid : labels.volFlowGas}`;
      return {
        kicker: `Solved ${showVol ? 'Volumetric' : 'Mass'} Flowrate`,
        value: fmtNum(val, showVol ? 2 : 1),
        unit,
        sub: `Equivalent: ${altVal} · β = ${results.beta.toFixed(3)}`,
      };
    }
    return {
      kicker: 'Solved Non-Recoverable Pressure Drop (ΔP_perm)',
      value: fmtNum(toDisplay(results.permPressureDropBar, 'pressureDiff', unitSystem), 3),
      unit: labels.pressureDiff,
      sub: `Vena Contracta ΔP_vc = ${fmtNum(
        toDisplay(results.vcPressureDropBar, 'pressureDiff', unitSystem),
        3
      )} ${labels.pressureDiff} · P₂ = ${fmtNum(toDisplay(results.p2BarA, 'pressureAbs', unitSystem), 2)} ${labels.pressureAbs}`,
    };
  }, [inputs.solveTarget, inputs.flowInputMode, inputs.phase, results, unitSystem, labels]);

  const severityStyle = {
    nominal: {
      glyph: '●',
      text: 'text-emerald-700',
      surface: 'bg-emerald-50 border-emerald-200',
    },
    warning: {
      glyph: '▲',
      text: 'text-amber-700',
      surface: 'bg-amber-50 border-amber-200',
    },
    critical: {
      glyph: '✖',
      text: 'text-rose-700',
      surface: 'bg-rose-50 border-rose-200',
    },
  }[results.regimeSeverity];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 clean zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <a
            href="#sizing-console"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Restriction Orifice Sizing
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#sizing-console"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sizing Console
            </a>
            <a
              href="#pressure-profile"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Pressure Profile
            </a>
            <a
              href="#multistage"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Multi-Stage
            </a>
            <a
              href="#reference"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Methodology
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Datasheet</span>
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Control Strip (below header, inside workspace) */}
      <div id="sizing-console" className="bg-white border-b border-slate-200 no-print">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Solve-For Mode Segmented Control */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Solve For:</span>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/70">
              {(
                [
                  { id: 'diameter', label: 'Orifice Diameter (d)' },
                  { id: 'flowrate', label: 'Flowrate (ṁ / Q)' },
                  { id: 'pressureDrop', label: 'Non-Recov. ΔP' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleChangeSolveTarget(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    inputs.solveTarget === tab.id
                      ? 'bg-white text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Phase, Units, Preset & Reset */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/70">
              <button
                type="button"
                onClick={() => handlePhaseChange('liquid')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  inputs.phase === 'liquid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Liquid
              </button>
              <button
                type="button"
                onClick={() => handlePhaseChange('gas')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  inputs.phase === 'gas'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gas / Vapor
              </button>
            </div>

            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/70">
              <button
                type="button"
                onClick={() => setUnitSystem('SI')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  unitSystem === 'SI'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SI / Metric
              </button>
              <button
                type="button"
                onClick={() => setUnitSystem('US')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  unitSystem === 'US'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                US Customary
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const statePayload: StandaloneAppState = {
                  inputs,
                  unitSystem,
                  pipeMode,
                  selectedNps,
                  selectedSchedule,
                  selectedLiquidPresetId,
                  selectedGasPresetId,
                };
                const html = buildStandaloneHtml(statePayload);
                const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'restriction-orifice-sizing.html';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              title="Download a single fully functional offline HTML file"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Save HTML</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportOrificePdf({
                  inputs,
                  results,
                  unitSystem,
                  fluidLabel: currentFluidLabel,
                  pipeLabel: currentPipeLabel,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              title="Save engineering calculation datasheet as PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              title="Reset all inputs to baseline defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Workspace (1440px asymmetric console) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Control & Parameter Column */}
        <aside className="w-full lg:w-[380px] xl:w-[400px] shrink-0 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {/* Group 1: Primary Process Inputs */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">01. Operating Conditions</h2>
              <span className="text-xs text-slate-500">
                {inputs.phase === 'liquid' ? 'Incompressible' : 'Compressible'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumericField
                id="p1-input"
                label="Upstream Pressure (P₁)"
                valueSi={inputs.upstreamPressureBarA}
                unitKind="pressureAbs"
                unitLabel={labels.pressureAbs}
                unitSystem={unitSystem}
                onChangeSi={(v) => setInputs((p) => ({ ...p, upstreamPressureBarA: v }))}
                decimals={2}
                min={0.01}
              />
              <NumericField
                id="t1-input"
                label="Temperature (T₁)"
                valueSi={inputs.upstreamTempC}
                unitKind="temperature"
                unitLabel={labels.temperature}
                unitSystem={unitSystem}
                onChangeSi={(v) => setInputs((p) => ({ ...p, upstreamTempC: v }))}
                decimals={1}
              />
            </div>

            {/* Flowrate Input (or Solved Output) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">Flowrate Basis</span>
                <div className="inline-flex items-center p-0.5 bg-slate-100 rounded border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setInputs((p) => ({ ...p, flowInputMode: 'volumetric' }))}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                      inputs.flowInputMode === 'volumetric'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Volumetric
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputs((p) => ({ ...p, flowInputMode: 'mass' }))}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                      inputs.flowInputMode === 'mass'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Mass
                  </button>
                </div>
              </div>

              {inputs.flowInputMode === 'mass' ? (
                <NumericField
                  id="mass-flow-input"
                  label="Mass Flowrate (ṁ)"
                  valueSi={inputs.solveTarget === 'flowrate' ? results.massFlowKgH : inputs.massFlowKgH}
                  unitKind="massFlow"
                  unitLabel={labels.massFlow}
                  unitSystem={unitSystem}
                  onChangeSi={(v) => setInputs((p) => ({ ...p, massFlowKgH: v }))}
                  decimals={1}
                  min={0.01}
                  readOnlySolved={inputs.solveTarget === 'flowrate'}
                />
              ) : inputs.phase === 'liquid' ? (
                <NumericField
                  id="vol-flow-liq-input"
                  label="Volumetric Flowrate (Q)"
                  valueSi={
                    inputs.solveTarget === 'flowrate' ? results.volFlowM3H : inputs.volFlowLiquidM3H
                  }
                  unitKind="volFlowLiquid"
                  unitLabel={labels.volFlowLiquid}
                  unitSystem={unitSystem}
                  onChangeSi={(v) => setInputs((p) => ({ ...p, volFlowLiquidM3H: v }))}
                  decimals={2}
                  min={0.001}
                  readOnlySolved={inputs.solveTarget === 'flowrate'}
                />
              ) : (
                <NumericField
                  id="vol-flow-gas-input"
                  label="Standard Gas Flowrate"
                  valueSi={
                    inputs.solveTarget === 'flowrate'
                      ? results.stdVolFlowNm3H
                      : inputs.stdVolFlowGasNm3H
                  }
                  unitKind="volFlowGas"
                  unitLabel={labels.volFlowGas}
                  unitSystem={unitSystem}
                  onChangeSi={(v) => setInputs((p) => ({ ...p, stdVolFlowGasNm3H: v }))}
                  decimals={1}
                  min={0.01}
                  readOnlySolved={inputs.solveTarget === 'flowrate'}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumericField
                id="dp-perm-input"
                label="Non-Recov. ΔP_perm"
                valueSi={
                  inputs.solveTarget === 'pressureDrop'
                    ? results.permPressureDropBar
                    : inputs.permPressureDropBar
                }
                unitKind="pressureDiff"
                unitLabel={labels.pressureDiff}
                unitSystem={unitSystem}
                onChangeSi={(v) => setInputs((p) => ({ ...p, permPressureDropBar: v }))}
                decimals={3}
                min={0.001}
                readOnlySolved={inputs.solveTarget === 'pressureDrop'}
              />

              <NumericField
                id="orifice-dia-input"
                label="Orifice Bore (d)"
                valueSi={
                  inputs.solveTarget === 'diameter' ? results.orificeDiaMm : inputs.orificeDiaMm
                }
                unitKind="diameter"
                unitLabel={labels.diameter}
                unitSystem={unitSystem}
                onChangeSi={(v) => setInputs((p) => ({ ...p, orificeDiaMm: v }))}
                decimals={2}
                min={0.1}
                readOnlySolved={inputs.solveTarget === 'diameter'}
              />
            </div>
          </div>

          {/* Group 2: Pipe & Plate Geometry */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">02. Pipe &amp; Orifice Geometry</h2>
              <div className="inline-flex items-center p-0.5 bg-slate-100 rounded border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => {
                    setPipeMode('standard');
                    handleSelectPipeSpec(selectedNps, selectedSchedule);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                    pipeMode === 'standard'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ASME Pipe
                </button>
                <button
                  type="button"
                  onClick={() => setPipeMode('custom')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                    pipeMode === 'custom'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Custom ID
                </button>
              </div>
            </div>

            {pipeMode === 'standard' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="nps-select" className="text-xs font-medium text-slate-700">
                    Nominal Pipe Size
                  </label>
                  <select
                    id="nps-select"
                    value={selectedNps}
                    onChange={(e) => handleSelectPipeSpec(e.target.value, selectedSchedule)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500"
                  >
                    {PIPE_CATALOG.map((p) => (
                      <option key={p.nps} value={p.nps}>
                        NPS {p.nps} (DN {p.dn})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="sched-select" className="text-xs font-medium text-slate-700">
                    Schedule
                  </label>
                  <select
                    id="sched-select"
                    value={selectedSchedule}
                    onChange={(e) =>
                      handleSelectPipeSpec(selectedNps, e.target.value as PipeSchedule)
                    }
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500"
                  >
                    {availableSchedules.map((sch) => (
                      <option key={sch} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <NumericField
                id="pipe-id-input"
                label="Pipe Internal Dia (D)"
                valueSi={inputs.pipeIdMm}
                unitKind="diameter"
                unitLabel={labels.diameter}
                unitSystem={unitSystem}
                onChangeSi={(v) => {
                  setPipeMode('custom');
                  setInputs((p) => ({ ...p, pipeIdMm: v }));
                }}
                decimals={2}
                min={1}
              />

              <NumericField
                id="plate-thick-input"
                label="Plate Thickness (t)"
                valueSi={inputs.plateThicknessMm}
                unitKind="diameter"
                unitLabel={labels.diameter}
                unitSystem={unitSystem}
                onChangeSi={(v) => setInputs((p) => ({ ...p, plateThicknessMm: v }))}
                decimals={2}
                min={0.5}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edge-profile-select" className="text-xs font-medium text-slate-700">
                Orifice Bore Edge Profile
              </label>
              <select
                id="edge-profile-select"
                value={inputs.edgeProfile}
                onChange={(e) =>
                  setInputs((p) => ({ ...p, edgeProfile: e.target.value as 'sharp' | 'thick' }))
                }
                className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500"
              >
                <option value="sharp">Sharp-Edged Square (ISO 5167-2 Standard)</option>
                <option value="thick">Thick-Plate / Drilled Bore (t/d Reattachment)</option>
              </select>
            </div>
          </div>

          {/* Group 3: Fluid Properties */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">03. Fluid Properties</h2>
              <select
                aria-label="Fluid Preset"
                value={inputs.phase === 'liquid' ? selectedLiquidPresetId : selectedGasPresetId}
                onChange={(e) =>
                  inputs.phase === 'liquid'
                    ? handleSelectLiquidPreset(e.target.value)
                    : handleSelectGasPreset(e.target.value)
                }
                className="max-w-[190px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-sky-500"
              >
                {inputs.phase === 'liquid' ? (
                  <>
                    {LIQUID_PRESETS.map((lp) => (
                      <option key={lp.id} value={lp.id}>
                        {lp.name}
                      </option>
                    ))}
                    <option value="custom">Custom Liquid</option>
                  </>
                ) : (
                  <>
                    {GAS_PRESETS.map((gp) => (
                      <option key={gp.id} value={gp.id}>
                        {gp.name}
                      </option>
                    ))}
                    <option value="custom">Custom Gas</option>
                  </>
                )}
              </select>
            </div>

            {inputs.phase === 'liquid' ? (
              <div className="grid grid-cols-2 gap-3">
                <NumericField
                  id="liq-rho"
                  label="Density (ρ)"
                  valueSi={inputs.liquidDensityKgM3}
                  unitKind="density"
                  unitLabel={labels.density}
                  unitSystem={unitSystem}
                  onChangeSi={(v) => {
                    setSelectedLiquidPresetId('custom');
                    setInputs((p) => ({ ...p, liquidDensityKgM3: v }));
                  }}
                  decimals={1}
                  min={10}
                />
                <NumericField
                  id="liq-mu"
                  label="Viscosity (μ)"
                  valueSi={inputs.liquidViscosityCp}
                  unitKind="viscosity"
                  unitLabel={labels.viscosity}
                  unitSystem={unitSystem}
                  onChangeSi={(v) => {
                    setSelectedLiquidPresetId('custom');
                    setInputs((p) => ({ ...p, liquidViscosityCp: v }));
                  }}
                  decimals={3}
                  min={0.01}
                />
                <NumericField
                  id="liq-pv"
                  label="Vapor Pressure (Pv)"
                  valueSi={inputs.vaporPressureBarA}
                  unitKind="pressureAbs"
                  unitLabel={labels.pressureAbs}
                  unitSystem={unitSystem}
                  onChangeSi={(v) => {
                    setSelectedLiquidPresetId('custom');
                    setInputs((p) => ({ ...p, vaporPressureBarA: v }));
                  }}
                  decimals={4}
                  min={0.0001}
                />
                <NumericField
                  id="liq-pc"
                  label="Critical Pressure (Pc)"
                  valueSi={inputs.criticalPressureBarA}
                  unitKind="pressureAbs"
                  unitLabel={labels.pressureAbs}
                  unitSystem={unitSystem}
                  onChangeSi={(v) => {
                    setSelectedLiquidPresetId('custom');
                    setInputs((p) => ({ ...p, criticalPressureBarA: v }));
                  }}
                  decimals={1}
                  min={1}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <NumericField
                  id="gas-mw"
                  label="Molecular Weight"
                  valueSi={inputs.molecularWeight}
                  unitLabel="g/mol"
                  unitSystem={unitSystem}
                  onChangeSi={(v) => {
                    setSelectedGasPresetId('custom');
                    setInputs((p) => ({ ...p, molecularWeight: v }));
                  }}
                  decimals={2}
                  min={1}
                />
                <NumericField
                  id="gas-k"
                  label="Cp/Cv Ratio (k)"
                  valueSi={inputs.kRatio}
                  unitLabel="—"
                  unitSystem={unitSystem}
                  onChangeSi={(v) => {
                    setSelectedGasPresetId('custom');
                    setInputs((p) => ({ ...p, kRatio: v }));
                  }}
                  decimals={3}
                  min={1.02}
                />
                <NumericField
                  id="gas-z"
                  label="Compressibility (Z₁)"
                  valueSi={inputs.zFactor}
                  unitLabel="—"
                  unitSystem={unitSystem}
                  onChangeSi={(v) => {
                    setSelectedGasPresetId('custom');
                    setInputs((p) => ({ ...p, zFactor: v }));
                  }}
                  decimals={3}
                  min={0.1}
                />
                <NumericField
                  id="gas-mu"
                  label="Viscosity (μ)"
                  valueSi={inputs.gasViscosityCp}
                  unitKind="viscosity"
                  unitLabel={labels.viscosity}
                  unitSystem={unitSystem}
                  onChangeSi={(v) => {
                    setSelectedGasPresetId('custom');
                    setInputs((p) => ({ ...p, gasViscosityCp: v }));
                  }}
                  decimals={4}
                  min={0.001}
                />
              </div>
            )}
          </div>
        </aside>

        {/* Main Viewport / Visualization & Results Stage */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* Primary Solved Output & Regime Diagnostic Banner */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {primaryMetric.kicker}
                </div>
                <div className="flex items-baseline flex-wrap gap-x-2">
                  <span className="text-4xl font-mono tabular-nums font-bold tracking-tight text-slate-900">
                    {primaryMetric.value}
                  </span>
                  {primaryMetric.unit && (
                    <span className="text-sm font-mono uppercase text-slate-500">
                      {primaryMetric.unit}
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono tabular-nums text-slate-600">{primaryMetric.sub}</p>
              </div>

              {/* Regime Diagnostic Box (Non-Hue-Only Text + Glyph) */}
              <div className={`border rounded-lg px-4 py-3.5 xl:max-w-md w-full ${severityStyle.surface}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-sm font-semibold ${severityStyle.text}`}>
                    <span aria-hidden="true" className="mr-1.5">
                      {severityStyle.glyph}
                    </span>
                    {results.regimeLabel}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {inputs.phase === 'liquid'
                      ? `σ = ${results.cavitationIndexSigma.toFixed(2)}`
                      : `Mach = ${results.machOrifice.toFixed(3)}`}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                  {results.regimeDetail}
                </p>
              </div>
            </div>

            {/* Warnings Bar (if any engineering bounds exceeded) */}
            {results.warnings.length > 0 && (
              <div className="border-t border-slate-100 pt-3.5 space-y-1.5">
                {results.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 4-Column Precision Telemetry Grid */}
            <div className="border-t border-slate-200 pt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Col 1: Pressure Predictions */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Pressure Predictions
                </h3>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Non-Recov. ΔP_perm</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(toDisplay(results.permPressureDropBar, 'pressureDiff', unitSystem), 3)}{' '}
                      {labels.pressureDiff}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Vena Contracta ΔP_vc</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(toDisplay(results.vcPressureDropBar, 'pressureDiff', unitSystem), 3)}{' '}
                      {labels.pressureDiff}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Vena Contracta P_vc</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(toDisplay(results.pVcBarA, 'pressureAbs', unitSystem), 3)}{' '}
                      {labels.pressureAbs}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Downstream P₂</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(toDisplay(results.p2BarA, 'pressureAbs', unitSystem), 3)}{' '}
                      {labels.pressureAbs}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Pressure Recovery</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {results.pressureRecoveryPct.toFixed(1)}%
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Col 2: Velocities & Reynolds */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Velocities &amp; Hydraulics
                </h3>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Orifice Jet v_o</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(toDisplay(results.velocityOrificeMs, 'velocity', unitSystem), 2)}{' '}
                      {labels.velocity}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Upstream Pipe v₁</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(toDisplay(results.velocityPipeInletMs, 'velocity', unitSystem), 2)}{' '}
                      {labels.velocity}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Downstream Pipe v₂</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(toDisplay(results.velocityPipeOutletMs, 'velocity', unitSystem), 2)}{' '}
                      {labels.velocity}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Pipe Reynolds Re_D</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {Math.round(results.reynoldsPipe).toLocaleString('en-US')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Loss Coeff K_pipe</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(results.kLossPipe, 1)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Col 3: Cavitation (Liquid) or Sonic Velocity (Gas) */}
              {inputs.phase === 'liquid' ? (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Cavitation Analysis
                  </h3>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Cavitation Index σ</dt>
                      <dd className="font-mono tabular-nums font-medium text-slate-900">
                        {results.cavitationIndexSigma.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Incipient Limit σᵢ</dt>
                      <dd className="font-mono tabular-nums font-medium text-slate-900">
                        {results.incipientSigmaLimit.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Choked ΔP Limit</dt>
                      <dd className="font-mono tabular-nums font-medium text-slate-900">
                        {fmtNum(toDisplay(results.dpChokedBar, 'pressureDiff', unitSystem), 3)}{' '}
                        {labels.pressureDiff}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Recovery Factor FL</dt>
                      <dd className="font-mono tabular-nums font-medium text-slate-900">
                        {results.recoveryFactorFl.toFixed(3)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Flashing Margin P₂−Pv</dt>
                      <dd className="font-mono tabular-nums font-medium text-slate-900">
                        {fmtNum(toDisplay(results.flashingMarginBar, 'pressureDiff', unitSystem), 2)}{' '}
                        {labels.pressureDiff}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Sonic &amp; Compressibility
                  </h3>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Upstream Sonic a₁</dt>
                      <dd className="font-mono tabular-nums font-medium text-slate-900">
                        {fmtNum(toDisplay(results.sonicVelocityUpstreamMs, 'velocity', unitSystem), 1)}{' '}
                        {labels.velocity}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Throat Sonic a*</dt>
                      <dd className="font-mono tabular-nums font-medium text-slate-900">
                        {fmtNum(toDisplay(results.sonicVelocityThroatMs, 'velocity', unitSystem), 1)}{' '}
                        {labels.velocity}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Orifice Mach M_o</dt>
                      <dd className="font-mono tabular-nums font-medium text-slate-900">
                        {results.machOrifice.toFixed(3)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Downstream Mach M₂</dt>
                      <dd className="font-mono tabular-nums font-medium text-slate-900">
                        {results.machDownstream.toFixed(3)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Critical Ratio rc</dt>
                      <dd className="font-mono tabular-nums font-medium text-slate-900">
                        {results.criticalPressureRatioRc.toFixed(3)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Col 4: Flow & Density Summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Flow &amp; State Summary
                </h3>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Mass Flow ṁ</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(toDisplay(results.massFlowKgH, 'massFlow', unitSystem), 1)}{' '}
                      {labels.massFlow}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">
                      {inputs.phase === 'liquid' ? 'Volumetric Flow' : 'Std Gas Flow'}
                    </dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(
                        toDisplay(
                          results.stdVolFlowNm3H,
                          inputs.phase === 'liquid' ? 'volFlowLiquid' : 'volFlowGas',
                          unitSystem
                        ),
                        2
                      )}{' '}
                      {inputs.phase === 'liquid' ? labels.volFlowLiquid : labels.volFlowGas}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Upstream Density ρ₁</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {fmtNum(toDisplay(results.densityUpstreamKgM3, 'density', unitSystem), 2)}{' '}
                      {labels.density}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Beta Ratio β = d/D</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {results.beta.toFixed(4)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">
                      {inputs.phase === 'liquid' ? 'Discharge Coeff Cd' : 'Expansion Coeff ε'}
                    </dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {inputs.phase === 'liquid'
                        ? results.cd.toFixed(4)
                        : results.expansionFactor.toFixed(4)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          {/* Axial Pressure Profile & Cross-Sectional Schematic */}
          <section
            id="pressure-profile"
            className="bg-white border border-slate-200 rounded-lg p-5"
          >
            <HydraulicProfileSvg
              results={results}
              phase={inputs.phase}
              unitSystem={unitSystem}
            />
          </section>

          {/* Parametric Performance Curve */}
          <section className="bg-white border border-slate-200 rounded-lg p-5">
            <PerformanceCurveSvg
              results={results}
              solveTarget={inputs.solveTarget}
              phase={inputs.phase}
              unitSystem={unitSystem}
            />
          </section>

          {/* Multi-Stage Restriction Orifice Comparison */}
          <section
            id="multistage"
            className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Multi-Stage Orifice Staging Analysis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Splitting ΔP_perm across series plates prevents cavitation erosion and sonic choking · Minimum recommended:{' '}
                  <span className="font-semibold text-slate-800">
                    {results.recommendedStages} {results.recommendedStages === 1 ? 'Stage' : 'Stages'}
                  </span>
                </p>
              </div>

              {results.recommendedStages > 1 && inputs.solveTarget !== 'pressureDrop' && (
                <button
                  type="button"
                  onClick={() => {
                    const row = results.stageAnalysis.find(
                      (r) => r.stages === results.recommendedStages
                    );
                    if (row) {
                      setInputs((prev) => ({
                        ...prev,
                        solveTarget: 'diameter',
                        permPressureDropBar: Number(row.dpPerStageBar.toFixed(3)),
                      }));
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-md hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>
                    Size Single Stage at {results.recommendedStages}-Stage ΔP (
                    {fmtNum(
                      toDisplay(
                        results.stageAnalysis[results.recommendedStages - 1]?.dpPerStageBar ?? 0,
                        'pressureDiff',
                        unitSystem
                      ),
                      2
                    )}{' '}
                    {labels.pressureDiff})
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="py-2.5 pr-3 font-medium">Stages</th>
                    <th className="py-2.5 px-3 font-medium text-right">
                      Last-Stage ΔP ({labels.pressureDiff})
                    </th>
                    <th className="py-2.5 px-3 font-medium text-right">
                      Last-Stage Bore ({labels.diameter})
                    </th>
                    <th className="py-2.5 px-3 font-medium text-right">Beta (β)</th>
                    <th className="py-2.5 px-3 font-medium text-right">
                      Worst P_vc ({labels.pressureAbs})
                    </th>
                    <th className="py-2.5 px-3 font-medium text-right">
                      {inputs.phase === 'liquid' ? 'Cavitation σ' : 'Orifice Mach'}
                    </th>
                    <th className="py-2.5 pl-3 font-medium text-right">Regime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.stageAnalysis.map((row) => {
                    const stColor =
                      row.severity === 'nominal'
                        ? 'text-emerald-700'
                        : row.severity === 'warning'
                        ? 'text-amber-700'
                        : 'text-rose-700';
                    const stGlyph =
                      row.severity === 'nominal' ? '●' : row.severity === 'warning' ? '▲' : '✖';
                    const isRec = row.stages === results.recommendedStages;
                    return (
                      <tr
                        key={row.stages}
                        className={`transition-colors ${
                          isRec ? 'bg-sky-50/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 pr-3 font-medium text-slate-900 whitespace-nowrap">
                          {row.stages} {row.stages === 1 ? 'Plate' : 'Plates'}
                          {isRec && (
                            <span className="ml-2 text-[11px] font-medium text-sky-700">
                              Recommended
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {fmtNum(toDisplay(row.dpPerStageBar, 'pressureDiff', unitSystem), 3)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                          {fmtNum(toDisplay(row.boreDiaMm, 'diameter', unitSystem), 2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                          {row.beta.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {fmtNum(toDisplay(row.worstPvcBarA, 'pressureAbs', unitSystem), 2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                          {row.machOrSigma.toFixed(2)}
                        </td>
                        <td className={`py-2.5 pl-3 text-right font-medium whitespace-nowrap ${stColor}`}>
                          <span aria-hidden="true" className="mr-1">
                            {stGlyph}
                          </span>
                          {row.statusLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Engineering Methodology Reference */}
          <EngineeringReference />
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8 no-print">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Restriction Orifice Sizing · Hydraulic, Cavitation &amp; Sonic Analysis</span>
          <span>Calculations per ISO 5167-2, ISA-RP75.23, and Crane TP-410</span>
        </div>
      </footer>

      {/* Datasheet Export Modal */}
      <DatasheetExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        inputs={inputs}
        results={results}
        unitSystem={unitSystem}
        fluidLabel={currentFluidLabel}
        pipeLabel={currentPipeLabel}
        standaloneState={{
          inputs,
          unitSystem,
          pipeMode,
          selectedNps,
          selectedSchedule,
          selectedLiquidPresetId,
          selectedGasPresetId,
        }}
      />
    </div>
  );
}
