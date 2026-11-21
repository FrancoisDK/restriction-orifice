import { PIPE_CATALOG, LIQUID_PRESETS, GAS_PRESETS, PipeSchedule } from '../data/pipeAndFluidPresets';
import { OrificeInputs } from './orificeCalculations';
import { UnitSystem } from './units';

export interface StandaloneAppState {
  inputs: OrificeInputs;
  unitSystem: UnitSystem;
  pipeMode: 'standard' | 'custom';
  selectedNps: string;
  selectedSchedule: PipeSchedule;
  selectedLiquidPresetId: string;
  selectedGasPresetId: string;
}

export function buildStandaloneHtml(initialState: StandaloneAppState): string {
  const serializedState = JSON.stringify(initialState).replace(/<\/script>/gi, '<\\/script>');
  const serializedPipes = JSON.stringify(PIPE_CATALOG).replace(/<\/script>/gi, '<\\/script>');
  const serializedLiquids = JSON.stringify(LIQUID_PRESETS).replace(/<\/script>/gi, '<\\/script>');
  const serializedGases = JSON.stringify(GAS_PRESETS).replace(/<\/script>/gi, '<\\/script>');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Restriction Orifice Sizing — Standalone Calculator</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #f8fafc;
    color: #0f172a;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-variant-numeric: tabular-nums;
  }
  header {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .container {
    max-width: 1420px;
    margin: 0 auto;
    padding: 0 20px;
  }
  .header-inner {
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .brand {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0f172a;
    white-space: nowrap;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #334155;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn:hover { background: #f8fafc; color: #0f172a; }
  .btn-primary {
    background: #0284c7;
    border-color: #0284c7;
    color: #ffffff;
  }
  .btn-primary:hover { background: #0369a1; }
  .toolbar {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    padding: 10px 0;
  }
  .toolbar-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .seg-group {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .seg-label {
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
  }
  .seg {
    display: inline-flex;
    padding: 3px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    gap: 2px;
  }
  .seg button {
    border: none;
    background: transparent;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 500;
    color: #475569;
    border-radius: 5px;
    cursor: pointer;
    white-space: nowrap;
  }
  .seg button.active {
    background: #ffffff;
    color: #0369a1;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  }
  .workspace {
    padding: 20px 0 36px;
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }
  .sidebar {
    width: 390px;
    flex-shrink: 0;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }
  .side-sec {
    padding: 16px 18px;
    border-bottom: 1px solid #e2e8f0;
  }
  .side-sec:last-child { border-bottom: none; }
  .sec-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    gap: 8px;
  }
  .sec-head h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .field { margin-bottom: 10px; }
  .field:last-child { margin-bottom: 0; }
  .field-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .field label {
    font-size: 11.5px;
    font-weight: 500;
    color: #334155;
  }
  .solved-tag {
    font-size: 11px;
    font-weight: 600;
    color: #0369a1;
  }
  .input-box {
    display: flex;
    align-items: center;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
  }
  .input-box.solved {
    background: #f0f9ff;
    border-color: #bae6fd;
  }
  .input-box input {
    width: 100%;
    border: none;
    background: transparent;
    padding: 7px 6px 7px 10px;
    font-size: 13px;
    text-align: right;
    color: #0f172a;
    outline: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-variant-numeric: tabular-nums;
  }
  .input-box.solved input { font-weight: 700; color: #0c4a6e; }
  .input-box .unit {
    padding-right: 9px;
    font-size: 11px;
    color: #94a3b8;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    white-space: nowrap;
  }
  select.ctrl {
    width: 100%;
    padding: 7px 8px;
    font-size: 12px;
    font-weight: 500;
    color: #0f172a;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    outline: none;
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .panel {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
  }
  .hero-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }
  .kicker {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
  }
  .big-val {
    font-size: 34px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.15;
    margin: 4px 0;
  }
  .big-unit {
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    margin-left: 6px;
  }
  .sub-meta {
    font-size: 12px;
    color: #475569;
  }
  .regime-box {
    max-width: 420px;
    width: 100%;
    padding: 12px 14px;
    border-radius: 7px;
    border: 1px solid #e2e8f0;
  }
  .regime-nominal { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
  .regime-warning { background: #fffbeb; border-color: #fde68a; color: #b45309; }
  .regime-critical { background: #fff1f2; border-color: #fecdd3; color: #be123c; }
  .regime-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 700;
  }
  .regime-desc {
    margin-top: 5px;
    font-size: 11.5px;
    color: #334155;
    line-height: 1.4;
  }
  .warnings {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #f1f5f9;
    font-size: 12px;
    color: #92400e;
  }
  .warnings div { margin-top: 4px; }
  .telemetry-grid {
    padding-top: 16px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
  }
  .t-col h3 {
    margin: 0 0 8px 0;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }
  .kv {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    margin-bottom: 5px;
  }
  .kv span:first-child { color: #64748b; }
  .kv span:last-child { color: #0f172a; font-weight: 600; }
  .chart-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
    color: #475569;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    text-align: right;
    padding: 8px 10px;
    border-bottom: 1px solid #e2e8f0;
    color: #64748b;
    font-weight: 600;
  }
  th:first-child { text-align: left; }
  td {
    text-align: right;
    padding: 8px 10px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
  }
  td:first-child { text-align: left; font-weight: 600; color: #0f172a; }
  tr.rec-row { background: #f0f9ff; }
  .c-nominal { color: #047857; font-weight: 600; }
  .c-warning { color: #b45309; font-weight: 600; }
  .c-critical { color: #be123c; font-weight: 600; }
  @media (max-width: 1080px) {
    .workspace { flex-direction: column; }
    .sidebar { width: 100%; }
    .telemetry-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media print {
    .no-print { display: none !important; }
    body { background: #ffffff; }
    .workspace { display: block; padding: 0; }
    .sidebar { width: 100%; margin-bottom: 14px; break-inside: avoid; }
    .panel { break-inside: avoid; margin-bottom: 12px; }
  }
</style>
</head>
<body>
<header class="no-print">
  <div class="container header-inner">
    <div class="brand">Restriction Orifice Sizing</div>
    <div class="header-actions">
      <button class="btn" onclick="exportCsv()">Export CSV</button>
      <button class="btn btn-primary" onclick="window.print()">Save to PDF</button>
    </div>
  </div>
</header>

<div class="toolbar no-print">
  <div class="container toolbar-inner">
    <div class="seg-group">
      <span class="seg-label">Solve For:</span>
      <div class="seg" id="solve-seg">
        <button data-target="diameter" onclick="changeSolveTarget('diameter')">Orifice Diameter (d)</button>
        <button data-target="flowrate" onclick="changeSolveTarget('flowrate')">Flowrate (ṁ / Q)</button>
        <button data-target="pressureDrop" onclick="changeSolveTarget('pressureDrop')">Non-Recov. ΔP</button>
      </div>
    </div>
    <div class="seg-group">
      <div class="seg" id="phase-seg">
        <button data-phase="liquid" onclick="changePhase('liquid')">Liquid</button>
        <button data-phase="gas" onclick="changePhase('gas')">Gas / Vapor</button>
      </div>
      <div class="seg" id="unit-seg">
        <button data-unit="SI" onclick="changeUnit('SI')">SI / Metric</button>
        <button data-unit="US" onclick="changeUnit('US')">US Customary</button>
      </div>
    </div>
  </div>
</div>

<div class="container workspace">
  <aside class="sidebar">
    <div class="side-sec">
      <div class="sec-head">
        <h2>01. Operating Conditions</h2>
        <span id="phase-note" style="font-size:11px;color:#64748b;">Incompressible</span>
      </div>
      <div class="grid-2">
        <div class="field">
          <div class="field-head"><label for="inp-p1">Upstream Pressure (P₁)</label></div>
          <div class="input-box"><input id="inp-p1" type="number" step="any" /><span class="unit" data-uk="pressureAbs">bar(a)</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label for="inp-t1">Temperature (T₁)</label></div>
          <div class="input-box"><input id="inp-t1" type="number" step="any" /><span class="unit" data-uk="temperature">°C</span></div>
        </div>
      </div>
      <div class="field" style="margin-top:8px;">
        <div class="field-head">
          <label for="inp-flow" id="lbl-flow">Volumetric Flowrate (Q)</label>
          <div class="seg" style="padding:2px;" id="flowmode-seg">
            <button style="padding:2px 7px;font-size:11px;" data-fm="volumetric" onclick="changeFlowMode('volumetric')">Volumetric</button>
            <button style="padding:2px 7px;font-size:11px;" data-fm="mass" onclick="changeFlowMode('mass')">Mass</button>
          </div>
        </div>
        <div class="input-box" id="box-flow"><input id="inp-flow" type="number" step="any" /><span class="unit" id="unit-flow">m³/h</span></div>
      </div>
      <div class="grid-2" style="margin-top:10px;">
        <div class="field">
          <div class="field-head"><label for="inp-dp">Non-Recov. ΔP_perm</label><span class="solved-tag" id="tag-dp" style="display:none;">Solved</span></div>
          <div class="input-box" id="box-dp"><input id="inp-dp" type="number" step="any" /><span class="unit" data-uk="pressureDiff">bar</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label for="inp-d">Orifice Bore (d)</label><span class="solved-tag" id="tag-d" style="display:none;">Solved</span></div>
          <div class="input-box" id="box-d"><input id="inp-d" type="number" step="any" /><span class="unit" data-uk="diameter">mm</span></div>
        </div>
      </div>
    </div>

    <div class="side-sec">
      <div class="sec-head">
        <h2>02. Pipe &amp; Orifice Geometry</h2>
        <div class="seg" style="padding:2px;" id="pipemode-seg">
          <button style="padding:2px 7px;font-size:11px;" data-pm="standard" onclick="changePipeMode('standard')">ASME</button>
          <button style="padding:2px 7px;font-size:11px;" data-pm="custom" onclick="changePipeMode('custom')">Custom</button>
        </div>
      </div>
      <div class="grid-2" id="pipe-std-row" style="margin-bottom:10px;">
        <div>
          <label style="font-size:11.5px;font-weight:500;color:#334155;display:block;margin-bottom:4px;">Nominal Size</label>
          <select class="ctrl" id="sel-nps" onchange="onPipeSelect()"></select>
        </div>
        <div>
          <label style="font-size:11.5px;font-weight:500;color:#334155;display:block;margin-bottom:4px;">Schedule</label>
          <select class="ctrl" id="sel-sched" onchange="onPipeSelect()"></select>
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <div class="field-head"><label for="inp-D">Pipe ID (D)</label></div>
          <div class="input-box"><input id="inp-D" type="number" step="any" /><span class="unit" data-uk="diameter">mm</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label for="inp-t">Thickness (t)</label></div>
          <div class="input-box"><input id="inp-t" type="number" step="any" /><span class="unit" data-uk="diameter">mm</span></div>
        </div>
      </div>
      <div class="field" style="margin-top:8px;">
        <label style="font-size:11.5px;font-weight:500;color:#334155;display:block;margin-bottom:4px;">Edge Profile</label>
        <select class="ctrl" id="sel-edge" onchange="state.inputs.edgeProfile=this.value;render();">
          <option value="sharp">Sharp-Edged Square (ISO 5167-2)</option>
          <option value="thick">Thick-Plate / Drilled (t/d Correction)</option>
        </select>
      </div>
    </div>

    <div class="side-sec">
      <div class="sec-head">
        <h2>03. Fluid Properties</h2>
        <select class="ctrl" style="width:170px;padding:4px 6px;" id="sel-preset" onchange="onPresetSelect(this.value)"></select>
      </div>
      <div id="liq-props" class="grid-2">
        <div class="field">
          <div class="field-head"><label for="inp-rho">Density (ρ)</label></div>
          <div class="input-box"><input id="inp-rho" type="number" step="any" /><span class="unit" data-uk="density">kg/m³</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label for="inp-lmu">Viscosity (μ)</label></div>
          <div class="input-box"><input id="inp-lmu" type="number" step="any" /><span class="unit">cP</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label for="inp-pv">Vapor Press. (Pv)</label></div>
          <div class="input-box"><input id="inp-pv" type="number" step="any" /><span class="unit" data-uk="pressureAbs">bar(a)</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label for="inp-pc">Crit. Press. (Pc)</label></div>
          <div class="input-box"><input id="inp-pc" type="number" step="any" /><span class="unit" data-uk="pressureAbs">bar(a)</span></div>
        </div>
      </div>
      <div id="gas-props" class="grid-2" style="display:none;">
        <div class="field">
          <div class="field-head"><label for="inp-mw">Mol. Weight</label></div>
          <div class="input-box"><input id="inp-mw" type="number" step="any" /><span class="unit">g/mol</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label for="inp-k">Cp/Cv (k)</label></div>
          <div class="input-box"><input id="inp-k" type="number" step="any" /><span class="unit">—</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label for="inp-z">Z-Factor (Z₁)</label></div>
          <div class="input-box"><input id="inp-z" type="number" step="any" /><span class="unit">—</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label for="inp-gmu">Viscosity (μ)</label></div>
          <div class="input-box"><input id="inp-gmu" type="number" step="any" /><span class="unit">cP</span></div>
        </div>
      </div>
    </div>
  </aside>

  <main class="main">
    <section class="panel">
      <div class="hero-row">
        <div>
          <div class="kicker" id="res-kicker">Solved Orifice Bore Diameter (d)</div>
          <div class="big-val mono"><span id="res-val">—</span><span class="big-unit" id="res-unit"></span></div>
          <div class="sub-meta mono" id="res-sub"></div>
        </div>
        <div class="regime-box regime-nominal" id="regime-box">
          <div class="regime-top">
            <span id="regime-label">Nominal Flow</span>
            <span class="mono" id="regime-idx"></span>
          </div>
          <div class="regime-desc" id="regime-desc"></div>
        </div>
      </div>
      <div class="warnings" id="warnings-box" style="display:none;"></div>
      <div class="telemetry-grid" id="telemetry-grid"></div>
    </section>

    <section class="panel">
      <div class="chart-head">
        <span style="font-weight:600;color:#1e293b;">Axial Pressure Profile &amp; Orifice Cross-Section</span>
        <span class="mono" id="profile-hud" style="color:#64748b;">Hover across pipe axis to inspect P(x) &amp; v(x)</span>
      </div>
      <svg id="svg-profile" viewBox="0 0 820 350" style="width:100%;height:auto;cursor:crosshair;"></svg>
    </section>

    <section class="panel">
      <div class="chart-head">
        <span id="curve-title" style="font-weight:600;color:#1e293b;">Parametric Performance Curve</span>
        <span class="mono" id="curve-hud" style="color:#64748b;">Hover curve for exact coordinates</span>
      </div>
      <svg id="svg-curve" viewBox="0 0 760 250" style="width:100%;height:auto;cursor:crosshair;"></svg>
    </section>

    <section class="panel">
      <div class="chart-head" style="margin-bottom:12px;">
        <div>
          <span style="font-weight:600;color:#0f172a;font-size:14px;">Multi-Stage Orifice Staging Analysis</span>
          <span id="stage-rec-note" style="margin-left:10px;font-size:12px;color:#64748b;"></span>
        </div>
        <button class="btn" id="btn-apply-stage" style="display:none;" onclick="applyRecommendedStage()">Apply Recommended Stage ΔP</button>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Stages</th>
              <th id="th-dp">Last-Stage ΔP</th>
              <th id="th-bore">Last-Stage Bore</th>
              <th>Beta (β)</th>
              <th id="th-pvc">Worst P_vc</th>
              <th id="th-ms">Cavitation σ</th>
              <th>Regime</th>
            </tr>
          </thead>
          <tbody id="stage-tbody" class="mono"></tbody>
        </table>
      </div>
    </section>
  </main>
</div>

<script>
const PIPE_CATALOG = ${serializedPipes};
const LIQUID_PRESETS = ${serializedLiquids};
const GAS_PRESETS = ${serializedGases};
const state = ${serializedState};

const UNIT_LABELS = {
  SI: { pressureAbs: 'bar(a)', pressureDiff: 'bar', diameter: 'mm', temperature: '°C', density: 'kg/m³', viscosity: 'cP', massFlow: 'kg/h', volFlowLiquid: 'm³/h', volFlowGas: 'Nm³/h', velocity: 'm/s' },
  US: { pressureAbs: 'psia', pressureDiff: 'psi', diameter: 'in', temperature: '°F', density: 'lb/ft³', viscosity: 'cP', massFlow: 'lb/h', volFlowLiquid: 'gpm', volFlowGas: 'SCFM', velocity: 'ft/s' }
};
const BAR_TO_PSI = 14.5037738, MM_TO_IN = 0.0393700787, KGM3_TO_LBFT3 = 0.0624279606, KGH_TO_LBH = 2.20462262, M3H_TO_GPM = 4.40286754, MS_TO_FTS = 3.2808399;
const NM3H_TO_SCFM = (35.3146667 / 60) * (288.70556 / 273.15);

function toDisplay(v, kind) {
  if (!Number.isFinite(v) || state.unitSystem === 'SI') return v;
  switch (kind) {
    case 'pressureAbs': case 'pressureDiff': return v * BAR_TO_PSI;
    case 'diameter': return v * MM_TO_IN;
    case 'temperature': return (v * 9) / 5 + 32;
    case 'density': return v * KGM3_TO_LBFT3;
    case 'massFlow': return v * KGH_TO_LBH;
    case 'volFlowLiquid': return v * M3H_TO_GPM;
    case 'volFlowGas': return v * NM3H_TO_SCFM;
    case 'velocity': return v * MS_TO_FTS;
    default: return v;
  }
}
function fromDisplay(v, kind) {
  if (!Number.isFinite(v) || state.unitSystem === 'SI') return v;
  switch (kind) {
    case 'pressureAbs': case 'pressureDiff': return v / BAR_TO_PSI;
    case 'diameter': return v / MM_TO_IN;
    case 'temperature': return ((v - 32) * 5) / 9;
    case 'density': return v / KGM3_TO_LBFT3;
    case 'massFlow': return v / KGH_TO_LBH;
    case 'volFlowLiquid': return v / M3H_TO_GPM;
    case 'volFlowGas': return v / NM3H_TO_SCFM;
    case 'velocity': return v / MS_TO_FTS;
    default: return v;
  }
}
function fmtNum(val, dec) {
  if (!Number.isFinite(val)) return '—';
  return val.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

const R_UNIV = 8314.4626, P_STD = 101325, T_STD = 273.15;
function computeCd(beta, rePipe, dM, tM, edge) {
  const b = Math.min(Math.max(beta, 0.01), 0.92), re = Math.max(rePipe, 2000);
  const A = Math.pow((19000 * b) / re, 0.8), M2p = (2 * 0.47) / (1 - b), b4 = Math.pow(b, 4), b8 = b4 * b4;
  let cd = 0.5961 + 0.0261 * b * b - 0.216 * b8 + 0.000521 * Math.pow((1e6 * b) / re, 0.7)
    + (0.0188 + 0.0063 * A) * Math.pow(b, 3.5) * Math.pow(1e6 / re, 0.3)
    + (0.043 + 0.08 * Math.exp(-10) - 0.123 * Math.exp(-7)) * (1 - 0.11 * A) * (b4 / Math.max(1 - b4, 1e-6))
    - 0.031 * (M2p - 0.8 * Math.pow(M2p, 1.1)) * Math.pow(b, 1.3);
  cd = Math.min(Math.max(cd, 0.56), 0.66);
  if (edge === 'thick' && dM > 0 && tM / dM > 0.02) {
    cd = Math.min(cd * (1 + 0.33 * (1 - Math.exp(-2.1 * (tM / dM - 0.02)))), 0.82);
  }
  return cd;
}
function computePsi(beta, cd) {
  const b = Math.min(Math.max(beta, 0.01), 0.95), b2 = b * b, b4 = b2 * b2;
  const r = Math.sqrt(Math.max(1 - b4 * (1 - cd * cd), 1e-9));
  return Math.min(Math.max((r - cd * b2) / (r + cd * b2), 0.02), 0.9999);
}
function computeEps(beta, k, pVc, p1) {
  const b = Math.min(Math.max(beta, 0.01), 0.92), b4 = Math.pow(b, 4);
  const ratio = Math.min(Math.max(pVc / p1, 0.01), 1.0);
  return Math.min(Math.max(1 - (0.351 + 0.256 * b4 + 0.93 * b4 * b4) * (1 - Math.pow(ratio, 1 / k)), 0.45), 1.0);
}
function evalFlow(inp, beta, dpPermPa, p1Pa, rho1, muPas) {
  const D = inp.pipeIdMm / 1000, d = beta * D, Ao = Math.PI * d * d / 4, Ap = Math.PI * D * D / 4, tM = inp.plateThicknessMm / 1000;
  const gf = Ao / Math.sqrt(Math.max(1 - Math.pow(beta, 4), 1e-9));
  let cd = 0.61, psi = computePsi(beta, cd), dpVcReq = dpPermPa / psi, dpVcEff = dpVcReq, eps = 1, choked = false, mDot = 0, reP = 1e5;
  for (let i = 0; i < 18; i++) {
    psi = computePsi(beta, cd); dpVcReq = dpPermPa / psi;
    if (inp.phase === 'liquid') {
      const pv = inp.vaporPressureBarA * 1e5, pc = Math.max(inp.criticalPressureBarA * 1e5, pv * 1.05);
      const ff = 0.96 - 0.28 * Math.sqrt(Math.max(pv / pc, 0)), dpCh = Math.max(p1Pa - ff * pv, 0);
      if (dpVcReq >= dpCh && dpCh > 0) { dpVcEff = dpCh; choked = true; } else { dpVcEff = Math.max(dpVcReq, 0); choked = false; }
      eps = 1; mDot = cd * gf * Math.sqrt(Math.max(2 * rho1 * dpVcEff, 0));
    } else {
      const k = Math.max(inp.kRatio, 1.05), rc = Math.pow(2 / (k + 1), k / (k - 1)), dpCrit = p1Pa * (1 - rc);
      if (dpVcReq >= dpCrit) { dpVcEff = dpCrit; choked = true; } else { dpVcEff = Math.max(dpVcReq, 0); choked = false; }
      eps = computeEps(beta, k, Math.max(p1Pa - dpVcEff, p1Pa * rc), p1Pa);
      mDot = cd * eps * gf * Math.sqrt(Math.max(2 * rho1 * dpVcEff, 0));
    }
    const vP = mDot / Math.max(rho1 * Ap, 1e-12);
    reP = Math.max((rho1 * vP * D) / Math.max(muPas, 1e-7), 100);
    const nCd = computeCd(beta, reP, d, tM, inp.edgeProfile);
    if (Math.abs(nCd - cd) < 1e-6) { cd = nCd; break; }
    cd = 0.5 * cd + 0.5 * nCd;
  }
  return { mDotKgS: mDot, cd, eps, psi, dpVcReqPa: dpVcReq, dpVcEffPa: dpVcEff, isChoked: choked, rePipe: reP };
}
function solveBeta(inp, targetM, dpPermPa, p1Pa, rho1, muPas) {
  const maxEv = evalFlow(inp, 0.92, dpPermPa, p1Pa, rho1, muPas);
  if (targetM > maxEv.mDotKgS) return { beta: 0.92, exceeded: true };
  let lo = 0.015, hi = 0.92;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    if (evalFlow(inp, mid, dpPermPa, p1Pa, rho1, muPas).mDotKgS < targetM) lo = mid; else hi = mid;
  }
  return { beta: 0.5 * (lo + hi), exceeded: false };
}
function solveDp(inp, beta, targetM, p1Pa, rho1, muPas) {
  const maxEv = evalFlow(inp, beta, p1Pa * 0.9999, p1Pa, rho1, muPas);
  if (targetM > maxEv.mDotKgS * 1.0001) return { dpPermPa: p1Pa * 0.9999, exceeded: true, maxM: maxEv.mDotKgS };
  let lo = 0, hi = p1Pa * 0.9999;
  for (let i = 0; i < 58; i++) {
    const mid = 0.5 * (lo + hi);
    if (evalFlow(inp, beta, mid, p1Pa, rho1, muPas).mDotKgS < targetM) lo = mid; else hi = mid;
  }
  return { dpPermPa: 0.5 * (lo + hi), exceeded: false, maxM: maxEv.mDotKgS };
}

function calculateOrifice(inp) {
  const warnings = [];
  const D = inp.pipeIdMm / 1000, p1BarA = inp.upstreamPressureBarA, p1Pa = p1BarA * 1e5, tempK = inp.upstreamTempC + 273.15;
  if (D <= 0 || p1Pa <= 0 || tempK <= 10) return { valid: false, errorMessage: 'Invalid geometry or state inputs.', warnings: [] };
  let rho1 = 1000, muPas = 1e-3;
  if (inp.phase === 'liquid') {
    rho1 = inp.liquidDensityKgM3; muPas = inp.liquidViscosityCp * 1e-3;
    if (rho1 <= 0 || muPas <= 0) return { valid: false, errorMessage: 'Liquid density and viscosity must be positive.', warnings: [] };
    if (inp.vaporPressureBarA >= p1BarA) warnings.push('Upstream pressure P₁ is at or below vapor pressure Pv.');
  } else {
    if (inp.molecularWeight <= 0 || inp.kRatio <= 1.01 || inp.zFactor <= 0 || inp.gasViscosityCp <= 0) return { valid: false, errorMessage: 'Gas MW, k (>1.01), Z, and viscosity must be positive.', warnings: [] };
    rho1 = (p1Pa * inp.molecularWeight) / (inp.zFactor * R_UNIV * tempK); muPas = inp.gasViscosityCp * 1e-3;
  }
  const rhoStdGas = (P_STD * inp.molecularWeight) / (R_UNIV * T_STD);
  let mKgH = inp.massFlowKgH;
  if (inp.flowInputMode === 'volumetric') mKgH = inp.phase === 'liquid' ? inp.volFlowLiquidM3H * rho1 : inp.stdVolFlowGasNm3H * rhoStdGas;

  let beta = Math.min(Math.max(inp.orificeDiaMm / inp.pipeIdMm, 0.015), 0.92), dpPa = inp.permPressureDropBar * 1e5, mDot = mKgH / 3600;
  if (inp.solveTarget === 'diameter') {
    if (mKgH <= 0 || inp.permPressureDropBar <= 0 || inp.permPressureDropBar >= p1BarA) return { valid: false, errorMessage: 'Check flowrate (>0) and 0 < ΔP_perm < P₁.', warnings: [] };
    const s = solveBeta(inp, mDot, dpPa, p1Pa, rho1, muPas); beta = s.beta;
    if (s.exceeded) warnings.push('Requested flowrate exceeds maximum orifice capacity (β = 0.92).');
  } else if (inp.solveTarget === 'flowrate') {
    if (inp.orificeDiaMm <= 0 || inp.orificeDiaMm >= inp.pipeIdMm * 0.95 || inp.permPressureDropBar <= 0 || inp.permPressureDropBar >= p1BarA) return { valid: false, errorMessage: 'Check 0 < d < 0.95 D and 0 < ΔP_perm < P₁.', warnings: [] };
    mDot = evalFlow(inp, beta, dpPa, p1Pa, rho1, muPas).mDotKgS;
  } else {
    if (inp.orificeDiaMm <= 0 || inp.orificeDiaMm >= inp.pipeIdMm * 0.95 || mKgH <= 0) return { valid: false, errorMessage: 'Check 0 < d < 0.95 D and flowrate > 0.', warnings: [] };
    const s = solveDp(inp, beta, mDot, p1Pa, rho1, muPas); dpPa = s.dpPermPa;
    if (s.exceeded) warnings.push('Flowrate exceeds choked capacity (' + (s.maxM * 3600).toFixed(1) + ' kg/h) for this bore.');
  }

  const fe = evalFlow(inp, beta, dpPa, p1Pa, rho1, muPas);
  if (inp.solveTarget === 'flowrate') mDot = fe.mDotKgS;
  const d = beta * D, dMm = d * 1000, Ap = Math.PI * D * D / 4, Ao = Math.PI * d * d / 4;
  const massFlowKgH = mDot * 3600, volFlowM3H = (mDot / rho1) * 3600, stdVolFlowNm3H = inp.phase === 'liquid' ? volFlowM3H : massFlowKgH / rhoStdGas;
  const dpBar = dpPa / 1e5, dpVcBar = fe.dpVcReqPa / 1e5, p2BarA = Math.max(p1BarA - dpBar, 0.0001);
  const pVcBarA = inp.phase === 'liquid' ? Math.max(p1BarA - dpVcBar, inp.vaporPressureBarA * 0.85, 0.001) : Math.max(p1BarA - dpVcBar, 0.001);
  const recPct = (1 - fe.psi) * 100, vIn = mDot / (rho1 * Ap), reP = fe.rePipe;
  const kLoss = 0.5 * rho1 * vIn * vIn > 1e-6 ? dpPa / (0.5 * rho1 * vIn * vIn) : 0;

  let sigma = 0, sigLim = 0, fl = Math.sqrt(fe.psi), dpChBar = 0, flashM = 0;
  let a1 = 0, aStar = 0, machO = 0, mach2 = 0, rc = 0.528, chKgH = 0, vO = mDot / (rho1 * Ao), vOut = vIn, pCritOrPv = inp.vaporPressureBarA;
  let rLabel = 'Nominal', rDesc = '', rSev = 'nominal';

  if (inp.phase === 'liquid') {
    const pv = inp.vaporPressureBarA, pc = Math.max(inp.criticalPressureBarA, pv * 1.05);
    const ff = 0.96 - 0.28 * Math.sqrt(Math.max(pv / pc, 0));
    dpChBar = Math.max(fe.psi * (p1BarA - ff * pv), 0); flashM = p2BarA - pv;
    sigma = dpBar > 1e-6 ? (p1BarA - pv) / dpBar : 999; sigLim = 1.35 / Math.max(fe.psi, 0.05); pCritOrPv = pv;
    if (p2BarA <= pv) { rLabel = 'Downstream Flashing'; rSev = 'critical'; rDesc = 'P₂ drops below Pv; permanent two-phase flashing occurs.'; }
    else if (fe.isChoked || p1BarA - dpVcBar <= pv) { rLabel = 'Choked Cavitation'; rSev = 'critical'; rDesc = 'P_vc reaches Pv; flow is cavitation-choked at ΔP_choked = ' + dpChBar.toFixed(2) + ' bar.'; }
    else if (sigma < sigLim) { rLabel = 'Incipient Cavitation Risk'; rSev = 'warning'; rDesc = 'σ (' + sigma.toFixed(2) + ') is below incipient threshold σᵢ (' + sigLim.toFixed(2) + ').'; }
    else { rLabel = 'Subcooled Nominal'; rSev = 'nominal'; rDesc = 'σ (' + sigma.toFixed(2) + ') exceeds σᵢ (' + sigLim.toFixed(2) + '); single-phase liquid flow.'; }
  } else {
    const k = Math.max(inp.kRatio, 1.05), rho2 = (p2BarA * 1e5 * inp.molecularWeight) / (inp.zFactor * R_UNIV * tempK);
    a1 = Math.sqrt((k * inp.zFactor * R_UNIV * tempK) / inp.molecularWeight); aStar = a1 * Math.sqrt(2 / (k + 1));
    rc = Math.pow(2 / (k + 1), k / (k - 1)); const pCrit = p1BarA * rc; pCritOrPv = pCrit;
    chKgH = evalFlow(inp, beta, p1Pa * 0.9999, p1Pa, rho1, muPas).mDotKgS * 3600;
    const pVcAct = Math.max(p1BarA - fe.dpVcEffPa / 1e5, pCrit);
    machO = fe.isChoked ? 1.0 : Math.min(Math.sqrt((2 / (k - 1)) * (Math.pow(Math.max(p1BarA / pVcAct, 1), (k - 1) / k) - 1)), 1.0);
    const tTh = tempK / (1 + ((k - 1) / 2) * machO * machO);
    vO = machO * Math.sqrt((k * inp.zFactor * R_UNIV * tTh) / inp.molecularWeight);
    vOut = mDot / (rho2 * Ap); mach2 = vOut / a1;
    if (fe.isChoked || machO >= 0.995) { rLabel = 'Choked / Sonic Flow (M = 1.0)'; rSev = 'critical'; rDesc = 'Vena contracta reaches critical P* (' + pCrit.toFixed(2) + ' bar(a)); choked at ' + chKgH.toFixed(0) + ' kg/h.'; }
    else if (machO >= 0.8 || mach2 >= 0.3) { rLabel = 'Near-Sonic High Velocity'; rSev = 'warning'; rDesc = 'Elevated Mach (' + machO.toFixed(2) + '); elevated noise / vibration risk.'; }
    else { rLabel = 'Subsonic Nominal'; rSev = 'nominal'; rDesc = 'Orifice Mach (' + machO.toFixed(2) + ') and downstream Mach (' + mach2.toFixed(2) + ') are safely subsonic.'; }
  }

  if (beta < 0.15) warnings.push('Low beta ratio (β = ' + beta.toFixed(3) + ' < 0.15).');
  else if (beta > 0.75) warnings.push('High beta ratio (β = ' + beta.toFixed(3) + ' > 0.75).');
  if (reP < 5000) warnings.push('Low pipe Reynolds number (Re_D = ' + Math.round(reP).toLocaleString('en-US') + ').');

  const stages = []; let recStages = 1, foundNom = false;
  for (let n = 1; n <= 5; n++) {
    if (inp.phase === 'liquid') {
      const dpS = dpBar / n, pIn = p1BarA - (n - 1) * dpS;
      const sInp = Object.assign({}, inp, { upstreamPressureBarA: pIn, permPressureDropBar: dpS });
      const sb = solveBeta(sInp, mDot, dpS * 1e5, pIn * 1e5, rho1, muPas);
      const ev = evalFlow(sInp, sb.beta, dpS * 1e5, pIn * 1e5, rho1, muPas);
      const pv = inp.vaporPressureBarA, sigS = dpS > 1e-6 ? (pIn - pv) / dpS : 999, sigL = 1.35 / Math.max(ev.psi, 0.05), pVcS = pIn - ev.dpVcReqPa / 1e5;
      let sLab = 'Subcooled', sSev = 'nominal';
      if (pIn - dpS <= pv) { sLab = 'Flashing'; sSev = 'critical'; }
      else if (ev.isChoked || pVcS <= pv) { sLab = 'Choked Cavitation'; sSev = 'critical'; }
      else if (sigS < sigL) { sLab = 'Incipient Cav.'; sSev = 'warning'; }
      if (!foundNom && sSev === 'nominal') { recStages = n; foundNom = true; }
      stages.push({ stages: n, dpPerStageBar: dpS, boreDiaMm: sb.beta * inp.pipeIdMm, beta: sb.beta, worstPvcBarA: Math.max(pVcS, 0.001), machOrSigma: sigS, statusLabel: sLab, severity: sSev });
    } else {
      const k = Math.max(inp.kRatio, 1.05), rS = Math.pow(p2BarA / p1BarA, 1 / n), pIn = p1BarA * Math.pow(rS, n - 1), dpS = pIn * (1 - rS);
      const rhoS = (pIn * 1e5 * inp.molecularWeight) / (inp.zFactor * R_UNIV * tempK);
      const sInp = Object.assign({}, inp, { upstreamPressureBarA: pIn, permPressureDropBar: dpS });
      const sb = solveBeta(sInp, mDot, dpS * 1e5, pIn * 1e5, rhoS, muPas);
      const ev = evalFlow(sInp, sb.beta, dpS * 1e5, pIn * 1e5, rhoS, muPas);
      const pVcS = Math.max(pIn - ev.dpVcEffPa / 1e5, pIn * Math.pow(2 / (k + 1), k / (k - 1)));
      const mS = ev.isChoked ? 1.0 : Math.min(Math.sqrt((2 / (k - 1)) * (Math.pow(Math.max(pIn / pVcS, 1), (k - 1) / k) - 1)), 1.0);
      let sLab = 'Subsonic', sSev = 'nominal';
      if (ev.isChoked || mS >= 0.995) { sLab = 'Choked (M=1.0)'; sSev = 'critical'; }
      else if (mS >= 0.8) { sLab = 'Near-Sonic'; sSev = 'warning'; }
      if (!foundNom && sSev === 'nominal') { recStages = n; foundNom = true; }
      stages.push({ stages: n, dpPerStageBar: dpS, boreDiaMm: sb.beta * inp.pipeIdMm, beta: sb.beta, worstPvcBarA: pVcS, machOrSigma: mS, statusLabel: sLab, severity: sSev });
    }
  }
  if (!foundNom) recStages = 5;

  const sweep = [], maxDpS = Math.min(p1BarA * 0.92, Math.max(dpBar * 1.8, p1BarA * 0.65));
  for (let i = 1; i <= 26; i++) {
    const dpB = (maxDpS * i) / 26, dpP = dpB * 1e5;
    if (inp.solveTarget === 'diameter') {
      const sb = solveBeta(inp, mDot, dpP, p1Pa, rho1, muPas), ev = evalFlow(inp, sb.beta, dpP, p1Pa, rho1, muPas);
      let ms = 0, bad = ev.isChoked;
      if (inp.phase === 'liquid') { ms = (p1BarA - inp.vaporPressureBarA) / dpB; if (ms < 1.35 / Math.max(ev.psi, 0.05)) bad = true; }
      else { const k = Math.max(inp.kRatio, 1.05), pVB = Math.max(p1BarA - ev.dpVcEffPa / 1e5, p1BarA * Math.pow(2 / (k + 1), k / (k - 1))); ms = ev.isChoked ? 1 : Math.min(Math.sqrt((2 / (k - 1)) * (Math.pow(p1BarA / pVB, (k - 1) / k) - 1)), 1); if (ms >= 0.8) bad = true; }
      sweep.push({ dpPermBar: dpB, massFlowKgH: massFlowKgH, orificeDiaMm: sb.beta * inp.pipeIdMm, machOrSigma: ms, isBad: bad });
    } else {
      const ev = evalFlow(inp, beta, dpP, p1Pa, rho1, muPas), mk = ev.mDotKgS * 3600;
      let ms = 0, bad = ev.isChoked;
      if (inp.phase === 'liquid') { ms = (p1BarA - inp.vaporPressureBarA) / dpB; if (ms < 1.35 / Math.max(ev.psi, 0.05)) bad = true; }
      else { const k = Math.max(inp.kRatio, 1.05), pVB = Math.max(p1BarA - ev.dpVcEffPa / 1e5, p1BarA * Math.pow(2 / (k + 1), k / (k - 1))); ms = ev.isChoked ? 1 : Math.min(Math.sqrt((2 / (k - 1)) * (Math.pow(p1BarA / pVB, (k - 1) / k) - 1)), 1); if (ms >= 0.8) bad = true; }
      sweep.push({ dpPermBar: dpB, massFlowKgH: mk, orificeDiaMm: dMm, machOrSigma: ms, isBad: bad });
    }
  }

  return {
    valid: true, warnings, orificeDiaMm: dMm, pipeIdMm: inp.pipeIdMm, beta, massFlowKgH, volFlowM3H, stdVolFlowNm3H,
    permPressureDropBar: dpBar, vcPressureDropBar: dpVcBar, pressureRecoveryPct: recPct, p1BarA, pVcBarA, p2BarA,
    pCritOrPvBarA: pCritOrPv, cd: fe.cd, expansionFactor: fe.eps, reynoldsPipe: reP, kLossPipe: kLoss,
    velocityPipeInletMs: vIn, velocityOrificeMs: vO, velocityPipeOutletMs: vOut, cavitationIndexSigma: sigma,
    incipientSigmaLimit: sigLim, recoveryFactorFl: fl, dpChokedBar: dpChBar, flashingMarginBar: flashM,
    densityUpstreamKgM3: rho1, sonicVelocityUpstreamMs: a1, sonicVelocityThroatMs: aStar, machOrifice: machO,
    machDownstream: mach2, criticalPressureRatioRc: rc, chokedMassFlowKgH: chKgH,
    regimeLabel: rLabel, regimeDetail: rDesc, regimeSeverity: rSev, isChoked: fe.isChoked,
    recommendedStages: recStages, stageAnalysis: stages, sweepCurve: sweep
  };
}

let lastResults = null;
function bindInputs() {
  const map = [
    ['inp-p1', 'upstreamPressureBarA', 'pressureAbs', 2],
    ['inp-t1', 'upstreamTempC', 'temperature', 1],
    ['inp-dp', 'permPressureDropBar', 'pressureDiff', 3],
    ['inp-d', 'orificeDiaMm', 'diameter', 2],
    ['inp-D', 'pipeIdMm', 'diameter', 2],
    ['inp-t', 'plateThicknessMm', 'diameter', 2],
    ['inp-rho', 'liquidDensityKgM3', 'density', 1],
    ['inp-lmu', 'liquidViscosityCp', null, 3],
    ['inp-pv', 'vaporPressureBarA', 'pressureAbs', 4],
    ['inp-pc', 'criticalPressureBarA', 'pressureAbs', 1],
    ['inp-mw', 'molecularWeight', null, 2],
    ['inp-k', 'kRatio', null, 3],
    ['inp-z', 'zFactor', null, 3],
    ['inp-gmu', 'gasViscosityCp', null, 4],
  ];
  map.forEach(([id, key, uk]) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const val = parseFloat(el.value);
      if (!Number.isFinite(val)) return;
      if (key === 'pipeIdMm') state.pipeMode = 'custom';
      if (['liquidDensityKgM3','liquidViscosityCp','vaporPressureBarA','criticalPressureBarA'].includes(key)) state.selectedLiquidPresetId = 'custom';
      if (['molecularWeight','kRatio','zFactor','gasViscosityCp'].includes(key)) state.selectedGasPresetId = 'custom';
      state.inputs[key] = uk ? fromDisplay(val, uk) : val;
      render(id);
    });
  });
  const flowEl = document.getElementById('inp-flow');
  flowEl.addEventListener('input', () => {
    const val = parseFloat(flowEl.value);
    if (!Number.isFinite(val)) return;
    if (state.inputs.flowInputMode === 'mass') state.inputs.massFlowKgH = fromDisplay(val, 'massFlow');
    else if (state.inputs.phase === 'liquid') state.inputs.volFlowLiquidM3H = fromDisplay(val, 'volFlowLiquid');
    else state.inputs.stdVolFlowGasNm3H = fromDisplay(val, 'volFlowGas');
    render('inp-flow');
  });
}

function populateDropdowns() {
  const npsSel = document.getElementById('sel-nps');
  npsSel.innerHTML = PIPE_CATALOG.map(p => '<option value="' + p.nps + '">NPS ' + p.nps + ' (DN ' + p.dn + ')</option>').join('');
  npsSel.value = state.selectedNps;
  updateSchedOptions();
  updatePresetOptions();
}
function updateSchedOptions() {
  const spec = PIPE_CATALOG.find(p => p.nps === state.selectedNps) || PIPE_CATALOG[0];
  const schedSel = document.getElementById('sel-sched');
  const keys = Object.keys(spec.schedules);
  schedSel.innerHTML = keys.map(k => '<option value="' + k + '">' + k + '</option>').join('');
  if (!keys.includes(state.selectedSchedule)) state.selectedSchedule = keys[0];
  schedSel.value = state.selectedSchedule;
}
function updatePresetOptions() {
  const sel = document.getElementById('sel-preset');
  if (state.inputs.phase === 'liquid') {
    sel.innerHTML = LIQUID_PRESETS.map(p => '<option value="' + p.id + '">' + p.name + '</option>').join('') + '<option value="custom">Custom Liquid</option>';
    sel.value = state.selectedLiquidPresetId;
  } else {
    sel.innerHTML = GAS_PRESETS.map(g => '<option value="' + g.id + '">' + g.name + '</option>').join('') + '<option value="custom">Custom Gas</option>';
    sel.value = state.selectedGasPresetId;
  }
}
function onPipeSelect() {
  state.selectedNps = document.getElementById('sel-nps').value;
  updateSchedOptions();
  state.selectedSchedule = document.getElementById('sel-sched').value;
  const spec = PIPE_CATALOG.find(p => p.nps === state.selectedNps);
  if (spec && spec.schedules[state.selectedSchedule]) state.inputs.pipeIdMm = spec.schedules[state.selectedSchedule];
  render();
}
function onPresetSelect(id) {
  if (state.inputs.phase === 'liquid') {
    state.selectedLiquidPresetId = id;
    const p = LIQUID_PRESETS.find(x => x.id === id);
    if (p) { state.inputs.liquidDensityKgM3 = p.densityKgM3; state.inputs.liquidViscosityCp = p.viscosityCp; state.inputs.vaporPressureBarA = p.vaporPressureBarA; state.inputs.criticalPressureBarA = p.criticalPressureBarA; state.inputs.upstreamTempC = p.defaultTempC; }
  } else {
    state.selectedGasPresetId = id;
    const g = GAS_PRESETS.find(x => x.id === id);
    if (g) { state.inputs.molecularWeight = g.molecularWeight; state.inputs.kRatio = g.kRatio; state.inputs.zFactor = g.zFactor; state.inputs.gasViscosityCp = g.viscosityCp; state.inputs.upstreamTempC = g.defaultTempC; }
  }
  render();
}
function changeSolveTarget(t) {
  if (t === state.inputs.solveTarget) return;
  if (lastResults && lastResults.valid) {
    if (state.inputs.solveTarget === 'diameter') state.inputs.orificeDiaMm = Number(lastResults.orificeDiaMm.toFixed(2));
    else if (state.inputs.solveTarget === 'flowrate') { state.inputs.massFlowKgH = Number(lastResults.massFlowKgH.toFixed(1)); state.inputs.volFlowLiquidM3H = Number(lastResults.volFlowM3H.toFixed(2)); state.inputs.stdVolFlowGasNm3H = Number(lastResults.stdVolFlowNm3H.toFixed(1)); }
    else if (state.inputs.solveTarget === 'pressureDrop') state.inputs.permPressureDropBar = Number(lastResults.permPressureDropBar.toFixed(3));
  }
  state.inputs.solveTarget = t; render();
}
function changePhase(ph) { state.inputs.phase = ph; updatePresetOptions(); render(); }
function changeUnit(u) { state.unitSystem = u; render(); }
function changeFlowMode(fm) { state.inputs.flowInputMode = fm; render(); }
function changePipeMode(pm) { state.pipeMode = pm; if (pm === 'standard') onPipeSelect(); else render(); }
function applyRecommendedStage() {
  if (!lastResults || !lastResults.valid) return;
  const row = lastResults.stageAnalysis.find(r => r.stages === lastResults.recommendedStages);
  if (row) { state.inputs.solveTarget = 'diameter'; state.inputs.permPressureDropBar = Number(row.dpPerStageBar.toFixed(3)); render(); }
}

function setFieldVal(id, valSi, uk, dec, activeId) {
  if (id === activeId) return;
  const el = document.getElementById(id);
  const v = uk ? toDisplay(valSi, uk) : valSi;
  const f = Math.pow(10, dec);
  el.value = String(Math.round(v * f) / f);
}

function render(activeId) {
  const inp = state.inputs, L = UNIT_LABELS[state.unitSystem];
  const res = calculateOrifice(inp); lastResults = res;

  document.querySelectorAll('#solve-seg button').forEach(b => b.classList.toggle('active', b.dataset.target === inp.solveTarget));
  document.querySelectorAll('#phase-seg button').forEach(b => b.classList.toggle('active', b.dataset.phase === inp.phase));
  document.querySelectorAll('#unit-seg button').forEach(b => b.classList.toggle('active', b.dataset.unit === state.unitSystem));
  document.querySelectorAll('#flowmode-seg button').forEach(b => b.classList.toggle('active', b.dataset.fm === inp.flowInputMode));
  document.querySelectorAll('#pipemode-seg button').forEach(b => b.classList.toggle('active', b.dataset.pm === state.pipeMode));

  document.getElementById('phase-note').textContent = inp.phase === 'liquid' ? 'Incompressible' : 'Compressible';
  document.getElementById('pipe-std-row').style.display = state.pipeMode === 'standard' ? 'grid' : 'none';
  document.getElementById('liq-props').style.display = inp.phase === 'liquid' ? 'grid' : 'none';
  document.getElementById('gas-props').style.display = inp.phase === 'gas' ? 'grid' : 'none';
  document.getElementById('sel-edge').value = inp.edgeProfile;

  document.querySelectorAll('[data-uk]').forEach(el => { el.textContent = L[el.dataset.uk]; });
  const flowLbl = inp.flowInputMode === 'mass' ? 'Mass Flowrate (ṁ)' : (inp.phase === 'liquid' ? 'Volumetric Flow (Q)' : 'Std Gas Flow');
  const flowUk = inp.flowInputMode === 'mass' ? 'massFlow' : (inp.phase === 'liquid' ? 'volFlowLiquid' : 'volFlowGas');
  document.getElementById('lbl-flow').textContent = flowLbl;
  document.getElementById('unit-flow').textContent = L[flowUk];

  const isFlowS = inp.solveTarget === 'flowrate', isDpS = inp.solveTarget === 'pressureDrop', isDiaS = inp.solveTarget === 'diameter';
  document.getElementById('box-flow').classList.toggle('solved', isFlowS);
  document.getElementById('inp-flow').disabled = isFlowS;
  document.getElementById('box-dp').classList.toggle('solved', isDpS);
  document.getElementById('inp-dp').disabled = isDpS;
  document.getElementById('tag-dp').style.display = isDpS ? 'inline' : 'none';
  document.getElementById('box-d').classList.toggle('solved', isDiaS);
  document.getElementById('inp-d').disabled = isDiaS;
  document.getElementById('tag-d').style.display = isDiaS ? 'inline' : 'none';

  setFieldVal('inp-p1', inp.upstreamPressureBarA, 'pressureAbs', 2, activeId);
  setFieldVal('inp-t1', inp.upstreamTempC, 'temperature', 1, activeId);
  const flowSi = isFlowS ? (inp.flowInputMode === 'mass' ? res.massFlowKgH : (inp.phase === 'liquid' ? res.volFlowM3H : res.stdVolFlowNm3H))
    : (inp.flowInputMode === 'mass' ? inp.massFlowKgH : (inp.phase === 'liquid' ? inp.volFlowLiquidM3H : inp.stdVolFlowGasNm3H));
  setFieldVal('inp-flow', flowSi, flowUk, inp.flowInputMode === 'mass' ? 1 : 2, activeId);
  setFieldVal('inp-dp', isDpS ? res.permPressureDropBar : inp.permPressureDropBar, 'pressureDiff', 3, activeId);
  setFieldVal('inp-d', isDiaS ? res.orificeDiaMm : inp.orificeDiaMm, 'diameter', 2, activeId);
  setFieldVal('inp-D', inp.pipeIdMm, 'diameter', 2, activeId);
  setFieldVal('inp-t', inp.plateThicknessMm, 'diameter', 2, activeId);
  setFieldVal('inp-rho', inp.liquidDensityKgM3, 'density', 1, activeId);
  setFieldVal('inp-lmu', inp.liquidViscosityCp, null, 3, activeId);
  setFieldVal('inp-pv', inp.vaporPressureBarA, 'pressureAbs', 4, activeId);
  setFieldVal('inp-pc', inp.criticalPressureBarA, 'pressureAbs', 1, activeId);
  setFieldVal('inp-mw', inp.molecularWeight, null, 2, activeId);
  setFieldVal('inp-k', inp.kRatio, null, 3, activeId);
  setFieldVal('inp-z', inp.zFactor, null, 3, activeId);
  setFieldVal('inp-gmu', inp.gasViscosityCp, null, 4, activeId);

  if (!res.valid) {
    document.getElementById('res-kicker').textContent = 'Input Error';
    document.getElementById('res-val').textContent = '—';
    document.getElementById('res-unit').textContent = '';
    document.getElementById('res-sub').textContent = res.errorMessage;
    return;
  }

  if (isDiaS) {
    document.getElementById('res-kicker').textContent = 'Solved Orifice Bore Diameter (d)';
    document.getElementById('res-val').textContent = fmtNum(toDisplay(res.orificeDiaMm, 'diameter'), 2);
    document.getElementById('res-unit').textContent = L.diameter;
    document.getElementById('res-sub').textContent = 'Beta β = ' + res.beta.toFixed(3) + ' · Cd = ' + res.cd.toFixed(4);
  } else if (isFlowS) {
    const isVol = inp.flowInputMode === 'volumetric';
    document.getElementById('res-kicker').textContent = isVol ? 'Solved Volumetric Flowrate' : 'Solved Mass Flowrate';
    document.getElementById('res-val').textContent = fmtNum(toDisplay(isVol ? res.stdVolFlowNm3H : res.massFlowKgH, flowUk), isVol ? 2 : 1);
    document.getElementById('res-unit').textContent = L[flowUk];
    document.getElementById('res-sub').textContent = 'Beta β = ' + res.beta.toFixed(3) + ' · Cd = ' + res.cd.toFixed(4);
  } else {
    document.getElementById('res-kicker').textContent = 'Solved Non-Recoverable Pressure Drop (ΔP_perm)';
    document.getElementById('res-val').textContent = fmtNum(toDisplay(res.permPressureDropBar, 'pressureDiff'), 3);
    document.getElementById('res-unit').textContent = L.pressureDiff;
    document.getElementById('res-sub').textContent = 'ΔP_vc = ' + fmtNum(toDisplay(res.vcPressureDropBar, 'pressureDiff'), 3) + ' ' + L.pressureDiff + ' · P₂ = ' + fmtNum(toDisplay(res.p2BarA, 'pressureAbs'), 2) + ' ' + L.pressureAbs;
  }

  const rBox = document.getElementById('regime-box');
  rBox.className = 'regime-box regime-' + res.regimeSeverity;
  const glyph = res.regimeSeverity === 'nominal' ? '● ' : (res.regimeSeverity === 'warning' ? '▲ ' : '✖ ');
  document.getElementById('regime-label').textContent = glyph + res.regimeLabel;
  document.getElementById('regime-idx').textContent = inp.phase === 'liquid' ? 'σ = ' + res.cavitationIndexSigma.toFixed(2) : 'Mach = ' + res.machOrifice.toFixed(3);
  document.getElementById('regime-desc').textContent = res.regimeDetail;

  const wBox = document.getElementById('warnings-box');
  if (res.warnings.length > 0) { wBox.style.display = 'block'; wBox.innerHTML = res.warnings.map(w => '<div>⚠ ' + w + '</div>').join(''); }
  else wBox.style.display = 'none';

  const col3 = inp.phase === 'liquid' ? {
    title: 'Cavitation Analysis',
    rows: [
      ['Cavitation Index σ', res.cavitationIndexSigma.toFixed(2)],
      ['Incipient Limit σᵢ', res.incipientSigmaLimit.toFixed(2)],
      ['Choked ΔP Limit', fmtNum(toDisplay(res.dpChokedBar, 'pressureDiff'), 3) + ' ' + L.pressureDiff],
      ['Recovery FL', res.recoveryFactorFl.toFixed(3)],
      ['Margin P₂ − Pv', fmtNum(toDisplay(res.flashingMarginBar, 'pressureDiff'), 2) + ' ' + L.pressureDiff],
    ]
  } : {
    title: 'Sonic & Compressibility',
    rows: [
      ['Upstream Sonic a₁', fmtNum(toDisplay(res.sonicVelocityUpstreamMs, 'velocity'), 1) + ' ' + L.velocity],
      ['Throat Sonic a*', fmtNum(toDisplay(res.sonicVelocityThroatMs, 'velocity'), 1) + ' ' + L.velocity],
      ['Orifice Mach M_o', res.machOrifice.toFixed(3)],
      ['Pipe Mach M₂', res.machDownstream.toFixed(3)],
      ['Critical Ratio rc', res.criticalPressureRatioRc.toFixed(3)],
    ]
  };
  const cols = [
    { title: 'Pressure Predictions', rows: [
      ['ΔP_perm', fmtNum(toDisplay(res.permPressureDropBar, 'pressureDiff'), 3) + ' ' + L.pressureDiff],
      ['ΔP_vc', fmtNum(toDisplay(res.vcPressureDropBar, 'pressureDiff'), 3) + ' ' + L.pressureDiff],
      ['Vena Contracta P_vc', fmtNum(toDisplay(res.pVcBarA, 'pressureAbs'), 3) + ' ' + L.pressureAbs],
      ['Downstream P₂', fmtNum(toDisplay(res.p2BarA, 'pressureAbs'), 3) + ' ' + L.pressureAbs],
      ['Recovery %', res.pressureRecoveryPct.toFixed(1) + '%'],
    ]},
    { title: 'Velocities & Hydraulics', rows: [
      ['Orifice Jet v_o', fmtNum(toDisplay(res.velocityOrificeMs, 'velocity'), 2) + ' ' + L.velocity],
      ['Inlet Pipe v₁', fmtNum(toDisplay(res.velocityPipeInletMs, 'velocity'), 2) + ' ' + L.velocity],
      ['Outlet Pipe v₂', fmtNum(toDisplay(res.velocityPipeOutletMs, 'velocity'), 2) + ' ' + L.velocity],
      ['Reynolds Re_D', Math.round(res.reynoldsPipe).toLocaleString('en-US')],
      ['Loss Coeff K', fmtNum(res.kLossPipe, 1)],
    ]},
    col3,
    { title: 'Flow & State', rows: [
      ['Mass Flow ṁ', fmtNum(toDisplay(res.massFlowKgH, 'massFlow'), 1) + ' ' + L.massFlow],
      ['Volumetric Flow', fmtNum(toDisplay(res.stdVolFlowNm3H, inp.phase === 'liquid' ? 'volFlowLiquid' : 'volFlowGas'), 2) + ' ' + (inp.phase === 'liquid' ? L.volFlowLiquid : L.volFlowGas)],
      ['Density ρ₁', fmtNum(toDisplay(res.densityUpstreamKgM3, 'density'), 2) + ' ' + L.density],
      ['Beta β = d/D', res.beta.toFixed(4)],
      [inp.phase === 'liquid' ? 'Discharge Cd' : 'Expansion ε', inp.phase === 'liquid' ? res.cd.toFixed(4) : res.expansionFactor.toFixed(4)],
    ]}
  ];
  document.getElementById('telemetry-grid').innerHTML = cols.map(c => '<div class="t-col"><h3>' + c.title + '</h3>' + c.rows.map(r => '<div class="kv"><span>' + r[0] + '</span><span class="mono">' + r[1] + '</span></div>').join('') + '</div>').join('');

  document.getElementById('stage-rec-note').textContent = 'Minimum recommended: ' + res.recommendedStages + (res.recommendedStages === 1 ? ' Stage' : ' Stages');
  document.getElementById('btn-apply-stage').style.display = (res.recommendedStages > 1 && inp.solveTarget !== 'pressureDrop') ? 'inline-flex' : 'none';
  document.getElementById('th-dp').textContent = 'Last-Stage ΔP (' + L.pressureDiff + ')';
  document.getElementById('th-bore').textContent = 'Bore (' + L.diameter + ')';
  document.getElementById('th-pvc').textContent = 'Worst P_vc (' + L.pressureAbs + ')';
  document.getElementById('th-ms').textContent = inp.phase === 'liquid' ? 'Cavitation σ' : 'Orifice Mach';
  document.getElementById('stage-tbody').innerHTML = res.stageAnalysis.map(r => {
    const g = r.severity === 'nominal' ? '● ' : (r.severity === 'warning' ? '▲ ' : '✖ ');
    return '<tr class="' + (r.stages === res.recommendedStages ? 'rec-row' : '') + '"><td>' + r.stages + (r.stages === 1 ? ' Plate' : ' Plates') + (r.stages === res.recommendedStages ? ' (Rec.)' : '') + '</td><td>' + fmtNum(toDisplay(r.dpPerStageBar, 'pressureDiff'), 3) + '</td><td>' + fmtNum(toDisplay(r.boreDiaMm, 'diameter'), 2) + '</td><td>' + r.beta.toFixed(3) + '</td><td>' + fmtNum(toDisplay(r.worstPvcBarA, 'pressureAbs'), 2) + '</td><td>' + r.machOrSigma.toFixed(2) + '</td><td class="c-' + r.severity + '">' + g + r.statusLabel + '</td></tr>';
  }).join('');

  renderProfileSvg(res, L);
  renderCurveSvg(res, L);
}

function renderProfileSvg(res, L) {
  const svg = document.getElementById('svg-profile');
  const W = 820, padL = 68, padR = 28, pW = W - padL - padR, pTop = 24, pBot = 188, pH = pBot - pTop;
  const pipeTop = 224, pipeBot = 326, pipeMid = 275, halfH = 51, boreH = halfH * Math.min(Math.max(res.beta, 0.12), 0.9);
  const vcH = boreH * Math.sqrt(Math.max(res.cd, 0.58)), plateX = padL + 0.25 * pW, vcX = padL + 0.34 * pW;
  const pMinR = Math.min(res.pVcBarA, res.p2BarA, res.pCritOrPvBarA, res.p1BarA * 0.2), pMaxR = res.p1BarA * 1.08, span = Math.max(pMaxR - pMinR, 0.2);
  const pMin = Math.max(0, pMinR - span * 0.12), pMax = pMaxR + span * 0.05;
  const yP = p => pBot - ((p - pMin) / Math.max(pMax - pMin, 1e-6)) * pH;
  const evalP = u => {
    if (u <= 0.16) return res.p1BarA;
    if (u < 0.25) { const t = (u - 0.16) / 0.09; return res.p1BarA + 0.015 * (res.p1BarA - res.pVcBarA) * Math.sin(t * Math.PI * 0.5) - 0.35 * (res.p1BarA - res.pVcBarA) * Math.pow(t, 4); }
    if (u <= 0.34) { const t = (u - 0.25) / 0.09, pAt = res.p1BarA - 0.335 * (res.p1BarA - res.pVcBarA); return pAt - (pAt - res.pVcBarA) * Math.sin(t * Math.PI * 0.5); }
    return res.pVcBarA + (res.p2BarA - res.pVcBarA) * (1 - Math.pow(1 - Math.min((u - 0.34) / 0.54, 1), 2.4));
  };
  const evalV = u => {
    const v1 = res.velocityPipeInletMs, vo = res.velocityOrificeMs, v2 = res.velocityPipeOutletMs;
    if (u < 0.18) return v1;
    if (u <= 0.34) return v1 + (vo - v1) * Math.pow((u - 0.18) / 0.16, 1.8);
    return vo + (v2 - vo) * (1 - Math.pow(1 - Math.min((u - 0.34) / 0.51, 1), 2.2));
  };
  let path = '';
  for (let i = 0; i <= 110; i++) { const u = i / 110; path += (i === 0 ? 'M ' : 'L ') + (padL + u * pW).toFixed(1) + ' ' + yP(evalP(u)).toFixed(1) + ' '; }
  const thY = yP(res.pCritOrPvBarA);
  const breached = state.inputs.phase === 'liquid' ? (res.pVcBarA <= res.pCritOrPvBarA || res.regimeSeverity !== 'nominal') : (res.isChoked || res.machOrifice >= 0.8);
  let out = '<defs><pattern id="stWallHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" stroke-width="1.5"/></pattern></defs>';
  [0, 0.33, 0.66, 1].forEach(f => {
    const gy = pBot - f * pH, v = pMin + f * (pMax - pMin);
    out += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (padL + pW) + '" y2="' + gy + '" stroke="#e2e8f0" stroke-width="1"/>';
    out += '<text x="' + (padL - 8) + '" y="' + (gy + 3.5) + '" text-anchor="end" fill="#94a3b8" font-family="monospace" font-size="10">' + fmtNum(toDisplay(v, 'pressureAbs'), 1) + '</text>';
  });
  out += '<text x="14" y="' + ((pTop + pBot) / 2) + '" text-anchor="middle" transform="rotate(-90 14 ' + ((pTop + pBot) / 2) + ')" fill="#94a3b8" font-family="monospace" font-size="10">PRESSURE (' + L.pressureAbs + ')</text>';
  out += '<line x1="' + plateX + '" y1="' + pTop + '" x2="' + plateX + '" y2="' + pipeTop + '" stroke="#cbd5e1" stroke-dasharray="3 3" stroke-width="1"/>';
  out += '<line x1="' + vcX + '" y1="' + pTop + '" x2="' + vcX + '" y2="' + pipeMid + '" stroke="#94a3b8" stroke-dasharray="2 2" stroke-width="1"/>';
  if (thY >= pTop - 6 && thY <= pBot + 6) {
    const tc = breached ? '#e11d48' : '#d97706';
    out += '<line x1="' + padL + '" y1="' + thY + '" x2="' + (padL + pW) + '" y2="' + thY + '" stroke="' + tc + '" stroke-width="1.25" stroke-dasharray="5 4"/>';
    out += '<text x="' + (padL + pW - 4) + '" y="' + (thY - 4) + '" text-anchor="end" fill="' + tc + '" font-family="monospace" font-size="10">' + (state.inputs.phase === 'liquid' ? 'Pv Vapor Limit (' : 'P* Sonic Critical (') + fmtNum(toDisplay(res.pCritOrPvBarA, 'pressureAbs'), 2) + ' ' + L.pressureAbs + ')</text>';
  }
  out += '<path d="' + path + ' L ' + (padL + pW) + ' ' + pBot + ' L ' + padL + ' ' + pBot + ' Z" fill="#0284c7" fill-opacity="0.1"/>';
  out += '<path d="' + path + '" fill="none" stroke="#0284c7" stroke-width="2.25"/>';
  const p1Y = yP(res.p1BarA), pvcY = yP(res.pVcBarA), p2Y = yP(res.p2BarA);
  out += '<circle cx="' + (padL + 18) + '" cy="' + p1Y + '" r="3.5" fill="#0284c7"/><text x="' + (padL + 26) + '" y="' + (p1Y - 6) + '" fill="#334155" font-family="monospace" font-size="10" font-weight="600">P₁ ' + fmtNum(toDisplay(res.p1BarA, 'pressureAbs'), 2) + '</text>';
  out += '<circle cx="' + vcX + '" cy="' + pvcY + '" r="4" fill="' + (breached ? '#e11d48' : '#0284c7') + '" stroke="#fff" stroke-width="1.5"/><text x="' + (vcX + 8) + '" y="' + Math.min(pvcY + 12, pBot - 6) + '" fill="' + (breached ? '#e11d48' : '#334155') + '" font-family="monospace" font-size="10" font-weight="700">P_vc ' + fmtNum(toDisplay(res.pVcBarA, 'pressureAbs'), 2) + '</text>';
  out += '<circle cx="' + (padL + pW - 18) + '" cy="' + p2Y + '" r="3.5" fill="#0284c7"/><text x="' + (padL + pW - 24) + '" y="' + (p2Y - 8) + '" text-anchor="end" fill="#334155" font-family="monospace" font-size="10" font-weight="600">P₂ ' + fmtNum(toDisplay(res.p2BarA, 'pressureAbs'), 2) + '</text>';
  if (Math.abs(p2Y - p1Y) > 10) {
    out += '<line x1="' + (padL + pW - 8) + '" y1="' + p1Y + '" x2="' + (padL + pW - 8) + '" y2="' + p2Y + '" stroke="#64748b" stroke-width="1"/>';
    out += '<line x1="' + (padL + pW - 12) + '" y1="' + p1Y + '" x2="' + (padL + pW - 4) + '" y2="' + p1Y + '" stroke="#64748b" stroke-width="1"/>';
    out += '<line x1="' + (padL + pW - 12) + '" y1="' + p2Y + '" x2="' + (padL + pW - 4) + '" y2="' + p2Y + '" stroke="#64748b" stroke-width="1"/>';
    out += '<text x="' + (padL + pW - 14) + '" y="' + ((p1Y + p2Y) / 2 + 3) + '" text-anchor="end" fill="#475569" font-family="monospace" font-size="10">ΔP_perm = ' + fmtNum(toDisplay(res.permPressureDropBar, 'pressureDiff'), 2) + ' ' + L.pressureDiff + '</text>';
  }
  out += '<rect x="' + padL + '" y="' + (pipeTop - 10) + '" width="' + pW + '" height="10" fill="url(#stWallHatch)" stroke="#94a3b8" stroke-width="1"/>';
  out += '<rect x="' + padL + '" y="' + pipeBot + '" width="' + pW + '" height="10" fill="url(#stWallHatch)" stroke="#94a3b8" stroke-width="1"/>';
  out += '<rect x="' + padL + '" y="' + pipeTop + '" width="' + pW + '" height="' + (pipeBot - pipeTop) + '" fill="#f8fafc"/>';
  out += '<path d="M ' + (plateX + 5) + ' ' + (pipeTop + 1) + ' L ' + (vcX + 18) + ' ' + (pipeTop + 1) + ' Q ' + (plateX + 24) + ' ' + (pipeMid - vcH - 4) + ' ' + (plateX + 5) + ' ' + (pipeMid - boreH) + ' Z" fill="#e2e8f0" opacity="0.7"/>';
  out += '<path d="M ' + (plateX + 5) + ' ' + (pipeBot - 1) + ' L ' + (vcX + 18) + ' ' + (pipeBot - 1) + ' Q ' + (plateX + 24) + ' ' + (pipeMid + vcH + 4) + ' ' + (plateX + 5) + ' ' + (pipeMid + boreH) + ' Z" fill="#e2e8f0" opacity="0.7"/>';
  [-0.72, -0.4, 0, 0.4, 0.72].forEach(f => {
    const yp = pipeMid + f * halfH, yv = pipeMid + f * vcH * 0.92, xc = padL + 0.12 * pW, xr = padL + 0.78 * pW;
    out += '<path d="M ' + padL + ' ' + yp + ' L ' + xc + ' ' + yp + ' C ' + (xc + 45) + ' ' + yp + ', ' + (plateX - 15) + ' ' + yv + ', ' + vcX + ' ' + yv + ' C ' + (vcX + 55) + ' ' + yv + ', ' + (xr - 65) + ' ' + yp + ', ' + xr + ' ' + yp + ' L ' + (padL + pW) + ' ' + yp + '" fill="none" stroke="' + (f === 0 ? '#0284c7' : '#38bdf8') + '" stroke-width="' + (f === 0 ? 1.5 : 1) + '"' + (f === 0 ? ' stroke-dasharray="6 4"' : '') + ' opacity="' + (f === 0 ? 0.9 : 0.6) + '"/>';
  });
  out += '<polygon points="' + (padL + 36) + ',' + pipeMid + ' ' + (padL + 26) + ',' + (pipeMid - 4) + ' ' + (padL + 26) + ',' + (pipeMid + 4) + '" fill="#0284c7"/>';
  out += '<polygon points="' + (padL + pW - 24) + ',' + pipeMid + ' ' + (padL + pW - 34) + ',' + (pipeMid - 4) + ' ' + (padL + pW - 34) + ',' + (pipeMid + 4) + '" fill="#0284c7"/>';
  out += '<rect x="' + (plateX - 4) + '" y="' + (pipeTop - 10) + '" width="8" height="' + (pipeMid - boreH - (pipeTop - 10)) + '" fill="#334155" stroke="#0f172a" stroke-width="1"/>';
  out += '<rect x="' + (plateX - 4) + '" y="' + (pipeMid + boreH) + '" width="8" height="' + (pipeBot + 10 - (pipeMid + boreH)) + '" fill="#334155" stroke="#0f172a" stroke-width="1"/>';
  out += '<text x="' + (padL + 4) + '" y="' + (pipeBot + 24) + '" fill="#64748b" font-family="monospace" font-size="10">-2D Upstream</text>';
  out += '<text x="' + plateX + '" y="' + (pipeBot + 24) + '" text-anchor="middle" fill="#0f172a" font-family="monospace" font-size="10" font-weight="600">Orifice (0D)</text>';
  out += '<text x="' + vcX + '" y="' + (pipeBot + 24) + '" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="10">Vena Contracta</text>';
  out += '<text x="' + (padL + pW - 4) + '" y="' + (pipeBot + 24) + '" text-anchor="end" fill="#64748b" font-family="monospace" font-size="10">+6D Recovery</text>';
  out += '<line id="prof-ch" x1="0" y1="' + pTop + '" x2="0" y2="' + (pipeBot + 10) + '" stroke="#0f172a" stroke-width="1" stroke-dasharray="2 2" style="display:none;"/>';
  svg.innerHTML = out;
  svg.onmousemove = e => {
    const rect = svg.getBoundingClientRect(), u = (((e.clientX - rect.left) / rect.width) * W - padL) / pW;
    const ch = document.getElementById('prof-ch');
    if (u >= 0 && u <= 1) {
      ch.setAttribute('x1', padL + u * pW); ch.setAttribute('x2', padL + u * pW); ch.style.display = 'inline';
      const xD = -2 + 8 * u, p = evalP(u), v = evalV(u);
      document.getElementById('profile-hud').textContent = 'x/D = ' + (xD >= 0 ? '+' : '') + xD.toFixed(2) + ' | P = ' + fmtNum(toDisplay(p, 'pressureAbs'), 2) + ' ' + L.pressureAbs + ' | v = ' + fmtNum(toDisplay(v, 'velocity'), 1) + ' ' + L.velocity;
    } else { ch.style.display = 'none'; }
  };
  svg.onmouseleave = () => { document.getElementById('prof-ch').style.display = 'none'; document.getElementById('profile-hud').textContent = 'Hover across pipe axis to inspect P(x) & v(x)'; };
}

function renderCurveSvg(res, L) {
  const svg = document.getElementById('svg-curve'), pts = res.sweepCurve, isDia = state.inputs.solveTarget === 'diameter';
  document.getElementById('curve-title').textContent = isDia ? 'Required Orifice Diameter vs. ΔP_perm' : 'Capacity Curve: Mass Flow vs. ΔP_perm';
  if (!pts.length) { svg.innerHTML = ''; return; }
  const W = 760, H = 260, padL = 66, padR = 64, padT = 22, padB = 40, pW = W - padL - padR, pH = H - padT - padB;
  const xs = pts.map(p => toDisplay(p.dpPermBar, 'pressureDiff')), y1s = pts.map(p => isDia ? toDisplay(p.orificeDiaMm, 'diameter') : toDisplay(p.massFlowKgH, 'massFlow'));
  const y2s = pts.map(p => Math.min(p.machOrSigma, state.inputs.phase === 'liquid' ? 12 : 1.1));
  const xMax = Math.max(...xs, 1e-6), yMin = Math.min(...y1s) * 0.9, yMax = Math.max(...y1s, 1e-6) * 1.08;
  const y2Max = state.inputs.phase === 'liquid' ? Math.max(Math.min(Math.max(...y2s), 12), 4) : 1.15;
  const xF = x => padL + (x / xMax) * pW, yF = y => padT + pH - ((y - yMin) / Math.max(yMax - yMin, 1e-6)) * pH;
  const y2F = y => padT + pH - (Math.min(y, y2Max) / Math.max(y2Max, 1e-6)) * pH;
  let out = '';
  const critIdx = pts.findIndex(p => p.isBad);
  if (critIdx >= 0) {
    const cx = xF(xs[critIdx]);
    if (cx < padL + pW) {
      out += '<rect x="' + cx + '" y="' + padT + '" width="' + (padL + pW - cx) + '" height="' + pH + '" fill="#e11d48" opacity="0.06"/>';
      out += '<line x1="' + cx + '" y1="' + padT + '" x2="' + cx + '" y2="' + (padT + pH) + '" stroke="#e11d48" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>';
      out += '<text x="' + Math.min(cx + 6, padL + pW - 95) + '" y="' + (padT + 14) + '" fill="#e11d48" font-family="monospace" font-size="9.5" font-weight="600">' + (state.inputs.phase === 'liquid' ? 'Cavitation Risk Zone' : 'Near-Sonic / Choked') + '</text>';
    }
  }
  [0, 0.25, 0.5, 0.75, 1].forEach(f => {
    const y = padT + pH - f * pH, v = yMin + f * (yMax - yMin), v2 = f * y2Max;
    out += '<line x1="' + padL + '" y1="' + y + '" x2="' + (padL + pW) + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="1"/>';
    out += '<text x="' + (padL - 8) + '" y="' + (y + 3.5) + '" text-anchor="end" fill="#64748b" font-family="monospace" font-size="10">' + fmtNum(v, isDia ? 1 : 0) + '</text>';
    out += '<text x="' + (padL + pW + 8) + '" y="' + (y + 3.5) + '" text-anchor="start" fill="#d97706" font-family="monospace" font-size="10">' + v2.toFixed(1) + '</text>';
    const xv = f * xMax, xp = padL + f * pW;
    out += '<text x="' + xp + '" y="' + (padT + pH + 16) + '" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="10">' + fmtNum(xv, 1) + '</text>';
  });
  out += '<text x="14" y="' + (padT + pH / 2) + '" text-anchor="middle" transform="rotate(-90 14 ' + (padT + pH / 2) + ')" fill="#64748b" font-family="monospace" font-size="10">' + (isDia ? 'Orifice Bore (' + L.diameter + ')' : 'Mass Flow (' + L.massFlow + ')') + '</text>';
  out += '<text x="' + (W - 12) + '" y="' + (padT + pH / 2) + '" text-anchor="middle" transform="rotate(90 ' + (W - 12) + ' ' + (padT + pH / 2) + ')" fill="#d97706" font-family="monospace" font-size="10">' + (state.inputs.phase === 'liquid' ? 'Cavitation σ' : 'Orifice Mach M_o') + '</text>';
  const path2 = pts.map((_, i) => (i === 0 ? 'M ' : 'L ') + xF(xs[i]).toFixed(1) + ' ' + y2F(y2s[i]).toFixed(1)).join(' ');
  out += '<path d="' + path2 + '" fill="none" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4 3"/>';
  const path = pts.map((_, i) => (i === 0 ? 'M ' : 'L ') + xF(xs[i]).toFixed(1) + ' ' + yF(y1s[i]).toFixed(1)).join(' ');
  out += '<path d="' + path + '" fill="none" stroke="#0284c7" stroke-width="2.2"/>';
  const opX = xF(toDisplay(res.permPressureDropBar, 'pressureDiff')), opY = yF(isDia ? toDisplay(res.orificeDiaMm, 'diameter') : toDisplay(res.massFlowKgH, 'massFlow'));
  if (opX >= padL && opX <= padL + pW && opY >= padT - 4 && opY <= padT + pH + 4) {
    out += '<line x1="' + opX + '" y1="' + padT + '" x2="' + opX + '" y2="' + (padT + pH) + '" stroke="#0284c7" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>';
    out += '<circle cx="' + opX + '" cy="' + opY + '" r="5" fill="#0284c7" stroke="#fff" stroke-width="2"/>';
    const onR = opX > padL + pW * 0.72;
    out += '<text x="' + (onR ? opX - 8 : opX + 8) + '" y="' + (opY - 8) + '" text-anchor="' + (onR ? 'end' : 'start') + '" fill="#0369a1" font-family="monospace" font-size="10" font-weight="600">Operating Point</text>';
  }
  out += '<text x="' + (padL + pW / 2) + '" y="' + (H - 6) + '" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="10">Non-Recoverable ΔP_perm (' + L.pressureDiff + ')</text>';
  svg.innerHTML = out;
  svg.onmousemove = e => {
    const rect = svg.getBoundingClientRect(), sx = ((e.clientX - rect.left) / rect.width) * W;
    let bi = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = Math.abs(xF(xs[i]) - sx); if (d < bd) { bd = d; bi = i; } }
    document.getElementById('curve-hud').textContent = 'ΔP = ' + fmtNum(xs[bi], 2) + ' ' + L.pressureDiff + ' | ' + (isDia ? ('d = ' + fmtNum(y1s[bi], 2) + ' ' + L.diameter) : ('ṁ = ' + fmtNum(y1s[bi], 1) + ' ' + L.massFlow)) + ' | ' + (state.inputs.phase === 'liquid' ? ('σ = ' + pts[bi].machOrSigma.toFixed(2)) : ('M = ' + pts[bi].machOrSigma.toFixed(2)));
  };
  svg.onmouseleave = () => { document.getElementById('curve-hud').textContent = 'Hover curve for exact coordinates'; };
}

function exportCsv() {
  if (!lastResults || !lastResults.valid) return;
  const L = UNIT_LABELS[state.unitSystem], r = lastResults;
  const rows = [
    ['Orifice Bore (d)', fmtNum(toDisplay(r.orificeDiaMm, 'diameter'), 3), L.diameter],
    ['Pipe ID (D)', fmtNum(toDisplay(r.pipeIdMm, 'diameter'), 2), L.diameter],
    ['Beta Ratio', r.beta.toFixed(4), 'dimensionless'],
    ['Mass Flowrate', fmtNum(toDisplay(r.massFlowKgH, 'massFlow'), 2), L.massFlow],
    ['Non-Recoverable dP', fmtNum(toDisplay(r.permPressureDropBar, 'pressureDiff'), 3), L.pressureDiff],
    ['Vena Contracta dP', fmtNum(toDisplay(r.vcPressureDropBar, 'pressureDiff'), 3), L.pressureDiff],
    ['Regime', r.regimeLabel, r.recommendedStages + ' stages rec.'],
  ];
  const csv = 'Parameter,Value,Unit\\n' + rows.map(x => x.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = 'restriction-orifice-sizing.csv';
  a.click();
}

populateDropdowns();
bindInputs();
render();
</script>
</body>
</html>`;
}
