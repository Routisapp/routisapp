"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { fetchLeaderboard } from "@/lib/supabase";
import { getTierFromScore } from "@/lib/utils";

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

interface Stats {
  totalTraders:  number;
  totalScore:    number;
  userRank:      number | null;
  userScore:     number | null;
  totalVolume:   number;
  totalSwaps:    number;
  totalPoints:   number;
  userVolume:    number | null;
  userSwaps:     number | null;
}

// Shared query key so both components hit the same cache
const STATS_QUERY_KEY = (address: string | undefined) => ["leaderboard-stats", address];

async function fetchStats(address: string | undefined): Promise<Stats> {
  const rows = await fetchLeaderboard(10000);
  const totalTraders = rows.filter((r) => r.score > 0).length;
  const totalScore   = rows.reduce((s, r) => s + r.score, 0);
  const userIdx  = address
    ? rows.findIndex((r) => r.address.toLowerCase() === address.toLowerCase())
    : -1;
  const userRank  = userIdx >= 0 ? userIdx + 1 : null;
  const userScore = userIdx >= 0 ? rows[userIdx].score : null;
  const totalVolume  = rows.reduce((s, r) => s + (r.volume_usd  ?? 0), 0);
  const totalSwaps   = rows.reduce((s, r) => s + (r.swap_count  ?? 0), 0);
  const totalPoints  = totalScore; // same as totalScore
  const userVolume   = userIdx >= 0 ? (rows[userIdx].volume_usd  ?? 0) : null;
  const userSwaps    = userIdx >= 0 ? (rows[userIdx].swap_count  ?? 0) : null;
  return { totalTraders, totalScore, userRank, userScore, totalVolume, totalSwaps, totalPoints, userVolume, userSwaps };
}

// ── Existing top-row stat cards ───────────────────────────────────────────────
export function StatCards() {
  const { address } = useAccount();

  const { data } = useQuery<Stats>({
    queryKey: STATS_QUERY_KEY(address),
    queryFn:  () => fetchStats(address),
    staleTime: 5_000,
  });

  const rankValue = data?.userRank ? `#${data.userRank}` : "—";

  return (
    <div className="grid grid-cols-1 gap-3 mb-6">
      {/* ── Wallet rank card — horizontally scrollable on mobile ── */}
      <div className="rounded-xl border border-[--border] bg-[--bg-card] overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 380 }}>
            {/* Single row: label + values on same line */}
            <div className="grid grid-cols-[28px_1fr_72px_88px_72px] sm:grid-cols-[36px_1fr_80px_96px_80px] gap-2 sm:gap-3 px-3 sm:px-5 border-b border-[--border]">
              {/* YOUR WALLET RANK — header */}
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
                {data?.userScore != null ? fmt(data.userScore) : "—"}
              </span>
              <span className="text-sm font-semibold text-right text-[--text-primary]">
                {data?.userVolume != null ? fmtUsd(data.userVolume) : "—"}
              </span>
              <span className="text-sm font-semibold text-right text-[--text-primary]">
                {data?.userSwaps != null ? fmt(data.userSwaps) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New aggregate cards row ───────────────────────────────────────────────────
export function AggregateCards() {
  const { address } = useAccount();

  const { data } = useQuery<Stats>({
    queryKey: STATS_QUERY_KEY(address),
    queryFn:  () => fetchStats(address),
    staleTime: 5_000,
  });

  const cards = [
    { label: "ROUTIS TOTAL VOLUME", value: data ? fmtUsd(data.totalVolume) : "—" },
    { label: "ROUTIS TOTAL SWAP",    value: data ? fmt(data.totalSwaps)     : "—" },
    { label: "ROUTIS TOTAL TRADERS", value: data ? fmt(data.totalTraders)  : "—" },
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
