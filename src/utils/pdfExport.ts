import { jsPDF } from 'jspdf';
import { OrificeInputs, OrificeResults } from './orificeCalculations';
import { UnitSystem, UNIT_LABELS, toDisplay, fmtNum } from './units';

export interface PdfExportParams {
  inputs: OrificeInputs;
  results: OrificeResults;
  unitSystem: UnitSystem;
  fluidLabel: string;
  pipeLabel: string;
}

function pdfSafe(str: string): string {
  return str
    .replace(/σᵢ/g, 'sigma_i')
    .replace(/σ/g, 'sigma')
    .replace(/Δ/g, 'd')
    .replace(/β/g, 'beta')
    .replace(/ρ/g, 'rho')
    .replace(/μ/g, 'mu')
    .replace(/ε/g, 'eps')
    .replace(/ṁ/g, 'm_dot')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/ᵢ/g, '_i')
    .replace(/³/g, '3')
    .replace(/²/g, '2')
    .replace(/°/g, ' deg ')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/·/g, '|')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[^\x20-\x7E]/g, '');
}

export function exportOrificePdf({
  inputs,
  results,
  unitSystem,
  fluidLabel,
  pipeLabel,
}: PdfExportParams): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const rawLabels = UNIT_LABELS[unitSystem];
  const labels = {
    pressureAbs: pdfSafe(rawLabels.pressureAbs),
    pressureDiff: pdfSafe(rawLabels.pressureDiff),
    diameter: pdfSafe(rawLabels.diameter),
    temperature: pdfSafe(rawLabels.temperature).trim(),
    density: pdfSafe(rawLabels.density),
    viscosity: pdfSafe(rawLabels.viscosity),
    massFlow: pdfSafe(rawLabels.massFlow),
    volFlowLiquid: pdfSafe(rawLabels.volFlowLiquid),
    volFlowGas: pdfSafe(rawLabels.volFlowGas),
    velocity: pdfSafe(rawLabels.velocity),
  };
  const safeFluid = pdfSafe(fluidLabel);
  const safePipe = pdfSafe(pipeLabel);
  const pageW = 210;
  const margin = 14;
  const contentW = pageW - margin * 2; // 182 mm
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const drawPageHeader = (subtitle: string, pageTag: string) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 21, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.text('Restriction Orifice Sizing', margin, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(148, 163, 184);
    doc.text(subtitle, margin, 16);
    doc.text(`${timestamp} UTC  |  ${unitSystem} Units  |  ${pageTag}`, pageW - margin, 16, {
      align: 'right',
    });
  };

  const drawPageFooter = (note: string) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, 283, pageW - margin, 283);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Restriction Orifice Sizing  |  ISO 5167-2, ISA-RP75.23 & Crane TP-410', margin, 288);
    doc.text(note, pageW - margin, 288, { align: 'right' });
  };

  // ==================== PAGE 1: DATASHEET & STAGING ====================
  drawPageHeader('Engineering Calculation & Hydraulic Analysis Datasheet', 'Page 1 of 2');

  let y = 27;

  // Primary Solved Result Banner (two clean zones separated by vertical hairline)
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentW, 24, 1.5, 1.5, 'FD');
  const splitX = margin + 92;
  doc.line(splitX, y + 3, splitX, y + 21);

  let solvedLabel = 'Solved Orifice Bore Diameter (d)';
  let solvedVal = `${fmtNum(toDisplay(results.orificeDiaMm, 'diameter', unitSystem), 2)} ${labels.diameter}`;
  if (inputs.solveTarget === 'flowrate') {
    const isVol = inputs.flowInputMode === 'volumetric';
    solvedLabel = isVol ? 'Solved Volumetric Flowrate' : 'Solved Mass Flowrate';
    solvedVal = isVol
      ? `${fmtNum(
          toDisplay(
            results.stdVolFlowNm3H,
            inputs.phase === 'liquid' ? 'volFlowLiquid' : 'volFlowGas',
            unitSystem
          ),
          2
        )} ${inputs.phase === 'liquid' ? labels.volFlowLiquid : labels.volFlowGas}`
      : `${fmtNum(toDisplay(results.massFlowKgH, 'massFlow', unitSystem), 1)} ${labels.massFlow}`;
  } else if (inputs.solveTarget === 'pressureDrop') {
    solvedLabel = 'Solved Non-Recov. Pressure Drop (dP_perm)';
    solvedVal = `${fmtNum(toDisplay(results.permPressureDropBar, 'pressureDiff', unitSystem), 3)} ${labels.pressureDiff}`;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(100, 116, 139);
  doc.text(solvedLabel.toUpperCase(), margin + 4, y + 6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(15, 23, 42);
  doc.text(solvedVal, margin + 4, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Beta = ${results.beta.toFixed(4)}  |  Cd = ${results.cd.toFixed(4)}  |  Re_D = ${Math.round(results.reynoldsPipe).toLocaleString('en-US')}`,
    margin + 4,
    y + 20.5
  );

  // Regime Status inside right zone [splitX + 4 .. margin + contentW - 4] (width = 82 mm)
  const regimeX = splitX + 4;
  const regimeMaxW = margin + contentW - 4 - regimeX; // 82 mm
  const sevColor: [number, number, number] =
    results.regimeSeverity === 'nominal'
      ? [5, 150, 105]
      : results.regimeSeverity === 'warning'
      ? [217, 119, 6]
      : [225, 29, 72];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(...sevColor);
  doc.text(pdfSafe(results.regimeLabel), regimeX, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.setTextColor(71, 85, 105);
  const splitDetail: string[] = doc.splitTextToSize(pdfSafe(results.regimeDetail), regimeMaxW);
  splitDetail.slice(0, 3).forEach((line, idx) => {
    doc.text(line, regimeX, y + 12 + idx * 3.8);
  });

  y += 30;

  // Two-column summary tables: Inputs (left) vs Hydraulics/Diagnostics (right)
  const colW = (contentW - 8) / 2;
  const leftX = margin;
  const rightX = margin + colW + 8;

  const drawKvSection = (
    title: string,
    rows: Array<[string, string]>,
    x: number,
    startY: number
  ): number => {
    let cy = startY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(title, x, cy);
    cy += 2;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(x, cy, x + colW, cy);
    cy += 5;

    for (const [k, v] of rows) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(k, x, cy);
      doc.setFont('courier', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(v, x + colW, cy, { align: 'right' });
      cy += 5.1;
    }
    return cy;
  };

  const leftRows: Array<[string, string]> = [
    ['Fluid / Service', safeFluid],
    ['Phase', inputs.phase === 'liquid' ? 'Liquid (Incompressible)' : 'Gas / Vapor (Compressible)'],
    ['Pipe Specification', safePipe],
    ['Pipe Internal Dia (D)', `${fmtNum(toDisplay(results.pipeIdMm, 'diameter', unitSystem), 2)} ${labels.diameter}`],
    ['Orifice Bore Dia (d)', `${fmtNum(toDisplay(results.orificeDiaMm, 'diameter', unitSystem), 2)} ${labels.diameter}`],
    ['Plate Thickness (t)', `${fmtNum(toDisplay(inputs.plateThicknessMm, 'diameter', unitSystem), 2)} ${labels.diameter}`],
    ['Edge Profile', inputs.edgeProfile === 'sharp' ? 'Sharp-Edged ISO 5167-2' : 'Thick-Plate Square'],
    ['Upstream Pressure (P1)', `${fmtNum(toDisplay(results.p1BarA, 'pressureAbs', unitSystem), 2)} ${labels.pressureAbs}`],
    ['Upstream Temp (T1)', `${fmtNum(toDisplay(inputs.upstreamTempC, 'temperature', unitSystem), 1)} ${labels.temperature}`],
    ['Upstream Density (rho1)', `${fmtNum(toDisplay(results.densityUpstreamKgM3, 'density', unitSystem), 2)} ${labels.density}`],
  ];

  if (inputs.phase === 'liquid') {
    leftRows.push(
      ['Vapor Pressure (Pv)', `${fmtNum(toDisplay(inputs.vaporPressureBarA, 'pressureAbs', unitSystem), 4)} ${labels.pressureAbs}`],
      ['Critical Pressure (Pc)', `${fmtNum(toDisplay(inputs.criticalPressureBarA, 'pressureAbs', unitSystem), 1)} ${labels.pressureAbs}`],
      ['Dynamic Viscosity (mu)', `${fmtNum(inputs.liquidViscosityCp, 3)} ${labels.viscosity}`]
    );
  } else {
    leftRows.push(
      ['Molecular Weight (MW)', `${inputs.molecularWeight.toFixed(2)} g/mol`],
      ['Cp/Cv Ratio (k) / Z1', `${inputs.kRatio.toFixed(3)} / ${inputs.zFactor.toFixed(3)}`],
      ['Dynamic Viscosity (mu)', `${fmtNum(inputs.gasViscosityCp, 4)} ${labels.viscosity}`]
    );
  }

  const rightRows: Array<[string, string]> = [
    ['Mass Flowrate (m_dot)', `${fmtNum(toDisplay(results.massFlowKgH, 'massFlow', unitSystem), 1)} ${labels.massFlow}`],
    [
      inputs.phase === 'liquid' ? 'Volumetric Flow (Q)' : 'Std Gas Flow',
      `${fmtNum(
        toDisplay(
          results.stdVolFlowNm3H,
          inputs.phase === 'liquid' ? 'volFlowLiquid' : 'volFlowGas',
          unitSystem
        ),
        2
      )} ${inputs.phase === 'liquid' ? labels.volFlowLiquid : labels.volFlowGas}`,
    ],
    ['Non-Recov. dP_perm', `${fmtNum(toDisplay(results.permPressureDropBar, 'pressureDiff', unitSystem), 3)} ${labels.pressureDiff}`],
    ['Vena Contracta dP_vc', `${fmtNum(toDisplay(results.vcPressureDropBar, 'pressureDiff', unitSystem), 3)} ${labels.pressureDiff}`],
    ['Vena Contracta P_vc', `${fmtNum(toDisplay(results.pVcBarA, 'pressureAbs', unitSystem), 3)} ${labels.pressureAbs}`],
    ['Downstream Pressure P2', `${fmtNum(toDisplay(results.p2BarA, 'pressureAbs', unitSystem), 3)} ${labels.pressureAbs}`],
    ['Pressure Recovery', `${results.pressureRecoveryPct.toFixed(1)} %`],
    ['Orifice Jet Vel. (v_o)', `${fmtNum(toDisplay(results.velocityOrificeMs, 'velocity', unitSystem), 2)} ${labels.velocity}`],
    ['Pipe Vel. (v1 / v2)', `${fmtNum(toDisplay(results.velocityPipeInletMs, 'velocity', unitSystem), 1)} / ${fmtNum(toDisplay(results.velocityPipeOutletMs, 'velocity', unitSystem), 1)} ${labels.velocity}`],
    ['Loss Coeff (K_pipe)', fmtNum(results.kLossPipe, 1)],
  ];

  if (inputs.phase === 'liquid') {
    rightRows.push(
      ['Cavitation Index (sigma)', `${results.cavitationIndexSigma.toFixed(2)} (Limit ${results.incipientSigmaLimit.toFixed(2)})`],
      ['Choked dP Limit', `${fmtNum(toDisplay(results.dpChokedBar, 'pressureDiff', unitSystem), 3)} ${labels.pressureDiff}`],
      ['Recovery Factor (FL)', results.recoveryFactorFl.toFixed(3)]
    );
  } else {
    rightRows.push(
      ['Sonic Vel. (a1 / a*)', `${fmtNum(toDisplay(results.sonicVelocityUpstreamMs, 'velocity', unitSystem), 1)} / ${fmtNum(toDisplay(results.sonicVelocityThroatMs, 'velocity', unitSystem), 1)} ${labels.velocity}`],
      ['Mach (Orifice / Pipe)', `${results.machOrifice.toFixed(3)} / ${results.machDownstream.toFixed(3)}`],
      ['Choked Capacity', `${fmtNum(toDisplay(results.chokedMassFlowKgH, 'massFlow', unitSystem), 1)} ${labels.massFlow}`]
    );
  }

  const yLeftEnd = drawKvSection('Process, Pipe & Fluid Inputs', leftRows, leftX, y);
  const yRightEnd = drawKvSection('Hydraulic & Diagnostic Results', rightRows, rightX, y);
  y = Math.max(yLeftEnd, yRightEnd) + 7;

  // Multi-Stage Staging Table (Non-overlapping spaced columns)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Multi-Stage Orifice Comparison (Minimum Recommended: ${results.recommendedStages} ${
      results.recommendedStages === 1 ? 'Stage' : 'Stages'
    })`,
    margin,
    y
  );
  y += 3.5;

  // Carefully spaced column anchor positions inside [margin=14 .. margin+contentW=196]
  const cStageX = margin + 2;      // Left aligned: 16..42
  const cDpX = margin + 56;        // Right aligned: 42..70
  const cBoreX = margin + 79;      // Right aligned: 72..93
  const cBetaX = margin + 96;      // Right aligned: 95..110
  const cPvcX = margin + 126;      // Right aligned: 112..140
  const cMsX = margin + 152;       // Right aligned: 142..166
  const cRegX = margin + contentW - 2; // Right aligned: 168..194

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentW, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);

  doc.text('Stages', cStageX, y + 5, { align: 'left' });
  doc.text(`Stage dP (${labels.pressureDiff})`, cDpX, y + 5, { align: 'right' });
  doc.text(`Bore (${labels.diameter})`, cBoreX, y + 5, { align: 'right' });
  doc.text('Beta', cBetaX, y + 5, { align: 'right' });
  doc.text(`Worst P_vc (${labels.pressureAbs})`, cPvcX, y + 5, { align: 'right' });
  doc.text(inputs.phase === 'liquid' ? 'Cav. sigma' : 'Mach M_o', cMsX, y + 5, { align: 'right' });
  doc.text('Regime', cRegX, y + 5, { align: 'right' });
  y += 7.5;

  results.stageAnalysis.forEach((row) => {
    if (row.stages === results.recommendedStages) {
      doc.setFillColor(240, 249, 255);
      doc.rect(margin, y, contentW, 6.5, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6.5, margin + contentW, y + 6.5);

    doc.setFont('helvetica', row.stages === results.recommendedStages ? 'bold' : 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${row.stages} ${row.stages === 1 ? 'Plate' : 'Plates'}${
        row.stages === results.recommendedStages ? ' *' : ''
      }`,
      cStageX,
      y + 4.5,
      { align: 'left' }
    );

    doc.setFont('courier', 'normal');
    doc.text(fmtNum(toDisplay(row.dpPerStageBar, 'pressureDiff', unitSystem), 3), cDpX, y + 4.5, { align: 'right' });
    doc.text(fmtNum(toDisplay(row.boreDiaMm, 'diameter', unitSystem), 2), cBoreX, y + 4.5, { align: 'right' });
    doc.text(row.beta.toFixed(3), cBetaX, y + 4.5, { align: 'right' });
    doc.text(fmtNum(toDisplay(row.worstPvcBarA, 'pressureAbs', unitSystem), 2), cPvcX, y + 4.5, { align: 'right' });
    doc.text(row.machOrSigma.toFixed(2), cMsX, y + 4.5, { align: 'right' });

    const rColor: [number, number, number] =
      row.severity === 'nominal' ? [5, 150, 105] : row.severity === 'warning' ? [217, 119, 6] : [225, 29, 72];
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...rColor);
    doc.text(row.statusLabel, cRegX, y + 4.5, { align: 'right' });

    y += 6.5;
  });

  // Warnings & Methodology Summary on remainder of Page 1
  if (results.warnings.length > 0) {
    y += 6;
    doc.setDrawColor(253, 230, 138);
    doc.setFillColor(255, 251, 235);
    const warnLines: string[] = results.warnings.flatMap((w) =>
      doc.splitTextToSize(pdfSafe(`! ${w}`), contentW - 8)
    );
    const warnBoxH = Math.max(12, warnLines.slice(0, 4).length * 4 + 7);
    doc.roundedRect(margin, y, contentW, warnBoxH, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(180, 83, 9);
    doc.text('Engineering Validity Notes', margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    warnLines.slice(0, 4).forEach((ln, idx) => {
      doc.text(ln, margin + 4, y + 9.5 + idx * 4);
    });
    y += warnBoxH + 5;
  } else {
    y += 8;
  }

  // Governing Methodology Box if space remains above footer
  if (y < 248) {
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentW, 24, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Calculation Basis', margin + 4, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(71, 85, 105);
    doc.text(
      '1. Discharge coefficient Cd(beta, Re_D) solved iteratively via ISO 5167-2 Reader-Harris/Gallagher correlation.',
      margin + 4,
      y + 10.5
    );
    doc.text(
      '2. Non-recoverable pressure drop dP_perm related to vena contracta dP_vc via ISO 5167-2 momentum recovery ratio.',
      margin + 4,
      y + 15
    );
    doc.text(
      '3. Liquid cavitation evaluated via ISA-RP75.23 (sigma, FL, FF, dP_choked); gas flow via ISO 5167-2 expansion factor & isentropic sonic choke.',
      margin + 4,
      y + 19.5
    );
  }

  drawPageFooter('* Recommended minimum stage count  |  See Page 2 for full hydraulic plots');

  // ==================== PAGE 2: FULL-DETAIL PLOTS & SCHEMATIC ====================
  doc.addPage();
  drawPageHeader('Hydraulic Pressure Profile, Orifice Cross-Section & Parametric Curve', 'Page 2 of 2');

  let py = 27;

  // PLOT 1: Full-Detail Axial Pressure Profile & Pipe Cross-Section Schematic
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Axial Pressure Profile & Flow Cross-Section', margin, py);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `D = ${fmtNum(toDisplay(results.pipeIdMm, 'diameter', unitSystem), 1)} ${labels.diameter}  |  d = ${fmtNum(toDisplay(results.orificeDiaMm, 'diameter', unitSystem), 2)} ${labels.diameter}  |  beta = ${results.beta.toFixed(3)}`,
    pageW - margin,
    py,
    { align: 'right' }
  );
  py += 3;

  const pBoxH = 122;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, py, contentW, pBoxH, 'FD');

  // Pressure profile plot area inside top half of box
  const pL = margin + 20;
  const pR = margin + contentW - 10;
  const pW = pR - pL;
  const pT = py + 8;
  const pB = py + 68;
  const pH = pB - pT;

  const pMinRaw = Math.min(results.pVcBarA, results.p2BarA, results.pCritOrPvBarA, results.p1BarA * 0.2);
  const pMaxRaw = results.p1BarA * 1.08;
  const pSpan = Math.max(pMaxRaw - pMinRaw, 0.2);
  const pMinAxis = Math.max(0, pMinRaw - pSpan * 0.12);
  const pMaxAxis = pMaxRaw + pSpan * 0.05;
  const mapY = (pBar: number) =>
    pB - ((pBar - pMinAxis) / Math.max(pMaxAxis - pMinAxis, 1e-6)) * pH;

  // Y-axis rotated label
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Pressure (${labels.pressureAbs})`, margin + 5.5, (pT + pB) / 2, {
    angle: 90,
    align: 'center',
  });

  // Grid lines & ticks
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 3; i++) {
    const frac = i / 3;
    const gy = pB - frac * pH;
    const val = pMinAxis + frac * (pMaxAxis - pMinAxis);
    doc.line(pL, gy, pR, gy);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(fmtNum(toDisplay(val, 'pressureAbs', unitSystem), 1), pL - 2, gy + 1, { align: 'right' });
  }

  const plateU = 0.25;
  const vcU = 0.34;
  const plateX = pL + plateU * pW;
  const vcX = pL + vcU * pW;

  // Vertical dashed station lines extending into pipe schematic
  const pipeTop = py + 79;
  const pipeBot = py + 111;
  const pipeMid = (pipeTop + pipeBot) / 2;
  const pipeHalfH = (pipeBot - pipeTop) / 2;
  const betaClamp = Math.min(Math.max(results.beta || 0.5, 0.12), 0.9);
  const boreHalfH = pipeHalfH * betaClamp;
  const vcHalfH = boreHalfH * Math.sqrt(Math.max(results.cd || 0.61, 0.58));

  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(plateX, pT, plateX, pipeTop);
  doc.line(vcX, pT, vcX, pipeMid);
  doc.setLineDashPattern([], 0);

  // Threshold Pv / P* line
  const threshY = mapY(results.pCritOrPvBarA);
  const thresholdBreached =
    inputs.phase === 'liquid'
      ? results.pVcBarA <= results.pCritOrPvBarA || results.regimeSeverity !== 'nominal'
      : results.isChoked || results.machOrifice >= 0.8;

  if (threshY >= pT - 2 && threshY <= pB + 2) {
    doc.setDrawColor(thresholdBreached ? 225 : 217, thresholdBreached ? 29 : 119, thresholdBreached ? 72 : 6);
    doc.setLineWidth(0.35);
    doc.setLineDashPattern([2.2, 1.5], 0);
    doc.line(pL, threshY, pR, threshY);
    doc.setLineDashPattern([], 0);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(thresholdBreached ? 225 : 217, thresholdBreached ? 29 : 119, thresholdBreached ? 72 : 6);
    doc.text(
      `${inputs.phase === 'liquid' ? 'Pv Vapor Limit' : 'P* Sonic Critical'} (${fmtNum(
        toDisplay(results.pCritOrPvBarA, 'pressureAbs', unitSystem),
        2
      )} ${labels.pressureAbs})`,
      pR - 1,
      threshY - 1.5,
      { align: 'right' }
    );
  }

  // Pressure profile curve
  const evalP = (u: number): number => {
    const p1 = results.p1BarA;
    const pvc = results.pVcBarA;
    const p2 = results.p2BarA;
    if (u <= 0.16) return p1;
    if (u < plateU) {
      const t = (u - 0.16) / (plateU - 0.16);
      return p1 + 0.015 * (p1 - pvc) * Math.sin(t * Math.PI * 0.5) - 0.35 * (p1 - pvc) * Math.pow(t, 4);
    }
    if (u <= vcU) {
      const t = (u - plateU) / (vcU - plateU);
      const pAtPlate = p1 - 0.335 * (p1 - pvc);
      return pAtPlate - (pAtPlate - pvc) * Math.sin(t * Math.PI * 0.5);
    }
    const t = Math.min((u - vcU) / (0.88 - vcU), 1);
    return pvc + (p2 - pvc) * (1 - Math.pow(1 - t, 2.4));
  };

  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.75);
  let prevX = pL;
  let prevY = mapY(evalP(0));
  for (let i = 1; i <= 100; i++) {
    const u = i / 100;
    const nx = pL + u * pW;
    const ny = mapY(evalP(u));
    doc.line(prevX, prevY, nx, ny);
    prevX = nx;
    prevY = ny;
  }
  doc.setLineWidth(0.2);

  // Key pressure markers + annotations (P1, P_vc, P2)
  const p1Y = mapY(results.p1BarA);
  const pvcY = mapY(results.pVcBarA);
  const p2Y = mapY(results.p2BarA);

  doc.setFillColor(2, 132, 199);
  doc.circle(pL + 5, p1Y, 1.1, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  doc.text(`P1 ${fmtNum(toDisplay(results.p1BarA, 'pressureAbs', unitSystem), 2)}`, pL + 7.5, p1Y - 1.8);

  if (thresholdBreached) {
    doc.setFillColor(225, 29, 72);
  } else {
    doc.setFillColor(2, 132, 199);
  }
  doc.circle(vcX, pvcY, 1.2, 'F');
  doc.setTextColor(thresholdBreached ? 225 : 51, thresholdBreached ? 29 : 65, thresholdBreached ? 72 : 85);
  doc.text(
    `P_vc ${fmtNum(toDisplay(results.pVcBarA, 'pressureAbs', unitSystem), 2)}`,
    vcX + 2.5,
    Math.min(pvcY + 3.5, pB - 2)
  );

  doc.setFillColor(2, 132, 199);
  doc.circle(pR - 5, p2Y, 1.1, 'F');
  doc.setTextColor(51, 65, 85);
  doc.text(`P2 ${fmtNum(toDisplay(results.p2BarA, 'pressureAbs', unitSystem), 2)}`, pR - 7.5, p2Y - 2, {
    align: 'right',
  });

  // ΔP_perm dimension bracket on right
  if (Math.abs(p2Y - p1Y) > 4) {
    const bX = pR - 2;
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.25);
    doc.line(bX, p1Y, bX, p2Y);
    doc.line(bX - 1.5, p1Y, bX + 1.5, p1Y);
    doc.line(bX - 1.5, p2Y, bX + 1.5, p2Y);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `dP_perm = ${fmtNum(toDisplay(results.permPressureDropBar, 'pressureDiff', unitSystem), 2)} ${labels.pressureDiff}`,
      bX - 2.5,
      (p1Y + p2Y) / 2 + 1,
      { align: 'right' }
    );
  }

  // Pipe & Orifice Cross-Section Schematic (bottom half of Plot 1 box)
  // Pipe wall bands
  doc.setFillColor(226, 232, 240);
  doc.setDrawColor(148, 163, 184);
  doc.rect(pL, pipeTop - 3, pW, 3, 'FD');
  doc.rect(pL, pipeBot, pW, 3, 'FD');

  // Pipe interior
  doc.setFillColor(248, 250, 252);
  doc.rect(pL, pipeTop, pW, pipeBot - pipeTop, 'F');

  // Wake recirculation eddy zones behind orifice plate
  doc.setFillColor(226, 232, 240);
  doc.triangle(
    plateX + 1.5,
    pipeTop + 0.3,
    vcX + 6,
    pipeTop + 0.3,
    plateX + 1.5,
    pipeMid - boreHalfH,
    'F'
  );
  doc.triangle(
    plateX + 1.5,
    pipeBot - 0.3,
    vcX + 6,
    pipeBot - 0.3,
    plateX + 1.5,
    pipeMid + boreHalfH,
    'F'
  );

  // Streamlines through orifice & vena contracta
  const streamFracs = [-0.72, -0.4, 0, 0.4, 0.72];
  streamFracs.forEach((frac) => {
    const yPipe = pipeMid + frac * pipeHalfH;
    const yVc = pipeMid + frac * vcHalfH * 0.92;
    const xConv = pL + 0.12 * pW;
    const xEndRec = pL + 0.78 * pW;
    doc.setDrawColor(frac === 0 ? 2 : 56, frac === 0 ? 132 : 189, frac === 0 ? 199 : 248);
    doc.setLineWidth(frac === 0 ? 0.45 : 0.25);
    if (frac === 0) doc.setLineDashPattern([2, 1.5], 0);
    // Approximate cubic curve with smooth polyline segments
    const pts: Array<[number, number]> = [[pL, yPipe], [xConv, yPipe]];
    for (let s = 1; s <= 12; s++) {
      const t = s / 12;
      const sx = xConv + t * (vcX - xConv);
      const sy = yPipe + (yVc - yPipe) * (0.5 - 0.5 * Math.cos(Math.PI * t));
      pts.push([sx, sy]);
    }
    for (let s = 1; s <= 16; s++) {
      const t = s / 16;
      const sx = vcX + t * (xEndRec - vcX);
      const sy = yVc + (yPipe - yVc) * (0.5 - 0.5 * Math.cos(Math.PI * t));
      pts.push([sx, sy]);
    }
    pts.push([pR, yPipe]);
    for (let i = 1; i < pts.length; i++) {
      doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    }
    if (frac === 0) doc.setLineDashPattern([], 0);
  });

  // Flow direction arrows
  doc.setFillColor(2, 132, 199);
  doc.triangle(pL + 11, pipeMid, pL + 7.5, pipeMid - 1.3, pL + 7.5, pipeMid + 1.3, 'F');
  doc.triangle(pR - 7, pipeMid, pR - 10.5, pipeMid - 1.3, pR - 10.5, pipeMid + 1.3, 'F');

  // Orifice plate upper & lower blades
  doc.setFillColor(51, 65, 85);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.25);
  doc.rect(plateX - 1.3, pipeTop - 3, 2.6, pipeMid - boreHalfH - (pipeTop - 3), 'FD');
  doc.rect(plateX - 1.3, pipeMid + boreHalfH, 2.6, pipeBot + 3 - (pipeMid + boreHalfH), 'FD');

  // Station labels along bottom of schematic
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('-2D Upstream', pL, pipeBot + 7.5);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Orifice (0D)', plateX, pipeBot + 7.5, { align: 'center' });
  doc.setFont('courier', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Vena Contracta', vcX, pipeBot + 7.5, { align: 'center' });
  doc.text('+6D Recovery', pR, pipeBot + 7.5, { align: 'right' });

  py += pBoxH + 8;

  // PLOT 2: Full-Detail Parametric Performance Curve
  const isDiaSweep = inputs.solveTarget === 'diameter';
  const y1Title = isDiaSweep
    ? `Orifice Bore (${labels.diameter})`
    : `Mass Flow (${labels.massFlow})`;
  const y2Title = inputs.phase === 'liquid' ? 'Cavitation Index sigma' : 'Orifice Mach M_o';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    isDiaSweep ? 'Required Orifice Diameter vs. Non-Recoverable dP_perm' : 'Capacity Curve: Mass Flowrate vs. Non-Recoverable dP_perm',
    margin,
    py
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`-- ${isDiaSweep ? 'Bore d' : 'Mass Flow'}`, pageW - margin - 34, py, { align: 'right' });
  doc.setTextColor(217, 119, 6);
  doc.text(`- - ${inputs.phase === 'liquid' ? 'Cavitation sigma' : 'Mach M_o'}`, pageW - margin, py, {
    align: 'right',
  });
  py += 3;

  const cBoxH = 104;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, py, contentW, cBoxH, 'FD');

  const pts = results.sweepCurve;
  if (pts.length > 0) {
    const cL = margin + 20;
    const cR = margin + contentW - 18;
    const cW = cR - cL;
    const cT = py + 8;
    const cB = py + cBoxH - 14;
    const cH = cB - cT;

    const xVals = pts.map((p) => toDisplay(p.dpPermBar, 'pressureDiff', unitSystem));
    const y1Vals = pts.map((p) =>
      isDiaSweep
        ? toDisplay(p.orificeDiaMm, 'diameter', unitSystem)
        : toDisplay(p.massFlowKgH, 'massFlow', unitSystem)
    );
    const y2Vals = pts.map((p) => Math.min(p.machOrSigma, inputs.phase === 'liquid' ? 12 : 1.1));

    const xMax = Math.max(...xVals, 1e-6);
    const y1Min = Math.min(...y1Vals) * 0.9;
    const y1Max = Math.max(...y1Vals, 1e-6) * 1.08;
    const y2Max = inputs.phase === 'liquid' ? Math.max(Math.min(Math.max(...y2Vals), 12), 4) : 1.15;

    const xFor = (xD: number) => cL + (xD / xMax) * cW;
    const y1For = (yD: number) => cB - ((yD - y1Min) / Math.max(y1Max - y1Min, 1e-6)) * cH;
    const y2For = (yV: number) => cB - (Math.min(yV, y2Max) / Math.max(y2Max, 1e-6)) * cH;

    // Shaded critical/cavitation zone
    const critIdx = pts.findIndex((p) => p.isChokedOrCavitating);
    if (critIdx >= 0) {
      const critX = xFor(xVals[critIdx]);
      if (critX < cR) {
        doc.setFillColor(255, 241, 242);
        doc.rect(critX, cT, cR - critX, cH, 'F');
        doc.setDrawColor(225, 29, 72);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.line(critX, cT, critX, cB);
        doc.setLineDashPattern([], 0);
        doc.setFont('courier', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(225, 29, 72);
        doc.text(
          inputs.phase === 'liquid' ? 'Cavitation Risk Zone' : 'Near-Sonic / Choked',
          Math.min(critX + 2, cR - 28),
          cT + 4.5
        );
      }
    }

    // Gridlines + Dual Y Ticks
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    for (let i = 0; i <= 4; i++) {
      const f = i / 4;
      const gy = cB - f * cH;
      const v1 = y1Min + f * (y1Max - y1Min);
      const v2 = f * y2Max;
      doc.line(cL, gy, cR, gy);

      doc.setFont('courier', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(fmtNum(v1, isDiaSweep ? 1 : 0), cL - 2, gy + 1, { align: 'right' });

      doc.setTextColor(217, 119, 6);
      doc.text(v2.toFixed(1), cR + 2, gy + 1, { align: 'left' });

      const xv = f * xMax;
      const xp = cL + f * cW;
      doc.setTextColor(71, 85, 105);
      doc.text(fmtNum(xv, 1), xp, cB + 4.5, { align: 'center' });
    }

    // Axis titles
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(y1Title, margin + 5.5, (cT + cB) / 2, { angle: 90, align: 'center' });
    doc.setTextColor(217, 119, 6);
    doc.text(y2Title, margin + contentW - 4.5, (cT + cB) / 2, { angle: -90, align: 'center' });
    doc.setTextColor(71, 85, 105);
    doc.text(`Non-Recoverable Pressure Drop dP_perm (${labels.pressureDiff})`, (cL + cR) / 2, cB + 10, {
      align: 'center',
    });

    // Secondary curve (amber dashed)
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.45);
    doc.setLineDashPattern([2, 1.5], 0);
    for (let i = 1; i < pts.length; i++) {
      doc.line(xFor(xVals[i - 1]), y2For(y2Vals[i - 1]), xFor(xVals[i]), y2For(y2Vals[i]));
    }
    doc.setLineDashPattern([], 0);

    // Primary curve (sky solid)
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.75);
    for (let i = 1; i < pts.length; i++) {
      doc.line(xFor(xVals[i - 1]), y1For(y1Vals[i - 1]), xFor(xVals[i]), y1For(y1Vals[i]));
    }
    doc.setLineWidth(0.2);

    // Operating point marker
    const opX = xFor(toDisplay(results.permPressureDropBar, 'pressureDiff', unitSystem));
    const opY = y1For(
      isDiaSweep
        ? toDisplay(results.orificeDiaMm, 'diameter', unitSystem)
        : toDisplay(results.massFlowKgH, 'massFlow', unitSystem)
    );
    if (opX >= cL && opX <= cR && opY >= cT - 2 && opY <= cB + 2) {
      doc.setDrawColor(2, 132, 199);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(opX, cT, opX, cB);
      doc.setLineDashPattern([], 0);
      doc.setFillColor(2, 132, 199);
      doc.circle(opX, opY, 1.4, 'F');
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(3, 105, 161);
      const onRight = opX > cL + cW * 0.72;
      doc.text('Operating Point', onRight ? opX - 2.5 : opX + 2.5, opY - 2, {
        align: onRight ? 'right' : 'left',
      });
    }
  }

  drawPageFooter('Axial pressure profile, orifice schematic & parametric performance sweep');

  doc.save(`restriction-orifice-sizing-${inputs.phase}.pdf`);
}
