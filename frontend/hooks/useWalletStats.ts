"use client";

import { useQuery } from "@tanstack/react-query";
import type { WalletStats } from "@/app/api/wallet-stats/route";

export type { WalletStats };

export function useWalletStats(address: string | undefined) {
  const query = useQuery<WalletStats>({
    queryKey: ["wallet-stats", address?.toLowerCase()],
    queryFn:  async () => {
      const res = await fetch(`/api/wallet-stats?address=${address}`);
      if (!res.ok) throw new Error("Failed to load wallet stats");
      return res.json();
    },
    enabled:   !!address,
    staleTime: 10_000,
    gcTime:    30_000,
    retry:     1,
  });

  return {
    ...query,
    // TanStack Query v5: isLoading = isPending && isFetching (no cached data yet)
    isLoading: query.isPending && query.isFetching,
  };
}
