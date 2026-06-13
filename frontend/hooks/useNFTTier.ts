"use client";

import { useReadContract } from "wagmi";
import { useQuery }        from "@tanstack/react-query";
import { fetchUserScore }  from "@/lib/supabase";
import { getTierFromScore } from "@/lib/utils";
import { NFT_TIERS, TRADER_NFT_ADDRESS } from "@/constants/nft-tiers";

const NFT_ABI = [
  {
    name: "hasMinted",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user",   type: "address" },
      { name: "tierId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "userScores",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function useNFTTier(address: `0x${string}` | undefined) {
  const { data: userScore } = useQuery({
    queryKey: ["user-score", address],
    queryFn:  () => fetchUserScore(address!),
    enabled:  !!address,
  });

  const score      = userScore?.score ?? 0;
  const currentTier = getTierFromScore(score);

  // Check minted status for each tier
  const mintedChecks = NFT_TIERS.map((tier) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({
      address:      TRADER_NFT_ADDRESS || ("0x0000000000000000000000000000000000000000" as `0x${string}`),
      abi:          NFT_ABI,
      functionName: "hasMinted",
      args:         address ? [address, BigInt(tier.id)] : undefined,
      query:        { enabled: !!address && !!TRADER_NFT_ADDRESS },
    }),
  );

  const mintedTiers = NFT_TIERS.map((tier, i) => ({
    ...tier,
    minted:    (mintedChecks[i].data as boolean | undefined) ?? false,
    unlocked:  score >= tier.requiredScore,
  }));

  return { score, currentTier, mintedTiers, userScore };
}
