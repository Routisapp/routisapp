"use client";

import { useState, useEffect } from "react";
import { useWalletClient, usePublicClient, useAccount } from "wagmi";
import { toast } from "sonner";
import type { SybilResult } from "@/lib/sybilScore";
import { hasSybilPaid, markSybilPaid } from "@/lib/supabase";
import { x402Fetch } from "@/lib/x402Client";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAYMENT_ETH_LABEL = "1 USDC via x402";
const LS_KEY            = "sybil_paid_wallets";

// ── LocalStorage helpers (fast, client-only) ──────────────────────────────────

function getPaidWallets(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

function markLocalPaid(address: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getPaidWallets();
    set.add(address.toLowerCase());
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(set)));
  } catch { /* ignore */ }
}

function hasLocalPaid(address: string | undefined): boolean {
  if (!address) return false;
  return getPaidWallets().has(address.toLowerCase());
}

// ── Risk colour palette ───────────────────────────────────────────────────────
const RISK_PALETTE = {
  low:    { color: "#22c55e", bg: "#22c55e18", label: "LOW RISK",    emoji: "✅" },
  medium: { color: "#f59e0b", bg: "#f59e0b18", label: "MEDIUM RISK", emoji: "⚠️" },
  high:   { color: "#ef4444", bg: "#ef444418", label: "HIGH RISK",   emoji: "🚨" },
};

type PayState = "locked" | "paying" | "revealed";

interface Props {
  /** Pre-computed sybil result — only shown after payment */
  result:    SybilResult | null;
  isLoading: boolean;
  /** The wallet address currently being analyzed */
  analyzed?: string;
}

export function SybilScoreCard({ result, isLoading, analyzed }: Props) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Fast local check first
  function checkLocalPaid(): boolean {
    return hasLocalPaid(address) || hasLocalPaid(analyzed);
  }

  const [payState, setPayState] = useState<PayState>(() =>
    checkLocalPaid() ? "revealed" : "locked"
  );

  // On mount and address change: check Supabase for persistent payment record
  useEffect(() => {
    if (payState === "paying") return;

    // Fast path: localStorage hit
    if (checkLocalPaid()) {
      setPayState("revealed");
      return;
    }

    // Slow path: Supabase check (covers new device / cleared localStorage)
    const addrs = [address, analyzed].filter(Boolean) as string[];
    if (addrs.length === 0) return;

    Promise.any(addrs.map((a) => hasSybilPaid(a).then((paid) => { if (!paid) throw new Error(); return a; })))
      .then((paidAddr) => {
        markLocalPaid(paidAddr); // cache locally so next load is instant
        setPayState("revealed");
      })
      .catch(() => setPayState("locked"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, analyzed]);

  async function handlePay() {
    if (!address) { toast.error("Connect your wallet first"); return; }
    if (!walletClient || !publicClient) { toast.error("Wallet not ready — try again"); return; }

    try {
      setPayState("paying");
      toast.loading("Processing payment…", { id: "sybil-pay" });

      // x402 USDC payment via /api/sybil-fee
      const feeRes = await x402Fetch(
        "/api/sybil-fee",
        {
          method:  "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body:    "{}",
        },
        walletClient,
        publicClient,
      );

      if (!feeRes.ok) {
        const rawText = await feeRes.text().catch(() => "");
        let errMsg = "Payment failed";
        try { errMsg = JSON.parse(rawText)?.error ?? rawText ?? errMsg; } catch { errMsg = rawText || errMsg; }
        throw new Error(errMsg);
      }

      toast.success("Payment confirmed — revealing Sybil Score!", { id: "sybil-pay" });

      // Save to both localStorage and Supabase
      if (address)  { markLocalPaid(address);  await markSybilPaid(address); }
      if (analyzed) { markLocalPaid(analyzed); await markSybilPaid(analyzed); }

      setPayState("revealed");
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : "").toLowerCase();
      toast.error(
        msg.includes("user rejected") ? "Transaction rejected" : "Payment failed — try again",
        { id: "sybil-pay" },
      );
      setPayState("locked");
    }
  }

  // ── Locked state ─────────────────────────────────────────────────────────────
  if (payState === "locked") {
    return (
      <div className="rounded-xl border border-[--border] bg-[--bg-card] px-4 py-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[--text-secondary]">
            Sybil Score
          </span>
        </div>

        {/* Blurred placeholder score */}
        <div className="flex items-end gap-2">
          <span
            className="text-[28px] font-black leading-none select-none"
            style={{
              filter: "blur(6px)",
              color: "var(--text-primary)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            ??
          </span>
          <span className="text-sm font-normal text-[--text-secondary] mb-0.5">/ 100</span>
        </div>

        {/* Blurred bar */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 5, background: "var(--bg-input)", filter: "blur(2px)" }}
        >
          <div style={{ height: "100%", width: "60%", background: "var(--border)", borderRadius: 999 }} />
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2 mt-1">
          {address ? (
            <button
              onClick={handlePay}
              className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all hover:brightness-110"
              style={{ background: "linear-gradient(90deg,#C9693A,#B55A2E)" }}
            >
              Mint Sybil Score — {PAYMENT_ETH_LABEL}
            </button>
          ) : (
            <div
              className="w-full rounded-xl py-2.5 text-sm font-bold text-center"
              style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
            >
              Connect wallet to reveal
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Paying / confirming state ─────────────────────────────────────────────────
  if (payState === "paying") {
    return (
      <div className="rounded-xl border border-[--border] bg-[--bg-card] px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[--text-secondary]">
            Sybil Score
          </span>
        </div>
        <div className="flex items-center gap-3 py-2">
          {/* Spinner */}
          <svg className="animate-spin shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#C9693A" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-[--text-secondary]">Confirming payment…</span>
        </div>
        {/* Animated placeholder bar */}
        <div
          className="w-full rounded-full overflow-hidden animate-pulse"
          style={{ height: 5, background: "var(--bg-input)" }}
        >
          <div style={{ height: "100%", width: "40%", background: "var(--border)", borderRadius: 999 }} />
        </div>
      </div>
    );
  }

  // ── Revealed state ────────────────────────────────────────────────────────────
  const palette = result ? RISK_PALETTE[result.riskLevel] : RISK_PALETTE.low;

  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-card] px-4 py-3 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[--text-secondary]">
          Sybil Score
        </span>
        {result && (
          <span
            className="text-[10px] font-bold rounded-full px-2 py-0.5"
            style={{ background: palette.bg, color: palette.color }}
          >
            {palette.emoji} {palette.label}
          </span>
        )}
      </div>

      {/* Score value */}
      {isLoading ? (
        <div className="h-7 w-16 rounded-lg animate-pulse" style={{ background: "var(--border)" }} />
      ) : result ? (
        <span className="text-[22px] font-semibold leading-none" style={{ color: palette.color }}>
          {result.sybilScore}
          <span className="text-sm font-normal text-[--text-secondary]"> / 100</span>
        </span>
      ) : (
        <span className="text-[22px] font-semibold text-[--text-secondary]">—</span>
      )}

      {/* Progress bar */}
      {!isLoading && result && (
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 5, background: "var(--bg-input)" }}
        >
          <div
            style={{
              height: "100%",
              width: `${result.sybilScore}%`,
              background: palette.color,
              borderRadius: 999,
              transition: "width 0.8s ease",
            }}
          />
        </div>
      )}

      {/* Flags */}
      {!isLoading && result && (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {result.flags.recentlyAwakenedDormantWallet && (
            <span className="text-[9px] font-bold rounded-full px-2 py-0.5 bg-[#f59e0b18] text-[#f59e0b]">
              ⚡ DORMANT WAKEUP
            </span>
          )}
          {result.flags.lowContractDiversity && (
            <span className="text-[9px] font-bold rounded-full px-2 py-0.5 bg-[#ef444418] text-[#ef4444]">
              🔴 LOW DIVERSITY
            </span>
          )}
          {result.flags.sharedFundingSourceDetected && (
            <span className="text-[9px] font-bold rounded-full px-2 py-0.5 bg-[#ef444418] text-[#ef4444]">
              🔗 SHARED FUNDING
            </span>
          )}
          {!result.flags.recentlyAwakenedDormantWallet &&
           !result.flags.lowContractDiversity &&
           !result.flags.sharedFundingSourceDetected && null}
        </div>
      )}
    </div>
  );
}
