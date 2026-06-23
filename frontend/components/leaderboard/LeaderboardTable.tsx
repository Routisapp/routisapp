"use client";

import { useState, useMemo } from "react";
import { useAccount }        from "wagmi";
import { Skeleton }          from "@/components/ui/LoadingSpinner";
import { shortAddress, formatNumber, formatUsd } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/leaderboard";

const TIER_COLOR: Record<string, string> = {
  Diamond:  "#7B5EA7",
  Gold:     "#B8860B",
  Silver:   "#8C8C8C",
  Bronze:   "#CD7F32",
  Unranked: "#8b8fa8",
};

const TIER_EMOJI: Record<string, string> = {
  Diamond:  "💎",
  Gold:     "🥇",
  Silver:   "🥈",
  Bronze:   "🥉",
  Unranked: "",
};

const PAGE_SIZE = 10;

interface Props {
  entries:   LeaderboardEntry[];
  isLoading: boolean;
}

export function LeaderboardTable({ entries, isLoading }: Props) {
  const { address }  = useAccount();
  const [search,     setSearch]     = useState("");
  const [tierFilter, setTierFilter] = useState("All tiers");
  const [page,       setPage]       = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      const matchAddr = !q || e.address.toLowerCase().includes(q);
      const matchTier = tierFilter === "All tiers" || e.tier_name === tierFilter;
      return matchAddr && matchTier;
    });
  }, [entries, search, tierFilter]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const pageEntries = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function goPage(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
    document.getElementById("lb-table-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleTier(v: string)   { setTierFilter(v); setPage(1); }

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
    <div id="lb-table-top">

      {/* ── Table wrapper ── */}
      <div className="rounded-2xl border border-[--border] bg-[--bg-card] overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 420 }}>

        {/* Column headers */}
        <div className="grid grid-cols-[28px_1fr_72px_80px_64px] sm:grid-cols-[36px_1fr_80px_96px_80px] gap-2 sm:gap-3 px-3 sm:px-5 py-3 border-b border-[--border]">
          {["#", "TRADER", "SCORE", "VOLUME", "SWAPS"].map((h, i) => (
            <span
              key={h}
              className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary]"
              style={i > 1 ? { textAlign: "right" } : undefined}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {isLoading ? (
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 border-b border-[--border] last:border-0">
              <Skeleton className="h-9 w-full" />
            </div>
          ))
        ) : pageEntries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[--text-secondary]">
            No results found
          </p>
        ) : (
          pageEntries.map((entry) => {
            const isUser   = address?.toLowerCase() === entry.address.toLowerCase();

            return (
              <div
                key={entry.address}
                className="grid grid-cols-[28px_1fr_72px_80px_64px] sm:grid-cols-[36px_1fr_80px_96px_80px] gap-2 sm:gap-3 px-3 sm:px-5 py-3.5 border-b border-[--border] last:border-0 items-center transition-colors hover:bg-[--bg-input]"
                style={isUser ? { background: "var(--bg-input)" } : undefined}
              >
                {/* Rank */}
                <span className="text-sm font-semibold text-center text-[--text-primary]">
                  {entry.rank}
                </span>

                {/* Trader */}
                <div className="flex items-center gap-2 min-w-0">
                  {/* Tier avatar */}
                  <div
                    className="shrink-0 flex items-center justify-center rounded-full text-base sm:text-lg"
                    style={{
                      width: 28, height: 28,
                      background: `${TIER_COLOR[entry.tier_name] ?? TIER_COLOR.Unranked}33`,
                      border: `1.5px solid ${TIER_COLOR[entry.tier_name] ?? TIER_COLOR.Unranked}88`,
                    }}
                  >
                    {TIER_EMOJI[entry.tier_name] ?? "·"}
                  </div>
                  {/* Address + tier name */}
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-xs sm:text-sm font-bold text-[--text-primary] truncate">
                      {shortAddress(entry.address)}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: TIER_COLOR[entry.tier_name] ?? TIER_COLOR.Unranked }}>
                      {entry.tier_name} Trader
                    </span>
                  </div>
                </div>

                {/* Score */}
                <span className="text-xs sm:text-sm font-black text-right" style={{ color: "#C9693A" }}>
                  {formatNumber(entry.score)}
                </span>

                {/* Volume */}
                <span className="text-xs sm:text-sm font-semibold text-right text-[--text-primary]">
                  {formatUsd(entry.volume_usd)}
                </span>

                {/* Swaps */}
                <span className="text-xs sm:text-sm font-semibold text-right text-[--text-primary]">
                  {entry.swap_count}
                </span>
              </div>
            );
          })
        )}
          </div>
        </div>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
          <button
            onClick={() => goPage(safePage - 1)}
            disabled={safePage === 1}
            className="rounded-lg border border-[--border] bg-[--bg-card] px-3 py-1.5 text-xs font-semibold text-[--text-secondary] disabled:opacity-40 hover:border-[#C9693A]/50 transition-all"
          >
            ← Previous
          </button>
          {pageNumbers().map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-[--text-secondary] text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => goPage(p as number)}
                className="rounded-lg border px-3 py-1.5 text-xs font-bold transition-all"
                style={
                  p === safePage
                    ? { background: "#C9693A", borderColor: "#C9693A", color: "#fff" }
                    : { borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-secondary)" }
                }
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => goPage(safePage + 1)}
            disabled={safePage === totalPages}
            className="rounded-lg border border-[--border] bg-[--bg-card] px-3 py-1.5 text-xs font-semibold text-[--text-secondary] disabled:opacity-40 hover:border-[#C9693A]/50 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
