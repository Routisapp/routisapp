"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast }         from "sonner";
import { Header }        from "@/components/layout/Header";
import { MobileNav }     from "@/components/layout/MobileNav";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useNFTTier }    from "@/hooks/useNFTTier";
import { addMintScore }  from "@/lib/supabase";
import { NFT_TIERS, TRADER_NFT_ADDRESS } from "@/constants/nft-tiers";
import { basescanTx }    from "@/lib/utils";

// Tier colors mapped to warm palette
const TIER_BUTTON_COLORS: Record<number, string> = {
  0: "#C9693A",  // Bronze → terra cotta
  1: "#8C7B6E",  // Silver → warm gray
  2: "#B8860B",  // Gold → dark gold
  3: "#7B5EA7",  // Diamond → mat purple
};

const NFT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tierId", type: "uint256" }],
    outputs: [],
  },
] as const;

export default function MintPage() {
  const { address }        = useAccount();
  const { score, mintedTiers } = useNFTTier(address);
  const { writeContractAsync } = useWriteContract();
  const [mintingTier, setMintingTier] = useState<number | null>(null);
  const [txHash,      setTxHash]      = useState<`0x${string}` | undefined>();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  async function handleMint(tierId: number) {
    if (!address || !TRADER_NFT_ADDRESS) return;
    setMintingTier(tierId);
    try {
      toast.loading(`Minting ${NFT_TIERS[tierId].name} NFT...`, { id: "mint" });
      const hash = await writeContractAsync({
        address:      TRADER_NFT_ADDRESS,
        abi:          NFT_ABI,
        functionName: "mint",
        args:         [BigInt(tierId)],
      });
      setTxHash(hash);
      await addMintScore(address).catch(console.error);
      toast.success("NFT minted! +100 points", {
        id:     "mint",
        action: { label: "View", onClick: () => window.open(basescanTx(hash)) },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.toLowerCase().includes("user rejected") ? "Transaction rejected" : "Mint failed",
        { id: "mint" },
      );
    } finally {
      setMintingTier(null);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-10 pb-24 md:pb-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-[--text-primary]">
            Mint Your <span className="text-[--accent-blue]">Trader NFT</span>
          </h1>
          <p className="mt-2 text-sm text-[--text-secondary]">
            Earn points by swapping, then mint an NFT reflecting your tier.
          </p>
        </div>

        {/* Score card */}
        {address && (
          <div className="mb-6 rounded-xl border border-[--border] bg-[--bg-card] p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[--text-secondary] mb-1">Your Score</p>
              <p className="text-2xl font-black text-[--accent-blue]">{score}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[--text-secondary] mb-1">Mint +100 pts each NFT</p>
              <p className="text-sm font-semibold" style={{ color: "#C9693A" }}>Keep swapping to unlock!</p>
            </div>
          </div>
        )}

        {!address ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="mb-6 w-full rounded-xl bg-[--accent-blue] py-3.5 text-sm font-bold text-white hover:brightness-110 transition-all"
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        ) : null}

        {/* Tier cards */}
        <div className="space-y-3">
          {(address ? mintedTiers : NFT_TIERS.map((t) => ({ ...t, minted: false, unlocked: false }))).map((tier) => {
            const isMinting = mintingTier === tier.id && isConfirming;
            return (
              <div
                key={tier.id}
                className={`rounded-xl border p-4 transition-all ${
                  tier.unlocked
                    ? "border-[--border] bg-[--bg-card]"
                    : "border-[--border] bg-[--bg-card] opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                      style={{ background: `${TIER_BUTTON_COLORS[tier.id] ?? "#C9693A"}22`, border: `1px solid ${TIER_BUTTON_COLORS[tier.id] ?? "#C9693A"}44` }}
                    >
                      {tier.minted ? "✓" : tier.unlocked ? "🏅" : "🔒"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[--text-primary]">{tier.name}</span>
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ background: `${TIER_BUTTON_COLORS[tier.id] ?? "#C9693A"}22`, color: TIER_BUTTON_COLORS[tier.id] ?? "#C9693A" }}
                        >
                          {tier.requiredScore}+ pts
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-[--text-secondary]">
                        {tier.benefits.join(" · ")}
                      </div>
                    </div>
                  </div>

                  {address && tier.unlocked && !tier.minted && (
                    <button
                      onClick={() => handleMint(tier.id)}
                      disabled={isMinting || !TRADER_NFT_ADDRESS}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 transition-all hover:brightness-110"
                      style={{ background: TIER_BUTTON_COLORS[tier.id] ?? "#C9693A" }}
                    >
                      {isMinting ? <LoadingSpinner size={12} color="white" /> : null}
                      {isMinting ? "Minting..." : "Mint"}
                    </button>
                  )}

                  {tier.minted && (
                    <span className="rounded-lg border px-3 py-2 text-xs font-bold"
                      style={{ borderColor: `${TIER_BUTTON_COLORS[tier.id] ?? "#C9693A"}66`, color: TIER_BUTTON_COLORS[tier.id] ?? "#C9693A" }}
                    >
                      Owned ✓
                    </span>
                  )}

                  {address && !tier.unlocked && (
                    <span className="text-xs text-[--text-secondary]">
                      {tier.requiredScore - score} pts to unlock
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <MobileNav />
    </>
  );
}
