"use client";

import { useAccount }      from "wagmi";
import { ConnectButton }   from "@rainbow-me/rainbowkit";
import { Header }          from "@/components/layout/Header";
import { MobileNav }       from "@/components/layout/MobileNav";
import { Skeleton }        from "@/components/ui/LoadingSpinner";
import { useLeaderboard }  from "@/hooks/useLeaderboard";
import { shortAddress, formatNumber, formatUsd } from "@/lib/utils";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const TIER_COLORS: Record<string, string> = {
  Diamond: "#7B5EA7",   /* mat mor — okunabilir krem üzerinde */
  Gold:    "#B8860B",   /* koyu altın */
  Silver:  "#8C7B6E",   /* warm gray */
  Bronze:  "#C9693A",   /* terra cotta */
  Unranked:"#9C8577",
};

export default function LeaderboardPage() {
  const { address } = useAccount();
  const { data: entries = [], isLoading } = useLeaderboard();

  const userEntry = entries.find(
    (e) => e.address.toLowerCase() === address?.toLowerCase(),
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-24 md:pb-10">
        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[--accent-blue]">Leaderboard</h1>
          <p className="mt-1 text-sm text-[--text-secondary]">Top 100 traders ranked by score. Updates in realtime.</p>
        </div>

        {/* How to earn */}
        <div className="mb-6 rounded-xl border border-[--border] bg-[--bg-card] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[--text-secondary]">How to Earn Points</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { pts: "+50",  label: "Swap",        icon: "⇄",  color: "#C9693A" },
              { pts: "+100", label: "Mint NFT",     icon: "🏅", color: "#B8860B" },
              { pts: "+200", label: "7-day Streak", icon: "🔥", color: "#C9522A" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[--border] bg-[--bg-input] p-3">
                <div className="text-base mb-1">{item.icon}</div>
                <div className="text-sm font-bold" style={{ color: item.color }}>{item.pts} pts</div>
                <div className="text-xs text-[--text-secondary]">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[--border] bg-[--bg-card] overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[40px_1fr_80px_90px_70px] gap-2 px-4 py-2.5 border-b border-[--border] text-[11px] font-bold uppercase tracking-wide text-[--text-secondary]">
            <div>#</div>
            <div>Trader</div>
            <div className="text-right">Score</div>
            <div className="text-right">Volume</div>
            <div className="text-right">Swaps</div>
          </div>

          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr_80px_90px_70px] gap-2 px-4 py-3 border-b border-[--border]">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-14 ml-auto" />
                  <Skeleton className="h-5 w-16 ml-auto" />
                  <Skeleton className="h-5 w-10 ml-auto" />
                </div>
              ))
            : entries.map((entry, i) => {
                const isUser = address?.toLowerCase() === entry.address.toLowerCase();
                return (
                  <div
                    key={entry.address}
                    className={`grid grid-cols-[40px_1fr_80px_90px_70px] gap-2 px-4 py-3 border-b border-[--border] last:border-0 transition-colors ${
                      isUser ? "bg-[#C9693A]/8" : "hover:bg-[--bg-input]"
                    }`}
                  >
                    <div className="flex items-center text-sm">
                      {MEDALS[entry.rank] ?? <span className="text-[--text-secondary] font-semibold">{entry.rank}</span>}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: `hsl(${20 + entry.rank * 8}, 45%, 45%)` }}
                      >
                        {entry.address[2].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-[--text-primary]">{shortAddress(entry.address)}</span>
                          {isUser && <span className="rounded-md px-1 py-0.5 text-[10px] font-bold" style={{ background:"#C9693A22", color:"#C9693A" }}>YOU</span>}
                        </div>
                        <div className="text-[11px] font-semibold" style={{ color: TIER_COLORS[entry.tier_name] }}>
                          {entry.tier_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end text-sm font-bold" style={{ color: "#C9693A" }}>
                      {formatNumber(entry.score)}
                    </div>
                    <div className="flex items-center justify-end text-sm text-[--text-secondary]">
                      {formatUsd(entry.volume_usd)}
                    </div>
                    <div className="flex items-center justify-end text-sm text-[--text-secondary]">
                      {entry.swap_count}
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Sticky own rank at bottom */}
        {address && !isLoading && !userEntry && (
          <div className="mt-4 rounded-xl border border-dashed border-[--border] bg-[--bg-card] px-4 py-3 text-sm text-[--text-secondary]">
            You are not on the leaderboard yet. Make a swap to get started!
          </div>
        )}
      </main>
      <MobileNav />
    </>
  );
}


