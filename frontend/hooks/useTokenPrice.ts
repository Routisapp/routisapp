"use client";

import { useQuery } from "@tanstack/react-query";

const COINGECKO_IDS: Record<string, string> = {
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": "ethereum",
  "0x4200000000000000000000000000000000000006": "ethereum", // WETH
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": "usd-coin",
  "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb": "dai",
  "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA": "usd-coin",
  "0x940181a94A35A4569E4529a3CDfB74e38FD98631": "aerodrome-finance",
  "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf": "coinbase-wrapped-btc",
  "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22": "coinbase-wrapped-staked-eth",
};

export function useTokenPrices(addresses: string[]) {
  const ids = [...new Set(addresses.map(a => COINGECKO_IDS[a]).filter(Boolean))];

  return useQuery({
    queryKey: ["token-prices", ids.join(",")],
    enabled:  ids.length > 0,
    queryFn:  async (): Promise<Record<string, number>> => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
        { next: { revalidate: 60 } } as RequestInit,
      );
      if (!res.ok) return {};
      const data = await res.json() as Record<string, { usd: number }>;
      const result: Record<string, number> = {};
      for (const [addr, id] of Object.entries(COINGECKO_IDS)) {
        if (data[id]) result[addr.toLowerCase()] = data[id].usd;
      }
      return result;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
