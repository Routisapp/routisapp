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

  const userCards = [
    { label: "YOUR ROUTIS VOLUME", value: data?.userVolume != null ? fmtUsd(data.userVolume) : "—" },
    { label: "YOUR ROUTIS SWAPS",  value: data?.userSwaps  != null ? fmt(data.userSwaps)     : "—" },
    { label: "YOUR ROUTIS SCORE",  value: data?.userScore  != null ? fmt(data.userScore)     : "—" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 mb-6">
      {/* ── User personal stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {userCards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[--border] bg-[--bg-card] p-4 flex flex-col gap-1 min-h-[90px] justify-center"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[--text-secondary]" style={{ marginBottom: 2 }}>
              {c.label}
            </p>
            <p className="text-[22px] font-semibold text-[--text-primary]" style={{ lineHeight: 1.15 }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Wallet rank ── */}
      <div className="rounded-xl border border-[--border] bg-[--bg-card] p-4 flex items-center justify-between gap-4 min-h-[45px]">
        <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[--text-secondary]">Your wallet rank</span>
        <span className="text-[22px] font-semibold text-[--text-primary] shrink-0" style={{ lineHeight: 1.15 }}>{rankValue}</span>
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
    <div className="grid grid-cols-3 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-[--border] bg-[--bg-card] p-4 flex flex-col gap-1 min-h-[90px] justify-center"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[--text-secondary]" style={{ marginBottom: 2 }}>
            {c.label}
          </p>
          <p className="text-[22px] font-semibold text-[--text-primary]" style={{ lineHeight: 1.15 }}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
