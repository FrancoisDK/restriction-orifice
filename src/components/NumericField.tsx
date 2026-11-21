import React, { useState, useEffect } from 'react';
import { UnitSystem, toDisplay, fromDisplay } from '../utils/units';

type UnitKind =
  | 'pressureAbs'
  | 'pressureDiff'
  | 'diameter'
  | 'temperature'
  | 'density'
  | 'viscosity'
  | 'massFlow'
  | 'volFlowLiquid'
  | 'volFlowGas'
  | 'velocity';

interface NumericFieldProps {
  id: string;
  label: string;
  valueSi: number;
  unitKind?: UnitKind;
  unitLabel: string;
  unitSystem: UnitSystem;
  onChangeSi: (nextSi: number) => void;
  decimals?: number;
  min?: number;
  step?: string;
  disabled?: boolean;
  readOnlySolved?: boolean;
  helperText?: string;
}

export const NumericField: React.FC<NumericFieldProps> = ({
  id,
  label,
  valueSi,
  unitKind,
  unitLabel,
  unitSystem,
  onChangeSi,
  decimals = 2,
  min,
  step = 'any',
  disabled = false,
  readOnlySolved = false,
  helperText,
}) => {
  const displayVal = unitKind ? toDisplay(valueSi, unitKind, unitSystem) : valueSi;

  const formatForInput = (v: number) => {
    if (!Number.isFinite(v)) return '';
    // Keep crisp significant precision without trailing noise
    const factor = Math.pow(10, decimals);
    const rounded = Math.round(v * factor) / factor;
    return String(rounded);
  };

  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState<string>(() => formatForInput(displayVal));

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatForInput(displayVal));
    }
  }, [displayVal, isFocused, unitSystem]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      if (min !== undefined && parsed < min) return;
      const nextSi = unitKind ? fromDisplay(parsed, unitKind, unitSystem) : parsed;
      onChangeSi(nextSi);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setDraft(formatForInput(displayVal));
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-slate-700 truncate">
          {label}
        </label>
        {readOnlySolved && (
          <span className="text-[11px] font-medium text-sky-700 whitespace-nowrap">
            Solved Output
          </span>
        )}
      </div>
      <div
        className={`flex items-center rounded-md border transition-colors ${
          readOnlySolved
            ? 'bg-sky-50/60 border-sky-200'
            : disabled
            ? 'bg-slate-100 border-slate-200'
            : 'bg-white border-slate-200 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/20'
        }`}
      >
        <input
          id={id}
          type="number"
          step={step}
          value={readOnlySolved ? formatForInput(displayVal) : draft}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          disabled={disabled || readOnlySolved}
          className={`w-full bg-transparent px-3 py-2 text-sm font-mono tabular-nums text-right focus:outline-none ${
            readOnlySolved ? 'text-sky-900 font-semibold' : 'text-slate-900'
          } disabled:cursor-not-allowed`}
        />
        {unitLabel && (
          <span className="pr-3 pl-1 text-xs font-mono text-slate-400 whitespace-nowrap select-none shrink-0">
            {unitLabel}
          </span>
        )}
      </div>
      {helperText && <p className="text-[11px] text-slate-500 leading-snug">{helperText}</p>}
    </div>
  );
};
