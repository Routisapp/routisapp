"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWalletScoreLeaderboard } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/LoadingSpinner";

const PAGE_SIZE = 10;

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function fmtAge(days: number): string {
  if (!days || days <= 0) return "—";
  if (days < 30) return `${days}d`;
  const m = Math.floor(days / 30);
  if (m < 12) return `${m}mo`;
  const y = Math.floor(m / 12);
  const rem = m % 12;
  return rem > 0 ? `${y}y ${rem}mo` : `${y}y`;
}

function fmtTxs(n: number): string {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtVol(n: number): string {
  if (!n) return "$0";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}`;
}

function getTier(score: number): string {
  if (score >= 85) return "DIAMOND";
  if (score >= 70) return "GOLD";
  if (score >= 50) return "SILVER";
  if (score >= 30) return "BRONZE";
  return "UNRANKED";
}

function rankEmoji(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}`;
}

interface WalletScoreLeaderboardProps {
  currentAddress?: string;
  refreshKey?: number;
  search?: string;
  tierFilter?: string;
}

export function WalletScoreLeaderboard({
  currentAddress,
  refreshKey,
  search: searchProp = "",
  tierFilter: tierFilterProp = "All tiers",
}: WalletScoreLeaderboardProps) {
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [searchProp, tierFilterProp]);

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ["wallet-score-leaderboard", refreshKey],
    queryFn: () => fetchWalletScoreLeaderboard(500),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const entries = allEntries.filter((e) => {
    const matchAddr = !searchProp.trim() || e.address.toLowerCase().includes(searchProp.trim().toLowerCase());
    const matchTier = tierFilterProp === "All tiers" || getTier(e.wallet_score) === tierFilterProp;
    return matchAddr && matchTier;
  });

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEntries = entries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function goPage(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  function pageNumbers(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (safePage > 3) pages.push("…");
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) pages.push(p);
    if (safePage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="rounded-2xl border border-[--border] bg-[--bg-card] overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-[32px_1fr_64px_56px_88px_64px] gap-2 px-5 py-2.5 border-b border-[--border]">
        {["#", "ADDRESS", "SCORE", "TXS", "VOLUME", "AGE"].map((h) => (
          <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary]">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {isLoading ? (
        Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div key={i} className="px-5 py-3 border-b border-[--border] last:border-0">
            <Skeleton className="h-6 w-full" />
          </div>
        ))
      ) : entries.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-[--text-secondary]">
          No data yet — analyze a wallet to appear here.
        </p>
      ) : (
        pageEntries.map((entry, i) => {
          const rank = (safePage - 1) * PAGE_SIZE + i + 1;
          const isSelf = currentAddress?.toLowerCase() === entry.address.toLowerCase();

          return (
            <div
              key={entry.address}
              className="grid grid-cols-[32px_1fr_64px_56px_88px_64px] gap-2 px-5 py-3 border-b border-[--border] last:border-0 items-center transition-colors hover:bg-[--bg-input]"
              style={isSelf ? { background: "var(--bg-input)" } : undefined}
            >
              <span className="text-sm font-bold text-[--text-secondary] text-center">
                {rankEmoji(rank)}
              </span>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-sm font-bold truncate text-[--text-primary]">
                  {shortAddr(entry.address)}
                </span>
              </div>

              <span className="text-sm font-black" style={{ color: "#C9693A" }}>
                {entry.wallet_score.toFixed(1)}
              </span>

              <span className="text-sm text-[--text-primary] font-semibold">
                {fmtTxs(entry.total_txs ?? 0)}
              </span>

              <span className="text-sm text-[--text-primary] font-semibold">
                {fmtVol(entry.base_volume_usd ?? 0)}
              </span>

              <span className="text-sm text-[--text-secondary]">
                {fmtAge(entry.wallet_age_days)}
              </span>
            </div>
          );
        })
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 px-5 py-3 border-t border-[--border] flex-wrap">
          <button
            onClick={() => goPage(safePage - 1)}
            disabled={safePage === 1}
            className="rounded-lg border border-[--border] bg-[--bg-input] px-3 py-1.5 text-xs font-semibold text-[--text-secondary] disabled:opacity-40 hover:border-[#C9693A]/50 transition-all"
          >
            ← Prev
          </button>
          {pageNumbers().map((p, idx) =>
            p === "…" ? (
              <span key={`e-${idx}`} className="px-1 text-[--text-secondary] text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => goPage(p as number)}
                className="rounded-lg border px-3 py-1.5 text-xs font-bold transition-all"
                style={
                  p === safePage
                    ? { background: "#C9693A", borderColor: "#C9693A", color: "#fff" }
                    : { borderColor: "var(--border)", background: "var(--bg-input)", color: "var(--text-secondary)" }
                }
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => goPage(safePage + 1)}
            disabled={safePage === totalPages}
            className="rounded-lg border border-[--border] bg-[--bg-input] px-3 py-1.5 text-xs font-semibold text-[--text-secondary] disabled:opacity-40 hover:border-[#C9693A]/50 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
