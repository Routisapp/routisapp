"use client";

import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import type { SwapPreview } from "@/types/agent";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { BASE_TOKENS, NATIVE_ETH } from "@/constants/tokens";

interface Props {
  preview:   SwapPreview;
  onConfirm: () => void;
  onCancel:  () => void;
  isPending: boolean;
}

export function SwapPreviewCard({ preview, onConfirm, onCancel, isPending }: Props) {
  const impact = parseFloat(preview.priceImpact);
  const highImpact = impact > 3;

  const { address } = useAccount();

  const tokenIn = BASE_TOKENS.find(
    (t) => t.symbol.toUpperCase() === preview.fromToken.toUpperCase()
  );
  const tokenAddress = tokenIn?.address ?? NATIVE_ETH;
  const { balance, decimals } = useTokenBalance(address, tokenAddress);

  let insufficient = false;
  try {
    const required = parseUnits(preview.amountIn, tokenIn?.decimals ?? decimals);
    insufficient = balance < required;
  } catch {
    insufficient = false;
  }

  return (
    <div
      className="mt-3 rounded-2xl overflow-hidden"
      style={{ border: "1.5px solid #C9693A66", background: "var(--bg-card)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: "#C9693A33", background: "#C9693A11" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "#C9693A", fontSize: 16 }}>⇄</span>
          <span className="font-bold text-sm" style={{ color: "#C9693A" }}>Swap Preview</span>
        </div>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="text-[--text-secondary] hover:text-[--text-primary] transition-colors text-base leading-none disabled:opacity-40"
        >
          ×
        </button>
      </div>

      {/* You pay → You receive */}
      <div className="flex items-center px-4 py-4 gap-2">
        <div
          className="flex-1 rounded-xl px-4 py-3"
          style={{ background: "var(--bg-input)", border: `1px solid ${insufficient ? "#ef444466" : "var(--border)"}` }}
        >
          <div className="text-[11px] mb-1 text-[--text-secondary] font-semibold">You pay</div>
          <div className="text-lg font-black text-[--text-primary]">
            {preview.amountIn} {preview.fromToken}
          </div>
          {insufficient && (
            <div className="text-[10px] mt-0.5 font-semibold" style={{ color: "#ef4444" }}>
              Insufficient balance
            </div>
          )}
        </div>

        <div className="shrink-0 text-[--text-secondary] text-xl px-1">→</div>

        <div
          className="flex-1 rounded-xl px-4 py-3"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
        >
          <div className="text-[11px] mb-1 text-[--text-secondary] font-semibold">You receive</div>
          <div className="text-lg font-black" style={{ color: "#C9693A" }}>
            ≈{preview.amountOut} {preview.toToken}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 pb-3 flex flex-col gap-1.5">
        <Row label="Best route"   value={preview.bestDex} />
        <Row label="Fee"          value={preview.fee} />
        <Row label="Slippage"     value={preview.slippage} />
        <Row
          label="Price impact"
          value={preview.priceImpact}
          valueColor={highImpact ? "#ef4444" : "var(--text-primary)"}
        />
        {highImpact && (
          <p className="text-xs mt-0.5" style={{ color: "#ef4444" }}>
            ⚠️ High price impact — consider a smaller amount
          </p>
        )}
        <Row label="AI Agent fee" value="0.2 USDC" valueColor="var(--text-secondary)" />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-[--border] bg-[--bg-input] text-[--text-primary] hover:brightness-95 transition-all disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isPending || insufficient}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: insufficient ? "#9ca3af" : "#C9693A" }}
        >
          {isPending ? "Swapping…" : insufficient ? "Insufficient balance" : "Confirm Swap"}
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueColor,
}: {
  label:       string;
  value:       string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[--text-secondary]">{label}</span>
      <span className="text-xs font-semibold" style={{ color: valueColor ?? "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}
