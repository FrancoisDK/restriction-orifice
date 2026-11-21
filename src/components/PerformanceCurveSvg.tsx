import React, { useState } from 'react';
import { OrificeResults, SolveTarget, FluidPhase } from '../utils/orificeCalculations';
import { UnitSystem, UNIT_LABELS, toDisplay, fmtNum } from '../utils/units';

interface PerformanceCurveSvgProps {
  results: OrificeResults;
  solveTarget: SolveTarget;
  phase: FluidPhase;
  unitSystem: UnitSystem;
}

export const PerformanceCurveSvg: React.FC<PerformanceCurveSvgProps> = ({
  results,
  solveTarget,
  phase,
  unitSystem,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const labels = UNIT_LABELS[unitSystem];
  const points = results.sweepCurve;

  if (!points || points.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-xs text-slate-400">
        Enter valid operating conditions to generate performance curves.
      </div>
    );
  }

  const W = 760;
  const H = 260;
  const padL = 66;
  const padR = 64;
  const padT = 22;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const isDiaSweep = solveTarget === 'diameter';
  const y1Label = isDiaSweep
    ? `Orifice Bore (${labels.diameter})`
    : `Mass Flow (${labels.massFlow})`;
  const y2Label = phase === 'liquid' ? 'Cavitation Index σ' : 'Orifice Mach M_o';

  const xVals = points.map((p) => toDisplay(p.dpPermBar, 'pressureDiff', unitSystem));
  const y1Vals = points.map((p) =>
    isDiaSweep
      ? toDisplay(p.orificeDiaMm, 'diameter', unitSystem)
      : toDisplay(p.massFlowKgH, 'massFlow', unitSystem)
  );
  const y2Vals = points.map((p) => Math.min(p.machOrSigma, phase === 'liquid' ? 12 : 1.1));

  const xMax = Math.max(...xVals, 1e-6);
  const y1Min = Math.min(...y1Vals) * 0.9;
  const y1Max = Math.max(...y1Vals, 1e-6) * 1.08;
  const y2Max = phase === 'liquid' ? Math.max(Math.min(Math.max(...y2Vals), 12), 4) : 1.15;

  const xFor = (xDisp: number) => padL + (xDisp / xMax) * plotW;
  const y1For = (y1Disp: number) =>
    padT + plotH - ((y1Disp - y1Min) / Math.max(y1Max - y1Min, 1e-6)) * plotH;
  const y2For = (y2Val: number) =>
    padT + plotH - (Math.min(y2Val, y2Max) / Math.max(y2Max, 1e-6)) * plotH;

  const pathY1 = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xFor(xVals[i]).toFixed(1)} ${y1For(y1Vals[i]).toFixed(1)}`)
    .join(' ');

  const pathY2 = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xFor(xVals[i]).toFixed(1)} ${y2For(y2Vals[i]).toFixed(1)}`)
    .join(' ');

  // Find onset of choking / cavitation region for background shading
  const firstCriticalIdx = points.findIndex((p) => p.isChokedOrCavitating);
  const criticalStartX = firstCriticalIdx >= 0 ? xFor(xVals[firstCriticalIdx]) : null;

  // Current operating point
  const opX = xFor(toDisplay(results.permPressureDropBar, 'pressureDiff', unitSystem));
  const opY1 = y1For(
    isDiaSweep
      ? toDisplay(results.orificeDiaMm, 'diameter', unitSystem)
      : toDisplay(results.massFlowKgH, 'massFlow', unitSystem)
  );

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    if (svgX < padL || svgX > padL + plotW) {
      setHoverIdx(null);
      return;
    }
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(xFor(xVals[i]) - svgX);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    setHoverIdx(bestIdx);
  };

  const activeHover = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="w-full select-none">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-700">
            {isDiaSweep ? 'Required Orifice Diameter vs. ΔP_perm' : 'Capacity Curve: Flowrate vs. ΔP_perm'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-sky-600" />
            <span>{isDiaSweep ? 'Bore d' : 'Mass Flow'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 border-t border-dashed border-amber-600" />
            <span>{phase === 'liquid' ? 'Cavitation σ' : 'Orifice Mach M_o'}</span>
          </span>
        </div>

        <div className="font-mono tabular-nums text-slate-600 h-4">
          {activeHover && hoverIdx !== null ? (
            <span>
              ΔP = {fmtNum(xVals[hoverIdx], 2)} {labels.pressureDiff} &nbsp;|&nbsp;{' '}
              {isDiaSweep
                ? `d = ${fmtNum(y1Vals[hoverIdx], 2)} ${labels.diameter}`
                : `ṁ = ${fmtNum(y1Vals[hoverIdx], 1)} ${labels.massFlow}`}{' '}
              &nbsp;|&nbsp; {phase === 'liquid' ? `σ = ${activeHover.machOrSigma.toFixed(2)}` : `M = ${activeHover.machOrSigma.toFixed(2)}`}
            </span>
          ) : (
            <span className="text-slate-400">Snap crosshair along curve for exact coordinates</span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto cursor-crosshair overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label="Parametric orifice performance curve"
      >
        {/* Shaded Choked / Cavitation Risk Zone */}
        {criticalStartX !== null && criticalStartX < padL + plotW && (
          <g>
            <rect
              x={criticalStartX}
              y={padT}
              width={padL + plotW - criticalStartX}
              height={plotH}
              fill="#e11d48"
              opacity="0.06"
            />
            <line
              x1={criticalStartX}
              y1={padT}
              x2={criticalStartX}
              y2={padT + plotH}
              stroke="#e11d48"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
            />
            <text
              x={Math.min(criticalStartX + 6, padL + plotW - 95)}
              y={padT + 14}
              className="fill-rose-600 font-mono text-[9.5px] font-medium"
            >
              {phase === 'liquid' ? 'Cavitation Risk Zone' : 'Near-Sonic / Choked'}
            </text>
          </g>
        )}

        {/* Horizontal Gridlines & Left Y1 Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, idx) => {
          const y = padT + plotH - f * plotH;
          const v1 = y1Min + f * (y1Max - y1Min);
          const v2 = f * y2Max;
          return (
            <g key={idx}>
              <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padL - 8} y={y + 3.5} textAnchor="end" className="fill-slate-500 font-mono text-[10px]">
                {fmtNum(v1, isDiaSweep ? 1 : 0)}
              </text>
              <text x={padL + plotW + 8} y={y + 3.5} textAnchor="start" className="fill-amber-600 font-mono text-[10px]">
                {v2.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Vertical X Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, idx) => {
          const xVal = f * xMax;
          const x = padL + f * plotW;
          return (
            <g key={idx}>
              <line x1={x} y1={padT + plotH} x2={x} y2={padT + plotH + 4} stroke="#cbd5e1" strokeWidth="1" />
              <text x={x} y={padT + plotH + 16} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
                {fmtNum(xVal, 1)}
              </text>
            </g>
          );
        })}

        {/* Axis Titles */}
        <text
          x={14}
          y={padT + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${padT + plotH / 2})`}
          className="fill-slate-500 font-mono text-[10px]"
        >
          {y1Label}
        </text>
        <text
          x={W - 12}
          y={padT + plotH / 2}
          textAnchor="middle"
          transform={`rotate(90 ${W - 12} ${padT + plotH / 2})`}
          className="fill-amber-600 font-mono text-[10px]"
        >
          {y2Label}
        </text>
        <text
          x={padL + plotW / 2}
          y={H - 6}
          textAnchor="middle"
          className="fill-slate-500 font-mono text-[10px]"
        >
          Non-Recoverable Pressure Drop ΔP_perm ({labels.pressureDiff})
        </text>

        {/* Secondary Curve (Mach or Cavitation σ) */}
        <path d={pathY2} fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="4 3" />

        {/* Primary Curve */}
        <path d={pathY1} fill="none" stroke="#0284c7" strokeWidth="2.25" strokeLinecap="round" />

        {/* Operating Point Marker */}
        {opX >= padL && opX <= padL + plotW && opY1 >= padT - 4 && opY1 <= padT + plotH + 4 && (
          <g>
            <line x1={opX} y1={padT} x2={opX} y2={padT + plotH} stroke="#0284c7" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
            <circle cx={opX} cy={opY1} r="5" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
            <text
              x={opX > padL + plotW * 0.72 ? opX - 8 : opX + 8}
              y={opY1 - 8}
              textAnchor={opX > padL + plotW * 0.72 ? 'end' : 'start'}
              className="fill-sky-700 font-mono text-[10px] font-semibold"
            >
              Operating Point
            </text>
          </g>
        )}

        {/* Hover Snap Crosshair */}
        {hoverIdx !== null && (
          <g>
            <line
              x1={xFor(xVals[hoverIdx])}
              y1={padT}
              x2={xFor(xVals[hoverIdx])}
              y2={padT + plotH}
              stroke="#0f172a"
              strokeWidth="1"
            />
            <circle
              cx={xFor(xVals[hoverIdx])}
              cy={y1For(y1Vals[hoverIdx])}
              r="4"
              fill="#0f172a"
              stroke="#fff"
              strokeWidth="1.5"
            />
            <circle
              cx={xFor(xVals[hoverIdx])}
              cy={y2For(y2Vals[hoverIdx])}
              r="3.5"
              fill="#d97706"
              stroke="#fff"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
