"use client";

import type { SwapPreview } from "@/types/agent";

interface Props {
  preview: SwapPreview;
}

export function SwapSummaryCard({ preview }: Props) {
  const rows = [
    { label: "You're sending", value: `${preview.amountIn} ${preview.fromToken}` },
    { label: "You'll receive", value: `≈${preview.amountOut} ${preview.toToken}`, accent: true },
    { label: "Best route",     value: preview.bestDex },
    { label: "Fee",            value: preview.fee },
    { label: "Price impact",   value: preview.priceImpact },
    { label: "Slippage",       value: preview.slippage },
  ];

  return (
    <div
      className="mt-2 rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b border-[--border]"
        style={{ background: "var(--bg-input)" }}
      >
        <span style={{ color: "#22c55e", fontSize: 14 }}>✓</span>
        <span className="font-bold text-sm text-[--text-primary]">Swap Ready</span>
      </div>

      {/* Rows */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-[--text-secondary]">{row.label}</span>
            <span
              className="text-xs font-semibold"
              style={{ color: row.accent ? "#C9693A" : "var(--text-primary)" }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="px-4 pb-3">
        <p className="text-[11px] text-[--text-secondary]">
          Best quote across {preview.allRoutes?.length ?? 1} route{(preview.allRoutes?.length ?? 1) > 1 ? "s" : ""}. Confirm below to execute.
        </p>
      </div>
    </div>
  );
}
