"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Skeleton } from "@/components/ui/LoadingSpinner";
import { TxStatusBadge } from "@/components/profile/TxStatusBadge";
import { PortfolioView } from "@/components/profile/PortfolioView";
import { ReferralView } from "@/components/profile/ReferralView";

import { useNFTTier } from "@/hooks/useNFTTier";
import { fetchSwapHistory, fetchUserScore, registerReferral } from "@/lib/supabase";
import { shortAddress, formatUsd, basescanTx, getTierFromScore } from "@/lib/utils";
import { BASE_TOKENS } from "@/constants/tokens";
import type { SwapRecord } from "@/types/leaderboard";

// ─── Token lookup map ─────────────────────────────────────────
const TOKEN_MAP: Record<string, { symbol: string; logoURI: string }> = {};
for (const t of BASE_TOKENS) { TOKEN_MAP[t.address.toLowerCase()] = t; TOKEN_MAP[t.address] = t; }

// ─── Token icon — monochrome ──────────────────────────────────
function TokenIcon({ logoURI, symbol }: { logoURI: string; symbol: string }) {
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold shrink-0"
      style={{ background: "#E8DDD0", color: "#5A4A3A" }}
    >
      {logoURI ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoURI} alt={symbol} className="h-5 w-5 rounded-full"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : symbol[0]}
    </span>
  );
}

// ─── Relative time ────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type ProfileTab = "portfolio" | "history" | "referral";

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { address } = useAccount();
  const [tab, setTab] = useState<ProfileTab>("portfolio");
  const [swapPage, setSwapPage] = useState(0);

  const { score, mintedTiers, userScore } = useNFTTier(address);
  const tier = getTierFromScore(score);

  const { data: swaps = [], isLoading: swapsLoading } = useQuery({
    queryKey: ["swap-history", address, swapPage],
    queryFn: () => fetchSwapHistory(address!, swapPage),
    enabled: !!address,
  });

  // Handle /ref/0x... URL param on mount (client-side)
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const match = path.match(/\/ref\/(0x[a-fA-F0-9]+)/);
    if (
      match &&
      address &&
      match[1].toLowerCase() !== address.toLowerCase()
    ) {
      registerReferral(match[1], address).catch(() => {});
    }
  }

  // ── Not connected ──────────────────────────────────────────
  if (!address) {
    return (
      <>
        <Header />
        <main className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 pb-24">
          <div className="text-center">
            <p className="mb-4 text-[--text-secondary]">
              Connect your wallet to view your profile.
            </p>
            <ConnectButton />
          </div>
        </main>
        <MobileNav />
      </>
    );
  }

  // ── Tabs config ────────────────────────────────────────────
  const TABS: Array<{ key: ProfileTab; label: string }> = [
    { key: "portfolio", label: "Portfolio" },
    { key: "history", label: "History" },
    { key: "referral", label: "Referral" },
  ];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-10">

        {/* ── Profile card ──────────────────────────────────── */}
        <div className="mb-5 rounded-xl border border-[--border] bg-[--bg-card] p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-black text-white"
              style={{ background: "linear-gradient(135deg, #C9693A, #B55A2E)" }}
            >
              {address[2].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-mono text-sm font-bold text-[--text-primary]">
                  {shortAddress(address)}
                </span>
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-bold"
                  style={{
                    background: `${tier.color}22`,
                    color: tier.color,
                  }}
                >
                  {tier.name}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Score", value: score },
                  { label: "Swaps", value: userScore?.swap_count ?? 0 },
                  { label: "Vol", value: formatUsd(userScore?.volume_usd ?? 0) },
                  { label: "Streak", value: `${userScore?.consecutive_days ?? 0}d` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-[--border] bg-[--bg-input] px-2 py-2 text-center"
                  >
                    <div className="text-sm font-black text-[--text-primary]">
                      {stat.value}
                    </div>
                    <div className="text-[10px] text-[--text-secondary]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── NFTs owned ────────────────────────────────────── */}
        {mintedTiers.some((t) => t.minted) && (
          <div className="mb-5 rounded-xl border border-[--border] bg-[--bg-card] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[--text-secondary]">
              NFTs Owned
            </p>
            <div className="flex flex-wrap gap-2">
              {mintedTiers
                .filter((t) => t.minted)
                .map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold"
                    style={{
                      background: `${t.color}22`,
                      color: t.color,
                      border: `1px solid ${t.color}44`,
                    }}
                  >
                    🏅 {t.name}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Tab switcher ──────────────────────────────────── */}
        <div className="mb-4 flex gap-1.5 p-1 rounded-xl border border-[--border] bg-[--bg-card] w-fit">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-all duration-200"
              style={{
                background: tab === key ? "#C9693A" : "transparent",
                color: tab === key ? "#ffffff" : "var(--text-secondary)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Portfolio tab ─────────────────────────────────── */}
        {tab === "portfolio" && <PortfolioView address={address} />}

        {/* ── Swap history tab ─────────────────────── */}
        {tab === "history" && (
          <div className="rounded-xl border border-[--border] bg-[--bg-card] overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_60px_100px_28px] gap-2 px-4 py-2.5 border-b border-[--border] text-[11px] font-bold uppercase tracking-wide text-[--text-secondary]">
              <div>Transaction</div>
              <div className="text-right">Pts</div>
              <div className="text-right">Status</div>
              <div />
            </div>

            {swapsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-[--border]">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : swaps.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[--text-secondary]">
                No swaps yet
              </p>
            ) : (
              (swaps as SwapRecord[]).map((s) => {
                const tokenInInfo  = TOKEN_MAP[s.token_in]  ?? { symbol: s.token_in.slice(0, 6),  logoURI: "" };
                const tokenOutInfo = TOKEN_MAP[s.token_out] ?? { symbol: s.token_out.slice(0, 6), logoURI: "" };
                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-[1fr_60px_100px_28px] gap-2 px-4 py-3 border-b border-[--border] last:border-0 items-center"
                  >
                    {/* Transaction: logo + symbol → logo + symbol + time */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <TokenIcon logoURI={tokenInInfo.logoURI} symbol={tokenInInfo.symbol} />
                        <span className="text-sm font-semibold text-[--text-primary]">{tokenInInfo.symbol}</span>
                        <span className="text-[--text-secondary] text-xs">→</span>
                        <TokenIcon logoURI={tokenOutInfo.logoURI} symbol={tokenOutInfo.symbol} />
                        <span className="text-sm font-semibold text-[--text-primary]">{tokenOutInfo.symbol}</span>
                      </div>
                      <div className="text-[10px] text-[--text-secondary] mt-0.5">
                        {timeAgo(s.created_at)}
                      </div>
                    </div>
                    {/* Points */}
                    <div className="text-right text-xs font-bold" style={{ color: "#C9693A" }}>
                      +{s.score_earned}
                    </div>
                    {/* Status */}
                    <div className="flex justify-end">
                      <TxStatusBadge txHash={s.tx_hash} />
                    </div>
                    {/* Basescan link */}
                    <a
                      href={basescanTx(s.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                      title="View on Basescan"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  </div>
                );
              })
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[--border]">
              <button onClick={() => setSwapPage((p) => Math.max(0, p - 1))} disabled={swapPage === 0} className="text-xs text-[--text-secondary] disabled:opacity-40 hover:text-[--text-primary] transition-colors">← Previous</button>
              <span className="text-xs text-[--text-secondary]">Page {swapPage + 1}</span>
              <button onClick={() => setSwapPage((p) => p + 1)} disabled={swaps.length < 50} className="text-xs text-[--text-secondary] disabled:opacity-40 hover:text-[--text-primary] transition-colors">Next →</button>
            </div>
          </div>
        )}

        {/* ── Referral tab ──────────────────────────────────── */}
        {tab === "referral" && <ReferralView address={address} />}

      </main>
      <MobileNav />
    </>
  );
}
