import React, { useState } from 'react';
import { X, Download, FileCode, FileText, Copy, Check } from 'lucide-react';
import { OrificeInputs, OrificeResults } from '../utils/orificeCalculations';
import { UnitSystem, UNIT_LABELS, toDisplay, fmtNum } from '../utils/units';
import { exportOrificePdf } from '../utils/pdfExport';
import { buildStandaloneHtml, StandaloneAppState } from '../utils/standaloneHtmlBuilder';

interface DatasheetExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: OrificeInputs;
  results: OrificeResults;
  unitSystem: UnitSystem;
  fluidLabel: string;
  pipeLabel: string;
  standaloneState: StandaloneAppState;
}

export const DatasheetExportModal: React.FC<DatasheetExportModalProps> = ({
  isOpen,
  onClose,
  inputs,
  results,
  unitSystem,
  fluidLabel,
  pipeLabel,
  standaloneState,
}) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const labels = UNIT_LABELS[unitSystem];
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const rows: Array<[string, string, string]> = [
    ['Service / Fluid', fluidLabel, inputs.phase === 'liquid' ? 'Liquid' : 'Gas / Vapor'],
    ['Pipe Specification', pipeLabel, `${fmtNum(toDisplay(results.pipeIdMm, 'diameter', unitSystem), 2)} ${labels.diameter} ID`],
    ['Orifice Edge Profile', inputs.edgeProfile === 'sharp' ? 'Sharp-Edged (ISO 5167-2)' : 'Thick-Plate Square', `t = ${fmtNum(toDisplay(inputs.plateThicknessMm, 'diameter', unitSystem), 2)} ${labels.diameter}`],
    ['Orifice Bore Diameter (d)', fmtNum(toDisplay(results.orificeDiaMm, 'diameter', unitSystem), 3), labels.diameter],
    ['Beta Ratio (β = d/D)', results.beta.toFixed(4), 'dimensionless'],
    ['Mass Flowrate (ṁ)', fmtNum(toDisplay(results.massFlowKgH, 'massFlow', unitSystem), 2), labels.massFlow],
    [
      inputs.phase === 'liquid' ? 'Volumetric Flowrate (Q)' : 'Standard Volumetric Flowrate',
      fmtNum(
        toDisplay(
          results.stdVolFlowNm3H,
          inputs.phase === 'liquid' ? 'volFlowLiquid' : 'volFlowGas',
          unitSystem
        ),
        2
      ),
      inputs.phase === 'liquid' ? labels.volFlowLiquid : labels.volFlowGas,
    ],
    ['Upstream Pressure (P₁)', fmtNum(toDisplay(results.p1BarA, 'pressureAbs', unitSystem), 3), labels.pressureAbs],
    ['Upstream Temperature (T₁)', fmtNum(toDisplay(inputs.upstreamTempC, 'temperature', unitSystem), 1), labels.temperature],
    ['Non-Recoverable ΔP (ΔP_perm)', fmtNum(toDisplay(results.permPressureDropBar, 'pressureDiff', unitSystem), 3), labels.pressureDiff],
    ['Vena Contracta ΔP (ΔP_vc)', fmtNum(toDisplay(results.vcPressureDropBar, 'pressureDiff', unitSystem), 3), labels.pressureDiff],
    ['Vena Contracta Pressure (P_vc)', fmtNum(toDisplay(results.pVcBarA, 'pressureAbs', unitSystem), 3), labels.pressureAbs],
    ['Downstream Pressure (P₂)', fmtNum(toDisplay(results.p2BarA, 'pressureAbs', unitSystem), 3), labels.pressureAbs],
    ['Discharge Coefficient (Cd)', results.cd.toFixed(4), 'ISO 5167-2'],
    ['Pipe Reynolds Number (Re_D)', Math.round(results.reynoldsPipe).toLocaleString('en-US'), 'dimensionless'],
    ['Orifice Throat Velocity (v_o)', fmtNum(toDisplay(results.velocityOrificeMs, 'velocity', unitSystem), 2), labels.velocity],
    ['Downstream Pipe Velocity (v₂)', fmtNum(toDisplay(results.velocityPipeOutletMs, 'velocity', unitSystem), 2), labels.velocity],
    ['Hydraulic Regime', results.regimeLabel, `${results.recommendedStages} stage(s) recommended`],
  ];

  if (inputs.phase === 'liquid') {
    rows.push(
      ['Cavitation Index (σ)', results.cavitationIndexSigma.toFixed(2), `Incipient limit σᵢ = ${results.incipientSigmaLimit.toFixed(2)}`],
      ['Choked ΔP Limit (ΔP_choked)', fmtNum(toDisplay(results.dpChokedBar, 'pressureDiff', unitSystem), 3), labels.pressureDiff],
      ['Flashing Margin (P₂ - Pv)', fmtNum(toDisplay(results.flashingMarginBar, 'pressureDiff', unitSystem), 3), labels.pressureDiff]
    );
  } else {
    rows.push(
      ['Upstream Sonic Velocity (a₁)', fmtNum(toDisplay(results.sonicVelocityUpstreamMs, 'velocity', unitSystem), 1), labels.velocity],
      ['Orifice Throat Mach (M_o)', results.machOrifice.toFixed(3), 'dimensionless'],
      ['Downstream Pipe Mach (M₂)', results.machDownstream.toFixed(3), 'dimensionless'],
      ['Expansion Factor (ε)', results.expansionFactor.toFixed(4), 'ISO 5167-2'],
      ['Choked Flow Capacity', fmtNum(toDisplay(results.chokedMassFlowKgH, 'massFlow', unitSystem), 1), labels.massFlow]
    );
  }

  const handleDownloadCsv = () => {
    const csvLines = [
      ['Parameter', 'Value', 'Unit / Note'].join(','),
      ...rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restriction-orifice-datasheet-${inputs.phase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    const htmlContent = buildStandaloneHtml(standaloneState);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'restriction-orifice-sizing.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSavePdf = () => {
    exportOrificePdf({
      inputs,
      results,
      unitSystem,
      fluidLabel,
      pipeLabel,
    });
  };

  const handleCopySummary = async () => {
    const text = rows.map(([k, v, u]) => `${k}: ${v} ${u}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored gracefully
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="datasheet-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl max-h-[88vh] flex flex-col shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="datasheet-modal-title" className="text-base font-semibold text-slate-900">
              Restriction Orifice Sizing Datasheet
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generated {timestamp} · {unitSystem} Units
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            aria-label="Close datasheet modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="py-2 font-medium">Parameter</th>
                <th className="py-2 font-medium text-right">Value</th>
                <th className="py-2 pl-4 font-medium">Unit / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(([param, val, unit]) => (
                <tr key={param} className="hover:bg-slate-50">
                  <td className="py-2 text-slate-700 font-medium">{param}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-slate-900 font-medium">{val}</td>
                  <td className="py-2 pl-4 text-slate-500 font-mono">{unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-200 bg-slate-50 rounded-b-lg no-print">
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              title="Download a self-contained, offline interactive HTML version of this calculator"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Standalone HTML</span>
            </button>
            <button
              onClick={handleSavePdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Save to PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
