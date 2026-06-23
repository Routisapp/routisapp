"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { fetchLeaderboard } from "@/lib/supabase";
import { getTierFromScore } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/leaderboard";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

// Use the SAME query key as useLeaderboard so both share the same cache
function useLeaderboardData() {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const data = await fetchLeaderboard(10000);
      return data.map((row, i) => {
        const tier = getTierFromScore(row.score);
        return { ...row, rank: i + 1, tier_name: tier.name, tier_id: tier.id };
      });
    },
    staleTime: 5_000,
  });
}

// ── Wallet rank + user stats card ────────────────────────────────────────────
export function StatCards() {
  const { address } = useAccount();
  const { data: entries = [] } = useLeaderboardData();

  const userEntry = address
    ? entries.find((e) => e.address.toLowerCase() === address.toLowerCase())
    : undefined;

  const userRank   = userEntry?.rank ?? null;
  const userScore  = userEntry?.score ?? null;
  const userVolume = userEntry?.volume_usd ?? null;
  const userSwaps  = userEntry?.swap_count ?? null;
  const rankValue  = userRank ? `#${userRank}` : "—";

  return (
    <div className="grid grid-cols-1 gap-3 mb-6">
      <div className="rounded-xl border border-[--border] bg-[--bg-card] overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 380 }}>
            {/* Header row */}
            <div className="grid grid-cols-[28px_1fr_72px_88px_72px] sm:grid-cols-[36px_1fr_80px_96px_80px] gap-2 sm:gap-3 px-3 sm:px-5 border-b border-[--border]">
              <div className="col-span-2 flex items-center py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary]">Your wallet rank</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary] text-right flex items-center justify-end py-2">Score</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary] text-right flex items-center justify-end py-2">Volume</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary] text-right flex items-center justify-end py-2">Swaps</span>
            </div>
            {/* Values row */}
            <div className="grid grid-cols-[28px_1fr_72px_88px_72px] sm:grid-cols-[36px_1fr_80px_96px_80px] gap-2 sm:gap-3 px-3 sm:px-5 py-3 items-center">
              <div className="col-span-2">
                <span className="text-[22px] font-black text-[--text-primary]" style={{ lineHeight: 1.1 }}>{rankValue}</span>
              </div>
              <span className="text-sm font-black text-right" style={{ color: "#C9693A" }}>
                {userScore != null ? fmt(userScore) : "—"}
              </span>
              <span className="text-sm font-semibold text-right text-[--text-primary]">
                {userVolume != null ? fmtUsd(userVolume) : "—"}
              </span>
              <span className="text-sm font-semibold text-right text-[--text-primary]">
                {userSwaps != null ? fmt(userSwaps) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Aggregate cards row ───────────────────────────────────────────────────────
export function AggregateCards() {
  const { data: entries = [] } = useLeaderboardData();

  const totalVolume  = entries.reduce((s, r) => s + (r.volume_usd  ?? 0), 0);
  const totalSwaps   = entries.reduce((s, r) => s + (r.swap_count  ?? 0), 0);
  const totalTraders = entries.filter((r) => r.score > 0).length;

  const cards = [
    { label: "ROUTIS TOTAL VOLUME",  value: entries.length ? fmtUsd(totalVolume) : "—" },
    { label: "ROUTIS TOTAL SWAP",    value: entries.length ? fmt(totalSwaps)     : "—" },
    { label: "ROUTIS TOTAL TRADERS", value: entries.length ? fmt(totalTraders)   : "—" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-[--border] bg-[--bg-card] px-3 py-3 sm:p-4 flex flex-col gap-1 min-h-[80px] justify-center"
        >
          <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.04em] text-[--text-secondary]" style={{ marginBottom: 2 }}>
            {c.label}
          </p>
          <p className="text-base sm:text-[22px] font-semibold text-[--text-primary]" style={{ lineHeight: 1.15 }}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
