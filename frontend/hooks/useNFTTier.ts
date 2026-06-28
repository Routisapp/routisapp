"use client";

import { useQuery }         from "@tanstack/react-query";
import { fetchUserScore, getMintedTiers } from "@/lib/supabase";
import { getTierFromScore } from "@/lib/utils";
import { NFT_TIERS }        from "@/constants/nft-tiers";

export function useNFTTier(address: `0x${string}` | undefined) {
  const { data: userScore } = useQuery({
    queryKey: ["user-score", address],
    queryFn:  () => fetchUserScore(address!),
    enabled:  !!address,
  });

  const { data: mintedSet = new Set<number>(), refetch: refetchMinted } = useQuery({
    queryKey: ["minted-tiers", address],
    queryFn:  () => getMintedTiers(address!),
    enabled:  !!address,
  });

  const score       = userScore?.score ?? 0;
  const currentTier = getTierFromScore(score);

  const mintedTiers = NFT_TIERS.map((tier) => ({
    ...tier,
    minted:   mintedSet.has(tier.id),
    unlocked: score >= tier.requiredScore,
  }));

  return { score, currentTier, mintedTiers, userScore, refetchMinted };
}
