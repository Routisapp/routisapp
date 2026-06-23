"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useWalletStats } from "@/hooks/useWalletStats";
import { fetchWalletScoreLeaderboard } from "@/lib/supabase";
import { StatCard }               from "./StatCard";
import { WalletScore }            from "./WalletScore";
import { WalletScoreLeaderboard } from "./WalletScoreLeaderboard";
import { SybilScoreCard }         from "./SybilScoreCard";
import { Skeleton }               from "@/components/ui/LoadingSpinner";
import { computeSybilScore, buildSybilInput } from "@/lib/sybilScore";
import type { SybilResult } from "@/lib/sybilScore";

export function WalletStatsPanel() {
  const { address: connectedAddress } = useAccount();
  const [analyzed,   setAnalyzed]     = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [lbSearch,   setLbSearch]     = useState("");
  const [lbTier,     setLbTier]       = useState("All tiers");

  // When wallet connects, auto-fill and analyze
  useEffect(() => {
    if (connectedAddress) {
      setAnalyzed(connectedAddress.toLowerCase());
    }
  }, [connectedAddress]);

  const { data, isLoading } = useWalletStats(analyzed);

  // Compute sybil score from wallet stats data
  const sybilResult: SybilResult | null = data
    ? computeSybilScore(buildSybilInput({
        totalTxs:        data.totalTxs,
        baseVolume:      data.baseVolume,
        gasFees:         data.gasFees,
        ethBalance:      data.ethBalance,
        activeDays:      data.activeDays,
        uniqueAddresses: data.uniqueAddresses,
        firstTx:         data.firstTx,
        lastTx:          data.lastTx,
      }))
    : null;

  const { data: lbEntries = [] } = useQuery({
    queryKey:  ["wallet-score-leaderboard", refreshKey],
    queryFn:   () => fetchWalletScoreLeaderboard(500),
    staleTime: 2 * 60 * 1000,
    gcTime:    5 * 60 * 1000,
  });

  const userRank = analyzed
    ? lbEntries.findIndex((e) => e.address.toLowerCase() === analyzed.toLowerCase()) + 1
    : 0;

  // Refresh leaderboard when new data arrives
  const prevDataRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (data?.address && data.address !== prevDataRef.current) {
      prevDataRef.current = data.address;
      // Small delay so the API upsert completes before we re-fetch
      setTimeout(() => setRefreshKey(k => k + 1), 1500);
    }
  }, [data]);

  const loading = isLoading;

  return (
    <div className="flex flex-col gap-4">


      {analyzed && (
        <>
          {/* ── Top summary card ─────────────────────────────── */}
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">

              {/* Address */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary]">Address</span>
                <span className="font-mono text-sm font-bold truncate" style={{ color: "#C9693A" }}>
                  {analyzed}
                </span>
              </div>

              <div className="hidden sm:block w-px h-8 bg-[--border]" />

              {/* Wallet Age */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary]">Wallet Age</span>
                {loading ? (
                  <Skeleton className="h-5 w-20 mt-0.5" />
                ) : (
                  <span className="text-sm font-semibold text-[--text-primary]">
                    {data?.firstTx && data.firstTx !== "—"
                      ? (() => {
                          const days = Math.floor((Date.now() - new Date(data.firstTx).getTime()) / 86400000);
                          if (isNaN(days) || days < 0) return data.firstTx;
                          if (days < 30)  return `${days} days`;
                          const months = Math.floor(days / 30);
                          if (months < 12) return `${months} months`;
                          const years = Math.floor(months / 12);
                          const rem   = months % 12;
                          return rem > 0 ? `${years}y ${rem}mo` : `${years} years`;
                        })()
                      : "—"}
                  </span>
                )}
              </div>

              <div className="hidden sm:block w-px h-8 bg-[--border]" />

              {/* ETH Balance */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary]">ETH Balance</span>
                {loading ? (
                  <Skeleton className="h-5 w-20 mt-0.5" />
                ) : (
                  <span className="text-sm font-semibold text-[--text-primary]">
                    {data?.ethBalance ?? "—"} ETH
                  </span>
                )}
              </div>

            </div>
          </div>

          {/* ── Wallet Score card ──────────────────────────────── */}
          <WalletScore data={data} isLoading={loading} />

          {/* ── Stats grid ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total txs"    value={data?.totalTxs ?? 0} isLoading={loading} variant="neutral" />
            <StatCard
              label="Base volume"
              value={data ? `$${data.baseVolume.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—"}
              isLoading={loading}
              variant="neutral"
            />
            <StatCard
              label="Gas fees"
              value={data ? `${data.gasFees} ETH` : "—"}
              isLoading={loading}
              variant="neutral"
            />
            <StatCard label="Last tx"          value={data?.lastTx          ?? "—"} isLoading={loading} variant="neutral" />
            <StatCard label="Active days"      value={data?.activeDays      ?? 0}   isLoading={loading} variant="neutral" />
            <StatCard label="Unique addresses" value={data?.uniqueAddresses ?? 0}   isLoading={loading} variant="neutral" />

            {/* Sybil Score — full width */}
            <div className="col-span-2 sm:col-span-3">
              <SybilScoreCard key={analyzed} result={sybilResult} isLoading={loading} analyzed={analyzed} />
            </div>

            {/* Your wallet rank — full width */}
            <div className="col-span-2 sm:col-span-3 rounded-xl border border-[--border] bg-[--bg-card] px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[--text-secondary]">Your wallet rank</span>
              <span className="text-xl font-black leading-tight text-[--text-primary]">
                {userRank > 0 ? `#${userRank}` : "—"}
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── Wallet Score Leaderboard — always visible ──────────── */}
      <WalletScoreLeaderboard currentAddress={analyzed} refreshKey={refreshKey} search={lbSearch} tierFilter={lbTier} />
    </div>
  );
}
