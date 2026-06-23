"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { createPublicClient, http, erc20Abi, getAddress } from "viem";
import { base } from "viem/chains";

import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Skeleton } from "@/components/ui/LoadingSpinner";
import { TxStatusBadge } from "@/components/profile/TxStatusBadge";
import { PortfolioView } from "@/components/profile/PortfolioView";
import { ReferralView } from "@/components/profile/ReferralView";

import { useNFTTier } from "@/hooks/useNFTTier";
import { fetchSwapHistory, registerReferral } from "@/lib/supabase";
import { basescanTx, getTierFromScore } from "@/lib/utils";
import { BASE_TOKENS, NATIVE_ETH } from "@/constants/tokens";
import { resolveTokenLogo } from "@/lib/tokenLogo";
import type { SwapRecord } from "@/types/leaderboard";

// ─── Token lookup map (known tokens) ─────────────────────────
const TOKEN_MAP: Record<string, { symbol: string; logoURI: string }> = {};
for (const t of BASE_TOKENS) {
  TOKEN_MAP[t.address.toLowerCase()] = t;
  TOKEN_MAP[t.address] = t;
}
// Native ETH alias
TOKEN_MAP[NATIVE_ETH.toLowerCase()] = TOKEN_MAP[NATIVE_ETH] = {
  symbol: "ETH",
  logoURI: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png?1595348880",
};

// ─── Public client for on-chain symbol() lookups ─────────────
const publicClient = createPublicClient({ chain: base, transport: http() });

// ─── Per-session cache for resolved unknown tokens ────────────
const resolvedCache = new Map<string, { symbol: string; logoURI: string }>();

// ─── Hook: resolve unknown token address → {symbol, logoURI} ─
function useTokenInfo(address: string): { symbol: string; logoURI: string } {
  const known = TOKEN_MAP[address] ?? TOKEN_MAP[address.toLowerCase()];
  const [info, setInfo] = useState<{ symbol: string; logoURI: string }>(
    known ?? resolvedCache.get(address.toLowerCase()) ?? { symbol: "?", logoURI: "" }
  );

  useEffect(() => {
    if (known) return; // already in static map
    const lower = address.toLowerCase();
    if (resolvedCache.has(lower)) {
      setInfo(resolvedCache.get(lower)!);
      return;
    }

    let cancelled = false;
    async function resolve() {
      try {
        const checksummed = getAddress(address);

        // Fetch symbol on-chain + logo in parallel
        const [symbol, logoURI] = await Promise.all([
          publicClient.readContract({
            address: checksummed,
            abi: erc20Abi,
            functionName: "symbol",
          }) as Promise<string>,
          resolveTokenLogo(checksummed),
        ]);

        if (cancelled) return;
        const result = { symbol, logoURI };
        resolvedCache.set(lower, result);
        setInfo(result);
      } catch {
        // On-chain call failed — show "?" as fallback, no address
        if (!cancelled) {
          const fallback = { symbol: "?", logoURI: "" };
          resolvedCache.set(address.toLowerCase(), fallback);
          setInfo(fallback);
        }
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [address, known]);

  return info;
}

// ─── Token icon ───────────────────────────────────────────────
function TokenIcon({ logoURI, symbol }: { logoURI: string; symbol: string }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold shrink-0 bg-[--bg-input] text-[--text-secondary]">
      {logoURI ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoURI} alt={symbol} className="h-5 w-5 rounded-full"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : symbol[0]}
    </span>
  );
}

// ─── Token display: resolves unknown addresses dynamically ────
function TokenDisplay({ address }: { address: string }) {
  const { symbol, logoURI } = useTokenInfo(address);
  return (
    <>
      <TokenIcon logoURI={logoURI} symbol={symbol} />
      <span className="text-sm font-semibold text-[--text-primary] truncate" style={{ maxWidth: 56 }}>{symbol}</span>
    </>
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
  const [historyPage, setHistoryPage] = useState(1);
  const PAGE_SIZE = 5;

  const { score, mintedTiers } = useNFTTier(address);
  const tier = getTierFromScore(score);

  const { data: swaps = [], isLoading: swapsLoading } = useQuery({
    queryKey: ["swap-history", address],
    queryFn: () => fetchSwapHistory(address!, 0, 500),
    enabled: !!address,
  });

  // Client-side pagination
  const totalPages  = Math.max(1, Math.ceil(swaps.length / PAGE_SIZE));
  const safePage    = Math.min(historyPage, totalPages);
  const pageSwaps   = (swaps as SwapRecord[]).slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function goHistoryPage(p: number) {
    setHistoryPage(Math.max(1, Math.min(p, totalPages)));
  }

  function historyPageNumbers(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (safePage > 3) pages.push("…");
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) pages.push(p);
    if (safePage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

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
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={openConnectModal}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110"
                  style={{ background: "#C9693A" }}
                >
                  Connect Wallet
                </button>
              )}
            </ConnectButton.Custom>
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

  // ── Tier badge config ───────────────────────────────────────────────────
  const TIER_BADGE: Record<string, { color: string; emoji: string; label: string }> = {
    Unranked: { color: "#8b8fa8", emoji: "—",  label: "Unranked" },
    Bronze:   { color: "#C9693A", emoji: "🥉", label: "Bronze"   },
    Silver:   { color: "#8C7B6E", emoji: "🥈", label: "Silver"   },
    Gold:     { color: "#B8860B", emoji: "🥇", label: "Gold"     },
    Diamond:  { color: "#7B5EA7", emoji: "💎", label: "Diamond"  },
  };
  const badge = TIER_BADGE[tier.name] ?? TIER_BADGE.Unranked;

  return (
    <>
      <Header />
      <main className="py-8 pb-24 md:pb-10">
        {/* ── Shared centered container ────────────────────── */}
        <div className="mx-auto w-full px-4" style={{ maxWidth: 680 }}>

        {/* ── Profile card ──────────────────────────────────── */}
        <div
          className="mb-5 flex flex-col items-center"
          style={{
            background:   "var(--bg-card)",
            border:       "1px solid var(--border)",
            borderRadius: 16,
            padding:      "28px 32px",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width:        64,
              height:       64,
              borderRadius: "50%",
              background:   "var(--bg-input)",
              border:       "2px solid var(--border)",
              overflow:     "hidden",
              marginBottom: 14,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/profile.jpg" alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* Address + Tier badge inline */}
          <div className="flex items-center justify-center gap-2 mb-0">
            <span
              className="font-mono text-sm font-medium truncate"
              style={{ color: "var(--text-primary)", maxWidth: 180 }}
              title={address}
            >
              {address ? `${address.slice(0, 6)}...${address.slice(-6)}` : ""}
            </span>
            <div
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shrink-0"
              style={{
                background: `${badge.color}22`,
                color:      badge.color,
                border:     `1px solid ${badge.color}44`,
              }}
            >
              {badge.emoji} {badge.label}
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
        <div className="mb-4 flex gap-1.5 p-1 rounded-xl border border-[--border] bg-[--bg-card] w-full">
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
            <div className="grid grid-cols-[1fr_60px_80px_28px] sm:grid-cols-[1fr_60px_90px_100px_28px] gap-2 px-4 py-2.5 border-b border-[--border] text-[11px] font-bold uppercase tracking-wide text-[--text-secondary]">
              <div>Transaction</div>
              <div className="text-right">Pts</div>
              <div className="text-right">Time</div>
              <div className="text-right hidden sm:block">Status</div>
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
              pageSwaps.map((s) => {
                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-[1fr_60px_80px_28px] sm:grid-cols-[1fr_60px_90px_100px_28px] gap-2 px-4 py-3 border-b border-[--border] last:border-0 items-center"
                  >
                    {/* Transaction: token pair */}
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border border-[--border] overflow-hidden max-w-full">
                        <TokenDisplay address={s.token_in} />
                        <span className="text-[--text-secondary] text-xs shrink-0">→</span>
                        <TokenDisplay address={s.token_out} />
                      </div>
                    </div>
                    {/* Points */}
                    <div className="text-right text-xs font-bold" style={{ color: "#C9693A" }}>
                      +{s.score_earned}
                    </div>
                    {/* Time */}
                    <div className="text-right">
                      <div className="text-xs font-semibold text-[--text-primary]">
                        {timeAgo(s.created_at)}
                      </div>
                      <div className="text-[10px] text-[--text-secondary] mt-0.5 hidden sm:block">
                        {new Date(s.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                      </div>
                    </div>
                    {/* Status — hidden on mobile */}
                    <div className="hidden sm:flex justify-end">
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
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 px-4 py-2.5 border-t border-[--border] flex-wrap">
                <button
                  onClick={() => goHistoryPage(safePage - 1)}
                  disabled={safePage === 1}
                  className="rounded-lg border border-[--border] bg-[--bg-input] px-3 py-1.5 text-xs font-semibold text-[--text-secondary] disabled:opacity-40 hover:border-[#C9693A]/50 transition-all"
                >
                  ← Prev
                </button>
                {historyPageNumbers().map((p, i) =>
                  p === "…" ? (
                    <span key={`e-${i}`} className="px-1 text-[--text-secondary] text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goHistoryPage(p as number)}
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
                  onClick={() => goHistoryPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="rounded-lg border border-[--border] bg-[--bg-input] px-3 py-1.5 text-xs font-semibold text-[--text-secondary] disabled:opacity-40 hover:border-[#C9693A]/50 transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Referral tab ──────────────────────────────────── */}
        {tab === "referral" && <ReferralView address={address} />}

        </div>{/* end shared container */}
      </main>
      <MobileNav />
    </>
  );
}
