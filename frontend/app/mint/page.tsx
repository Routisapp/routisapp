"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast }          from "sonner";
import { Header }         from "@/components/layout/Header";
import { MobileNav }      from "@/components/layout/MobileNav";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useNFTTier }     from "@/hooks/useNFTTier";
import { addMintScore, upsertUserScore, hasXFollowReward, markXFollowReward } from "@/lib/supabase";
import { NFT_TIERS } from "@/constants/nft-tiers";

const NFT_ABI = [] as const; // kept for type compatibility

// Tier icon SVGs
function TierIcon({ name, active }: { name: string; active: boolean }) {
  const color  = active ? "#C9693A" : "var(--text-secondary)";
  const border = active ? "#C9693A" : "var(--border)";

  const configs: Record<string, { bg: string; emoji: string }> = {
    Bronze:  { bg: "#CD7F32", emoji: "🥉" },
    Silver:  { bg: "#A0A0A0", emoji: "🥈" },
    Gold:    { bg: "#D4A017", emoji: "🥇" },
    Diamond: { bg: "#7B5EA7", emoji: "💎" },
  };

  const cfg = configs[name] ?? configs.Bronze;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex items-center justify-center rounded-2xl transition-all text-2xl"
        style={{
          width: 44, height: 44,
          background: active ? cfg.bg : "var(--bg-input)",
          border: `2px solid ${border}`,
          opacity: active ? 1 : 0.45,
        }}
      >
        {cfg.emoji}
      </div>
      <span className="text-xs font-bold" style={{ color }}>{name}</span>
      <span className="text-[10px]" style={{ color: active ? color : "var(--text-secondary)" }}>
        {NFT_TIERS.find(t => t.name === name)?.requiredScore.toLocaleString("en-US")} pts
      </span>
    </div>
  );
}

// Task row
function TaskRow({ icon, title, desc, pts }: { icon: React.ReactNode; title: string; desc: string; pts: number }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[--border] bg-[--bg-card] px-5 py-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "#C9693A18" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[--text-primary]">{title}</p>
        <p className="text-xs text-[--text-secondary] mt-0.5">{desc}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: "#C9693A15", color: "#C9693A" }}
        >
          +{pts}
        </span>
      </div>
    </div>
  );
}

export default function MintPage() {
  const { address }        = useAccount();
  const { score, mintedTiers, refetchMinted } = useNFTTier(address);
  const [mintingTier, setMintingTier] = useState<number | null>(null);

  // X follow task state
  const [xFollowState,   setXFollowState]   = useState<"idle" | "countdown" | "done">("idle");
  const [xCountdown,     setXCountdown]     = useState(10);
  const [xAlreadyClaimed, setXAlreadyClaimed] = useState(false);

  // Check if already claimed on mount / address change
  useEffect(() => {
    if (!address) return;
    hasXFollowReward(address).then((claimed) => {
      if (claimed) { setXFollowState("done"); setXAlreadyClaimed(true); }
    });
  }, [address]);

  async function handleXFollow() {
    if (!address) { toast.error("Connect your wallet first"); return; }
    if (xFollowState !== "idle") return;

    // Open X profile in new tab
    window.open("https://x.com/RoutisApp", "_blank");

    // Start 10-second countdown
    setXFollowState("countdown");
    setXCountdown(10);
    const interval = setInterval(() => {
      setXCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // After 10s: award points
    setTimeout(async () => {
      try {
        await upsertUserScore(address, { score_delta: 1000 });
        await markXFollowReward(address);
        setXFollowState("done");
        setXAlreadyClaimed(true);
        toast.success("+1000 points! Thanks for following Routis on X 🎉");
        refetchMinted();
      } catch {
        toast.error("Failed to award points — try again");
        setXFollowState("idle");
      }
    }, 10_000);
  }

  const resolvedTiers = address
    ? mintedTiers
    : NFT_TIERS.map((t) => ({ ...t, minted: false, unlocked: false }));

  // Next locked tier
  const nextTier = NFT_TIERS.find(t => score < t.requiredScore) ?? null;
  const ptsToNext = nextTier ? nextTier.requiredScore - score : 0;

  // Progress line: 0 → first tier → last tier
  const maxScore  = NFT_TIERS[NFT_TIERS.length - 1].requiredScore;
  const lineWidth = Math.min((score / maxScore) * 100, 100);

  async function handleMint(tierId: number) {
    if (!address) return;
    setMintingTier(tierId);
    try {
      toast.loading(`Claiming ${NFT_TIERS[tierId].name} badge...`, { id: "mint" });
      await addMintScore(address);
      refetchMinted();
      toast.success(`${NFT_TIERS[tierId].name} badge claimed! +100 points`, { id: "mint" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(`Failed: ${msg}`, { id: "mint" });
    } finally {
      setMintingTier(null);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-6 pb-24 md:pb-10">

        {/* ── Main card ── */}
        <div className="rounded-3xl border border-[--border] bg-[--bg-card] px-6 pt-5 pb-4 mb-5">

          {/* Score row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-[--text-secondary] mb-1">Routis Score</p>
              <p className="text-2xl font-bold text-[--text-primary]">
                {score.toLocaleString("en-US")} <span className="text-lg font-semibold text-[--text-secondary]">pts</span>
              </p>
            </div>
            {nextTier && address && (
              <div className="text-right">
                <p className="text-xs text-[--text-secondary] mb-1">Next reward</p>
                <p className="text-sm font-bold" style={{ color: "#C9693A" }}>
                  {ptsToNext.toLocaleString("en-US")} pts to {nextTier.name}
                </p>
              </div>
            )}
          </div>

          {/* Progress stepper — mint butonlarıyla aynı grid genişliği */}
          <div className="grid grid-cols-4 mb-4">
            {NFT_TIERS.map((tier, i) => {
              const isActive = score >= tier.requiredScore;
              const isLast   = i === NFT_TIERS.length - 1;
              const isFirst  = i === 0;
              return (
                <div key={tier.id} className="flex flex-col items-center">
                  {/* Connector + icon row */}
                  <div className="flex items-center w-full">
                    {/* Left connector */}
                    <div className="flex-1 h-0.5 rounded-full"
                      style={{ background: !isFirst && isActive ? "#C9693A" : !isFirst ? "var(--border)" : "transparent" }}
                    />
                    {/* Icon */}
                    <div
                      className="flex items-center justify-center rounded-xl transition-all shrink-0"
                      style={{
                        width: 36, height: 36,
                        fontSize: 18,
                        background: isActive ? (tier.name === "Bronze" ? "#CD7F32" : tier.name === "Silver" ? "#A0A0A0" : tier.name === "Gold" ? "#D4A017" : "#7B5EA7") : "var(--bg-input)",
                        border: `2px solid ${isActive ? "#C9693A" : "var(--border)"}`,
                        opacity: isActive ? 1 : 0.45,
                      }}
                    >
                      {tier.name === "Bronze" ? "🥉" : tier.name === "Silver" ? "🥈" : tier.name === "Gold" ? "🥇" : "💎"}
                    </div>
                    {/* Right connector */}
                    <div className="flex-1 h-0.5 rounded-full"
                      style={{ background: !isLast && score >= NFT_TIERS[i + 1].requiredScore ? "#C9693A" : !isLast ? "var(--border)" : "transparent" }}
                    />
                  </div>
                  {/* Label below */}
                  <span className="text-[10px] sm:text-xs font-bold mt-1.5" style={{ color: isActive ? "#C9693A" : "var(--text-secondary)" }}>
                    {tier.name}
                  </span>
                  <span className="text-[9px] sm:text-[10px]" style={{ color: isActive ? "#C9693A" : "var(--text-secondary)" }}>
                    {tier.requiredScore.toLocaleString("en-US")} pts
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mint buttons */}
          {address && (
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              {resolvedTiers.map((tier) => {
                const isMinting = mintingTier === tier.id;
                if (tier.minted) {
                  return (
                    <div
                      key={tier.id}
                      className="rounded-xl py-2.5 text-center text-xs font-bold border"
                      style={{ borderColor: "#C9693A55", color: "#C9693A", background: "#C9693A10" }}
                    >
                      Owned ✓
                    </div>
                  );
                }
                if (tier.unlocked) {
                  return (
                    <button
                      key={tier.id}
                      onClick={() => handleMint(tier.id)}
                      disabled={isMinting || !TRADER_NFT_ADDRESS}
                      className="rounded-xl py-2.5 text-xs font-bold border-2 text-[#C9693A] transition-all hover:bg-[#C9693A] hover:text-white disabled:opacity-50"
                      style={{ borderColor: "#C9693A" }}
                    >
                      {isMinting ? <LoadingSpinner size={11} color="#C9693A" /> : "Mint"}
                    </button>
                  );
                }
                return (
                  <div
                    key={tier.id}
                    className="rounded-xl py-2.5 text-center text-xs font-semibold border text-[--text-secondary]"
                    style={{ borderColor: "var(--border)", background: "var(--bg-input)" }}
                  >
                    Locked
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Görevler ── */}
        <p className="text-sm font-bold text-[--text-primary] mb-3">Tasks</p>
        <div className="space-y-3">

          {/* X Follow Task */}
          <div className="flex items-center gap-4 rounded-2xl border border-[--border] bg-[--bg-card] px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#C9693A18" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#C9693A">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[--text-primary]">Follow Routis on X</p>
              <p className="text-xs text-[--text-secondary] mt-0.5">
                {xFollowState === "countdown"
                  ? `Verifying in ${xCountdown}s…`
                  : xAlreadyClaimed
                  ? "Reward claimed ✓"
                  : "Follow @RoutisApp and earn points"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "#C9693A15", color: "#C9693A" }}>
                +1000
              </span>
              {!xAlreadyClaimed && (
                <button
                  onClick={handleXFollow}
                  disabled={!address || xFollowState === "countdown"}
                  className="rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: xFollowState === "countdown" ? "#8b8fa8" : "#C9693A" }}
                >
                  {xFollowState === "countdown" ? `${xCountdown}s` : "Follow"}
                </button>
              )}
              {xAlreadyClaimed && null}
            </div>
          </div>
          <TaskRow
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/>
              </svg>
            }
            title="Make 1 swap"
            desc="For each completed swap"
            pts={100}
          />
          <TaskRow
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
            }
            title="Make 1 Multi Swap"
            desc="For each completed Multi Swap"
            pts={150}
          />
          <TaskRow
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="13" rx="2"/>
                <path d="M8 11h.01M12 11h.01M16 11h.01"/>
                <path d="M12 7V4"/><circle cx="12" cy="3" r="1"/>
              </svg>
            }
            title="Swap with AI Agent"
            desc="For each transaction approved via x402"
            pts={250}
          />
          <TaskRow
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            }
            title="Trade 7 days in a row"
            desc="When a continuous weekly streak is completed"
            pts={500}
          />
        </div>

      </main>
      <MobileNav />
    </>
  );
}
