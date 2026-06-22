"use client";

import { Skeleton } from "@/components/ui/LoadingSpinner";
import type { SwapQuote } from "@/types/swap";
import { DEX_BY_ID }     from "@/constants/dex-registry";

// ── DexIcon: all visual metadata comes from the registry ─────────────────────
function DexIcon({ dex, name }: { dex: string; name: string }) {
  const cfg    = DEX_BY_ID[dex as keyof typeof DEX_BY_ID];
  const color  = cfg?.color   ?? "#8b8fa8";
  const abbr   = cfg?.abbr    ?? name.slice(0, 2).toUpperCase();
  const logoUrl = cfg?.logoUrl ?? "";

  if (!logoUrl) {
    return (
      <span
        style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: `${color}22`, color, fontSize: 7, fontWeight: 800,
          userSelect: "none",
        }}
      >
        {abbr.slice(0, 3)}
      </span>
    );
  }

  return (
    <span style={{ position: "relative", width: 20, height: 20, flexShrink: 0, display: "inline-block" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={name}
        width={20}
        height={20}
        style={{ borderRadius: "50%", objectFit: "contain", display: "block" }}
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          const parent = el.parentElement!;
          el.remove();
          parent.style.background     = `${color}22`;
          parent.style.borderRadius   = "50%";
          parent.style.display        = "flex";
          parent.style.alignItems     = "center";
          parent.style.justifyContent = "center";
          parent.style.fontSize       = "7px";
          parent.style.fontWeight     = "800";
          parent.style.color          = color;
          parent.style.userSelect     = "none";
          parent.textContent          = abbr.slice(0, 3);
        }}
      />
    </span>
  );
}

interface Props {
  quotes:    SwapQuote[];
  isLoading: boolean;
  selected:  string | null;
  onSelect:  (dex: string) => void;
}

export function QuoteList({ quotes, isLoading, selected, onSelect }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }
  if (!quotes.length) return null;

  const bestAmount = parseFloat(quotes[0]?.amountOutFormatted ?? "0");

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary] mb-1">
        Available Routes
      </p>
      {quotes.map((q, i) => {
        const isBest     = i === 0;
        const isSelected = selected === q.dex;
        const amount     = parseFloat(q.amountOutFormatted);
        const isPoor     = !isBest && bestAmount > 0 && (amount / bestAmount) < 0.70;

        return (
          <button
            key={q.dex}
            onClick={() => onSelect(q.dex)}
            className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
              isPoor ? "opacity-50" : ""
            } ${
              isSelected
                ? "border-[#C9693A] bg-[#C9693A]/12 shadow-sm"
                : "border-[--border] bg-[--bg-input] hover:border-[#C9693A]/40 hover:bg-[#C9693A]/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <DexIcon dex={q.dex} name={q.dexName} />

                <span className="text-sm font-bold text-[--text-primary] truncate">{q.dexName}</span>

                {isBest && (
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: "#C9693A" }}
                  >
                    BEST
                  </span>
                )}
                {isPoor && <span className="text-[11px]">⚠️</span>}
              </div>

              <div className="text-right ml-2 shrink-0">
                <div className="text-sm font-bold text-[--text-primary]">
                  {q.amountOutFormatted}
                </div>
                <div className="text-[10px] text-[--text-secondary]">
                  Fee: {(q.fee / 10000).toFixed(2)}%
                  {q.priceImpact > 0 && ` · Impact: ${q.priceImpact.toFixed(2)}%`}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
