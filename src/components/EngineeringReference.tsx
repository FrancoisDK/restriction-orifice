import React from 'react';

export const EngineeringReference: React.FC = () => {
  return (
    <section
      id="reference"
      className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
      aria-labelledby="reference-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
        <h2 id="reference-heading" className="text-base font-semibold text-slate-900">
          Governing Hydraulic &amp; Thermodynamic Methodology
        </h2>
        <span className="text-xs text-slate-500">
          ISO 5167-2 · ISA-RP75.23 · Crane TP-410
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs leading-relaxed text-slate-600">
        <div className="space-y-1.5">
          <h3 className="font-semibold text-slate-800">01. Mass Flow &amp; Discharge Coefficient</h3>
          <p>
            Orifice bore flow is solved iteratively using the ISO 5167-2 Reader-Harris/Gallagher equation for{' '}
            <span className="font-mono text-slate-800">Cd(β, Re_D)</span> with optional thick-plate reattachment
            correction for <span className="font-mono text-slate-800">t/d &gt; 0.02</span>.
          </p>
          <div className="font-mono text-[11px] bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700">
            ṁ = Cd · ε · [Ao / √(1 − β⁴)] · √(2·ρ₁·ΔP_vc)
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-slate-800">02. Non-Recoverable Pressure Drop</h3>
          <p>
            Static pressure reaches a minimum at the vena contracta (<span className="font-mono text-slate-800">P_vc</span>)
            before partial turbulent recovery to <span className="font-mono text-slate-800">P₂</span>. Both{' '}
            <span className="font-mono text-slate-800">ΔP_perm</span> and <span className="font-mono text-slate-800">ΔP_vc</span> are tracked explicitly.
          </p>
          <div className="font-mono text-[11px] bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700">
            ΔP_perm / ΔP_vc = [√(1−β⁴(1−Cd²)) − Cd·β²] / [√(1−β⁴(1−Cd²)) + Cd·β²]
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-slate-800">03. Liquid Cavitation &amp; Flashing</h3>
          <p>
            Cavitation severity is evaluated via recovery factor <span className="font-mono text-slate-800">FL = √(ΔP_perm/ΔP_vc)</span>,
            critical factor <span className="font-mono text-slate-800">FF</span>, and index{' '}
            <span className="font-mono text-slate-800">σ = (P₁ − Pv) / ΔP_perm</span>.
          </p>
          <div className="font-mono text-[11px] bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700">
            ΔP_choked = FL² · (P₁ − FF · Pv)
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-slate-800">04. Gas Compressibility &amp; Sonic Limit</h3>
          <p>
            Gas expansion uses ISO 5167-2 <span className="font-mono text-slate-800">ε</span> up to the isentropic
            critical ratio <span className="font-mono text-slate-800">rc = (2/(k+1))^(k/(k−1))</span>, where throat velocity reaches Mach 1.0.
          </p>
          <div className="font-mono text-[11px] bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700">
            a₁ = √(k·Z₁·R·T₁ / MW) , a* = a₁·√(2/(k+1))
          </div>
        </div>
      </div>
    </section>
  );
};
