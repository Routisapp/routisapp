"use client";

import { useState } from "react";

const PRESETS = [0.1, 0.5, 1.0];

interface Props {
  value:    number;
  onChange: (v: number) => void;
}

export function SlippageSettings({ value, onChange }: Props) {
  const [open,   setOpen]   = useState(false);
  const [custom, setCustom] = useState("");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-[--border] bg-[--bg-input] px-3 py-1.5 text-xs font-semibold text-[--text-secondary] hover:text-[--text-primary] transition-colors"
      >
        <span className="text-[--text-secondary]">⊙</span> Slippage: {value}%
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-[--border] bg-[--bg-card] p-3 shadow-xl">
          <p className="mb-2 text-xs font-bold text-[--text-secondary] uppercase tracking-wide">
            Slippage Tolerance
          </p>
          <div className="flex gap-2 mb-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => { onChange(p); setCustom(""); }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  value === p
                    ? "bg-[--accent-blue] text-white"
                    : "bg-[--bg-input] text-[--text-secondary] hover:text-white"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Custom %"
              value={custom}
              min={0.01}
              max={50}
              step={0.1}
              onChange={(e) => {
                setCustom(e.target.value);
                const n = parseFloat(e.target.value);
                if (!isNaN(n) && n > 0 && n <= 50) onChange(n);
              }}
              className="flex-1 rounded-lg bg-[--bg-input] px-2 py-1.5 text-xs text-[--text-primary] outline-none placeholder:text-[--text-secondary] border border-[--border] focus:border-[--accent-blue]"
            />
            <span className="text-xs text-[--text-secondary]">%</span>
          </div>
          {value > 5 && (
            <p className="mt-2 text-xs text-[--accent-orange]">
              ⚠ High slippage — you may receive much less
            </p>
          )}
        </div>
      )}
    </div>
  );
}
