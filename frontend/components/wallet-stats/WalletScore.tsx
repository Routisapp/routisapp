"use client";

import type { WalletStats } from "@/app/api/wallet-stats/route";

// ── Scoring helpers ──────────────────────────────────────────────────────────

const SCORE_MAX = { tx: 500, age: 36, vol: 50000, con: 250, fee: 0.05 };

function linearScore(value: number, max: number): number {
  return Math.min((value / max) * 10, 10);
}

function getWalletScore(
  txCount:        number,
  walletAgeMonths: number,
  volumeUSD:      number,
  contractCount:  number,
  feesETH:        number,
) {
  const txS  = linearScore(txCount,          SCORE_MAX.tx);
  const ageS = linearScore(walletAgeMonths,  SCORE_MAX.age);
  const volS = linearScore(volumeUSD,        SCORE_MAX.vol);
  const conS = linearScore(contractCount,    SCORE_MAX.con);
  const feeS = linearScore(feesETH,          SCORE_MAX.fee);
  const total = (txS * 0.25 + ageS * 0.20 + volS * 0.25 + conS * 0.20 + feeS * 0.10) * 10;
  return { total: Math.min(100, Math.round(total * 10) / 10), txS, ageS, volS, conS, feeS };
}

function getTierLabel(score: number): string {
  if (score >= 85) return "DIAMOND";
  if (score >= 70) return "GOLD";
  if (score >= 50) return "SILVER";
  if (score >= 30) return "BRONZE";
  return "UNRANKED";
}

// ── Gauge ────────────────────────────────────────────────────────────────────

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~339.3

function Gauge({ score, isLoading }: { score: number; isLoading: boolean }) {
  const progress = Math.min(score / 100, 1);
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx="70" cy="70" r={RADIUS}
          fill="none"
          stroke="var(--bg-input)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        {/* Fill — clockwise from top */}
        {!isLoading && (
          <circle
            cx="70" cy="70" r={RADIUS}
            fill="none"
            stroke="#c85c1a"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        )}
      </svg>

      {/* Score — centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isLoading ? (
          <div style={{ width: 46, height: 28, borderRadius: 6, background: "var(--border)", opacity: 0.5 }} />
        ) : (
          <span style={{ fontSize: 34, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>
            {score.toFixed(0)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Metric row ───────────────────────────────────────────────────────────────

function MetricRow({
  label,
  rawScore,
  weight,
  isLoading,
}: {
  label:     string;
  rawScore:  number;
  weight:    string;
  isLoading: boolean;
}) {
  const pct = Math.min(100, (rawScore / 10) * 100);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[--text-secondary]">{label}</span>
        </div>
        {isLoading ? (
          <div className="h-3.5 w-12 rounded bg-[--border] animate-pulse" />
        ) : (
          <span className="text-xs font-semibold text-[--text-primary]">
            {rawScore.toFixed(1)}<span className="text-[--text-secondary] font-normal">/10</span>
            <span className="ml-2 text-[--text-secondary] opacity-70">{weight}</span>
          </span>
        )}
      </div>
      <div style={{ height: 6, borderRadius: 4, overflow: "hidden" }} className="bg-[--bg-input]">
        {!isLoading && (
          <div
            style={{
              height: "100%",
              borderRadius: 4,
              background: "#c85c1a",
              width: `${pct}%`,
              transition: "width 0.8s ease",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  data:      WalletStats | undefined;
  isLoading: boolean;
}

export function WalletScore({ data, isLoading }: Props) {
  const txCount         = data?.totalTxs        ?? 0;
  const baseVolume      = data?.baseVolume       ?? 0;
  const uniqueAddresses = data?.uniqueAddresses  ?? 0;
  const feesETH         = parseFloat(data?.gasFees ?? "0") || 0;

  let walletAgeMonths = 0;
  if (data?.firstTx && data.firstTx !== "—") {
    const ms = Date.now() - new Date(data.firstTx).getTime();
    walletAgeMonths = Math.max(0, ms / (1000 * 60 * 60 * 24 * 30));
  }

  const { total, txS, ageS, volS, conS, feeS } = getWalletScore(
    txCount, walletAgeMonths, baseVolume, uniqueAddresses, feesETH,
  );

  const fmtAge = walletAgeMonths < 1
    ? "< 1 mo"
    : walletAgeMonths < 12
      ? `${Math.round(walletAgeMonths)} mo`
      : `${(walletAgeMonths / 12).toFixed(1)} yr`;

  const fmtVol = baseVolume >= 1000
    ? `$${(baseVolume / 1000).toFixed(1)}K`
    : `$${baseVolume.toFixed(0)}`;

  return (
    <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary] mb-3">
        Wallet Score Card
      </p>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-3 items-center">
        {/* Gauge — 30% of card width */}
        <div className="flex flex-col items-center shrink-0 w-[30%]">
          <Gauge score={isLoading ? 0 : total} isLoading={isLoading} />
        </div>

        {/* Metrics */}
        <div className="flex flex-col gap-3 flex-1 w-full min-w-0">
          <MetricRow label="Transactions" rawScore={txS}  weight="25%" isLoading={isLoading} />
          <MetricRow label="Wallet Age"   rawScore={ageS} weight="20%" isLoading={isLoading} />
          <MetricRow label="Volume"       rawScore={volS} weight="25%" isLoading={isLoading} />
          <MetricRow label="Contracts"    rawScore={conS} weight="20%" isLoading={isLoading} />
          <MetricRow label="Gas Fees"     rawScore={feeS} weight="10%" isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
