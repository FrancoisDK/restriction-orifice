import React, { useState, useMemo } from 'react';
import { OrificeResults, FluidPhase } from '../utils/orificeCalculations';
import { UnitSystem, UNIT_LABELS, toDisplay, fmtNum } from '../utils/units';

interface HydraulicProfileSvgProps {
  results: OrificeResults;
  phase: FluidPhase;
  unitSystem: UnitSystem;
}

export const HydraulicProfileSvg: React.FC<HydraulicProfileSvgProps> = ({
  results,
  phase,
  unitSystem,
}) => {
  const [hoverNormX, setHoverNormX] = useState<number | null>(null);
  const labels = UNIT_LABELS[unitSystem];

  // Longitudinal domain: x/D from -2.0 (upstream) to +6.0 (downstream), orifice plate at x/D = 0
  // Normalized u in [0, 1] maps to xD in [-2, 6] => xD = -2 + 8*u => plate is at u = 0.25
  const plateU = 0.25;
  const vcU = 0.34; // Vena contracta roughly ~0.7D downstream of plate

  // Pressure function P(u) in bar(a)
  const pressureAtU = useMemo(() => {
    const p1 = results.p1BarA;
    const pvc = results.pVcBarA;
    const p2 = results.p2BarA;

    return (u: number): number => {
      if (u <= 0.16) {
        // Slight static pressure build-up right before plate
        return p1;
      }
      if (u < plateU) {
        // Subtle upstream wall tap rise (~2% of ΔP_vc) then steep drop into bore
        const t = (u - 0.16) / (plateU - 0.16);
        return p1 + 0.015 * (p1 - pvc) * Math.sin(t * Math.PI * 0.5) - 0.35 * (p1 - pvc) * Math.pow(t, 4);
      }
      if (u <= vcU) {
        // Rapid drop from orifice plane to vena contracta minimum
        const t = (u - plateU) / (vcU - plateU);
        const pAtPlate = p1 - 0.335 * (p1 - pvc);
        return pAtPlate - (pAtPlate - pvc) * Math.sin(t * Math.PI * 0.5);
      }
      // Downstream turbulent pressure recovery from P_vc to P_2
      const t = Math.min((u - vcU) / (0.88 - vcU), 1);
      const smooth = 1 - Math.pow(1 - t, 2.4);
      return pvc + (p2 - pvc) * smooth;
    };
  }, [results]);

  // Velocity function v(u) in m/s
  const velocityAtU = useMemo(() => {
    const v1 = results.velocityPipeInletMs;
    const vo = results.velocityOrificeMs;
    const v2 = results.velocityPipeOutletMs;
    return (u: number): number => {
      if (u < 0.18) return v1;
      if (u <= vcU) {
        const t = (u - 0.18) / (vcU - 0.18);
        return v1 + (vo - v1) * Math.pow(t, 1.8);
      }
      const t = Math.min((u - vcU) / (0.85 - vcU), 1);
      return vo + (v2 - vo) * (1 - Math.pow(1 - t, 2.2));
    };
  }, [results]);

  // SVG coordinate space
  const W = 820;
  const H = 370;
  const padL = 68;
  const padR = 28;
  const plotW = W - padL - padR;

  // Top band: Pressure Profile Chart (y: 26 to 195)
  const pTop = 26;
  const pBot = 192;
  const pH = pBot - pTop;

  // Bottom band: Pipe & Orifice Cross-Section Schematic (y: 224 to 338)
  const pipeTop = 230;
  const pipeBot = 334;
  const pipeMid = (pipeTop + pipeBot) / 2;
  const pipeHalfH = (pipeBot - pipeTop) / 2;

  const beta = Math.min(Math.max(results.beta || 0.5, 0.12), 0.9);
  const boreHalfH = pipeHalfH * beta;
  const vcHalfH = boreHalfH * Math.sqrt(Math.max(results.cd || 0.61, 0.58));

  // Scale pressure axis cleanly including P1, P_vc, P2, and threshold (Pv or P_crit)
  const pMinRaw = Math.min(results.pVcBarA, results.p2BarA, results.pCritOrPvBarA, results.p1BarA * 0.2);
  const pMaxRaw = results.p1BarA * 1.08;
  const pSpan = Math.max(pMaxRaw - pMinRaw, 0.2);
  const pMinAxis = Math.max(0, pMinRaw - pSpan * 0.12);
  const pMaxAxis = pMaxRaw + pSpan * 0.05;

  const yForP = (pBar: number) => {
    const frac = (pBar - pMinAxis) / Math.max(pMaxAxis - pMinAxis, 1e-6);
    return pBot - frac * pH;
  };

  // Generate smooth SVG path for P(u)
  const pressurePath = useMemo(() => {
    const pts: string[] = [];
    const n = 120;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = padL + u * plotW;
      const y = yForP(pressureAtU(u));
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [pressureAtU, pMinAxis, pMaxAxis]);

  const areaPath = useMemo(() => {
    return `${pressurePath} L ${(padL + plotW).toFixed(1)} ${pBot} L ${padL} ${pBot} Z`;
  }, [pressurePath]);

  const plateX = padL + plateU * plotW;
  const vcX = padL + vcU * plotW;
  const threshY = yForP(results.pCritOrPvBarA);
  const p1Y = yForP(results.p1BarA);
  const pvcY = yForP(results.pVcBarA);
  const p2Y = yForP(results.p2BarA);

  // Threshold color depending on whether P_vc breaches Pv / P_crit
  const thresholdBreached =
    phase === 'liquid'
      ? results.pVcBarA <= results.pCritOrPvBarA || results.regimeSeverity !== 'nominal'
      : results.isChoked || results.machOrifice >= 0.8;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const u = (svgX - padL) / plotW;
    if (u >= 0 && u <= 1) {
      setHoverNormX(u);
    } else {
      setHoverNormX(null);
    }
  };

  const hoverP = hoverNormX !== null ? pressureAtU(hoverNormX) : null;
  const hoverV = hoverNormX !== null ? velocityAtU(hoverNormX) : null;
  const hoverXD = hoverNormX !== null ? -2 + hoverNormX * 8 : null;

  // Y-axis ticks (4 clean ticks)
  const yTicks = [0, 0.33, 0.66, 1].map((frac) => {
    const val = pMinAxis + frac * (pMaxAxis - pMinAxis);
    return { val, y: pBot - frac * pH };
  });

  // Streamline paths inside pipe
  const streamlineOffsets = [-0.72, -0.4, 0, 0.4, 0.72];
  const makeStreamline = (frac: number) => {
    const yPipe = pipeMid + frac * pipeHalfH;
    const yVc = pipeMid + frac * vcHalfH * 0.92;
    const xStart = padL;
    const xConv = padL + 0.12 * plotW;
    const xEndRec = padL + 0.78 * plotW;
    const xEnd = padL + plotW;
    return `M ${xStart} ${yPipe.toFixed(1)} L ${xConv.toFixed(1)} ${yPipe.toFixed(1)} C ${(xConv + 45).toFixed(1)} ${yPipe.toFixed(1)}, ${(plateX - 15).toFixed(1)} ${yVc.toFixed(1)}, ${vcX.toFixed(1)} ${yVc.toFixed(1)} C ${(vcX + 55).toFixed(1)} ${yVc.toFixed(1)}, ${(xEndRec - 65).toFixed(1)} ${yPipe.toFixed(1)}, ${xEndRec.toFixed(1)} ${yPipe.toFixed(1)} L ${xEnd} ${yPipe.toFixed(1)}`;
  };

  return (
    <div className="relative w-full select-none">
      {/* Compact HUD header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-700">Axial Pressure &amp; Flow Cross-Section</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            D = {fmtNum(toDisplay(results.pipeIdMm, 'diameter', unitSystem), 1)} {labels.diameter}
          </span>
          <span aria-hidden="true">/</span>
          <span className="font-mono tabular-nums">
            d = {fmtNum(toDisplay(results.orificeDiaMm, 'diameter', unitSystem), 2)} {labels.diameter}
          </span>
          <span aria-hidden="true">/</span>
          <span className="font-mono tabular-nums">β = {results.beta.toFixed(3)}</span>
        </div>

        <div className="font-mono tabular-nums text-slate-600 h-4">
          {hoverNormX !== null && hoverP !== null && hoverV !== null && hoverXD !== null ? (
            <span>
              x/D = {hoverXD >= 0 ? '+' : ''}
              {hoverXD.toFixed(2)} &nbsp;|&nbsp; P = {fmtNum(toDisplay(hoverP, 'pressureAbs', unitSystem), 2)}{' '}
              {labels.pressureAbs} &nbsp;|&nbsp; v = {fmtNum(toDisplay(hoverV, 'velocity', unitSystem), 1)}{' '}
              {labels.velocity}
            </span>
          ) : (
            <span className="text-slate-400">Hover across pipe axis to inspect station P(x) &amp; v(x)</span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto cursor-crosshair overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverNormX(null)}
        role="img"
        aria-label="Hydraulic axial pressure profile and restriction orifice cross section"
      >
        <defs>
          <linearGradient id="pressureAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.01" />
          </linearGradient>
          <pattern id="pipeWallHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* Pressure Plot Grid & Axes */}
        {yTicks.map((t, idx) => (
          <g key={idx}>
            <line x1={padL} y1={t.y} x2={padL + plotW} y2={t.y} stroke="#e2e8f0" strokeWidth="1" />
            <text
              x={padL - 8}
              y={t.y + 3.5}
              textAnchor="end"
              className="fill-slate-400 font-mono text-[10px]"
            >
              {fmtNum(toDisplay(t.val, 'pressureAbs', unitSystem), 1)}
            </text>
          </g>
        ))}

        {/* Y-Axis Unit Label */}
        <text
          x={14}
          y={(pTop + pBot) / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${(pTop + pBot) / 2})`}
          className="fill-slate-400 font-mono text-[10px] uppercase tracking-wider"
        >
          Pressure ({labels.pressureAbs})
        </text>

        {/* Vertical Station Guides */}
        <line x1={plateX} y1={pTop} x2={plateX} y2={pipeTop} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1" />
        <line x1={vcX} y1={pTop} x2={vcX} y2={pipeMid} stroke="#94a3b8" strokeDasharray="2 2" strokeWidth="1" />

        {/* Threshold Line: Pv (Liquid) or P_crit (Gas) */}
        {threshY >= pTop - 6 && threshY <= pBot + 6 && (
          <g>
            <line
              x1={padL}
              y1={threshY}
              x2={padL + plotW}
              y2={threshY}
              stroke={thresholdBreached ? '#e11d48' : '#d97706'}
              strokeWidth="1.25"
              strokeDasharray="5 4"
            />
            <text
              x={padL + plotW - 4}
              y={threshY - 5}
              textAnchor="end"
              className={`font-mono text-[10px] font-medium ${
                thresholdBreached ? 'fill-rose-600' : 'fill-amber-600'
              }`}
            >
              {phase === 'liquid' ? 'Pv Vapor Limit' : 'P* Sonic Critical'} (
              {fmtNum(toDisplay(results.pCritOrPvBarA, 'pressureAbs', unitSystem), 2)} {labels.pressureAbs})
            </text>
          </g>
        )}

        {/* Pressure Fill & Line */}
        <path d={areaPath} fill="url(#pressureAreaGrad)" />
        <path d={pressurePath} fill="none" stroke="#0284c7" strokeWidth="2.25" strokeLinecap="round" />

        {/* Annotated Key Pressure Markers (P1, P_vc, P2) */}
        <circle cx={padL + 18} cy={p1Y} r="3.5" fill="#0284c7" />
        <text x={padL + 26} y={p1Y - 6} className="fill-slate-700 font-mono text-[10px] font-medium">
          P₁ {fmtNum(toDisplay(results.p1BarA, 'pressureAbs', unitSystem), 2)}
        </text>

        <circle cx={vcX} cy={pvcY} r="4" fill={thresholdBreached ? '#e11d48' : '#0284c7'} stroke="#fff" strokeWidth="1.5" />
        <text
          x={vcX + 8}
          y={Math.min(pvcY + 12, pBot - 6)}
          className={`font-mono text-[10px] font-semibold ${thresholdBreached ? 'fill-rose-600' : 'fill-slate-700'}`}
        >
          P_vc {fmtNum(toDisplay(results.pVcBarA, 'pressureAbs', unitSystem), 2)}
        </text>

        <circle cx={padL + plotW - 18} cy={p2Y} r="3.5" fill="#0284c7" />
        <text x={padL + plotW - 24} y={p2Y - 8} textAnchor="end" className="fill-slate-700 font-mono text-[10px] font-medium">
          P₂ {fmtNum(toDisplay(results.p2BarA, 'pressureAbs', unitSystem), 2)}
        </text>

        {/* ΔP_perm Dimension Bracket on Right */}
        {Math.abs(p2Y - p1Y) > 10 && (
          <g>
            <line x1={padL + plotW - 8} y1={p1Y} x2={padL + plotW - 8} y2={p2Y} stroke="#64748b" strokeWidth="1" />
            <line x1={padL + plotW - 12} y1={p1Y} x2={padL + plotW - 4} y2={p1Y} stroke="#64748b" strokeWidth="1" />
            <line x1={padL + plotW - 12} y1={p2Y} x2={padL + plotW - 4} y2={p2Y} stroke="#64748b" strokeWidth="1" />
            <text
              x={padL + plotW - 14}
              y={(p1Y + p2Y) / 2 + 3}
              textAnchor="end"
              className="fill-slate-600 font-mono text-[10px]"
            >
              ΔP_perm = {fmtNum(toDisplay(results.permPressureDropBar, 'pressureDiff', unitSystem), 2)} {labels.pressureDiff}
            </text>
          </g>
        )}

        {/* Pipe & Orifice Cross-Section Schematic */}
        {/* Pipe Wall Hatched Bands */}
        <rect x={padL} y={pipeTop - 10} width={plotW} height="10" fill="url(#pipeWallHatch)" stroke="#94a3b8" strokeWidth="1" />
        <rect x={padL} y={pipeBot} width={plotW} height="10" fill="url(#pipeWallHatch)" stroke="#94a3b8" strokeWidth="1" />

        {/* Pipe Interior Background */}
        <rect x={padL} y={pipeTop} width={plotW} height={pipeBot - pipeTop} fill="#f8fafc" />

        {/* Wake / Recirculation Eddy Zones behind Orifice Plate */}
        <path
          d={`M ${plateX + 5} ${pipeTop + 1} L ${vcX + 18} ${pipeTop + 1} Q ${plateX + 24} ${pipeMid - vcHalfH - 4} ${plateX + 5} ${pipeMid - boreHalfH} Z`}
          fill="#e2e8f0"
          opacity="0.7"
        />
        <path
          d={`M ${plateX + 5} ${pipeBot - 1} L ${vcX + 18} ${pipeBot - 1} Q ${plateX + 24} ${pipeMid + vcHalfH + 4} ${plateX + 5} ${pipeMid + boreHalfH} Z`}
          fill="#e2e8f0"
          opacity="0.7"
        />

        {/* Flow Streamlines */}
        {streamlineOffsets.map((off, idx) => (
          <path
            key={idx}
            d={makeStreamline(off)}
            fill="none"
            stroke={off === 0 ? '#0284c7' : '#38bdf8'}
            strokeWidth={off === 0 ? '1.5' : '1'}
            strokeDasharray={off === 0 ? '6 4' : undefined}
            opacity={off === 0 ? 0.9 : 0.6}
          />
        ))}

        {/* Flow Direction Arrow */}
        <polygon
          points={`${padL + 36},${pipeMid} ${padL + 26},${pipeMid - 4} ${padL + 26},${pipeMid + 4}`}
          fill="#0284c7"
        />
        <polygon
          points={`${padL + plotW - 24},${pipeMid} ${padL + plotW - 34},${pipeMid - 4} ${padL + plotW - 34},${pipeMid + 4}`}
          fill="#0284c7"
        />

        {/* Orifice Plate Upper & Lower Blades */}
        <rect
          x={plateX - 4}
          y={pipeTop - 10}
          width="8"
          height={pipeMid - boreHalfH - (pipeTop - 10)}
          fill="#334155"
          stroke="#0f172a"
          strokeWidth="1"
        />
        <rect
          x={plateX - 4}
          y={pipeMid + boreHalfH}
          width="8"
          height={pipeBot + 10 - (pipeMid + boreHalfH)}
          fill="#334155"
          stroke="#0f172a"
          strokeWidth="1"
        />

        {/* Station Labels along bottom */}
        <text x={padL + 4} y={pipeBot + 26} className="fill-slate-500 font-mono text-[10px]">
          -2D Upstream
        </text>
        <text x={plateX} y={pipeBot + 26} textAnchor="middle" className="fill-slate-700 font-mono text-[10px] font-medium">
          Orifice (0D)
        </text>
        <text x={vcX} y={pipeBot + 26} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
          Vena Contracta
        </text>
        <text x={padL + plotW - 4} y={pipeBot + 26} textAnchor="end" className="fill-slate-500 font-mono text-[10px]">
          +6D Recovery
        </text>

        {/* Interactive Hover Crosshair */}
        {hoverNormX !== null && hoverP !== null && (
          <g>
            <line
              x1={padL + hoverNormX * plotW}
              y1={pTop}
              x2={padL + hoverNormX * plotW}
              y2={pipeBot + 10}
              stroke="#0f172a"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={padL + hoverNormX * plotW}
              cy={yForP(hoverP)}
              r="4.5"
              fill="#0f172a"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
