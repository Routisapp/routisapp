"use client";

import { useQuery } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { useDebounce } from "./useDebounce";
import type { SwapQuote } from "@/types/swap";

interface UseSwapQuotesParams {
  tokenIn:     string | null;
  tokenOut:    string | null;
  amountIn:    string;
  decimalsIn:  number;
  decimalsOut: number;
  enabled:     boolean;
}

interface QuoteResponse {
  quotes: Array<{
    dex:                string;
    dexName:            string;
    amountOut:          string;
    amountOutFormatted: string;
    priceImpact:        number;
    estimatedGas:       string;
    estimatedGasUsd:    number;
    routePath:          string[];
    fee:                number;
  }>;
  count: number;
}

export function useSwapQuotes({
  tokenIn,
  tokenOut,
  amountIn,
  decimalsIn,
  decimalsOut,
  enabled,
}: UseSwapQuotesParams) {
  const debouncedAmount = useDebounce(amountIn, 500);

  return useQuery({
    queryKey: ["swap-quotes", tokenIn, tokenOut, debouncedAmount, decimalsIn, decimalsOut],
    enabled:
      enabled &&
      !!tokenIn &&
      !!tokenOut &&
      !!debouncedAmount &&
      parseFloat(debouncedAmount) > 0,
    queryFn: async (): Promise<SwapQuote[]> => {
      const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      const WETH       = "0x4200000000000000000000000000000000000006";

      const normalized = debouncedAmount.replace(",", ".");
      const amountInWei = parseUnits(normalized, decimalsIn).toString();
      const params = new URLSearchParams({
        tokenIn:     (tokenIn  === NATIVE_ETH ? WETH : tokenIn)!,
        tokenOut:    (tokenOut === NATIVE_ETH ? WETH : tokenOut)!,
        amountIn:    amountInWei,
        decimalsIn:  String(decimalsIn),
        decimalsOut: String(decimalsOut),
      });

      const res = await fetch(`/api/quote?${params.toString()}`);
      if (!res.ok) throw new Error("Quote fetch failed");

      const data: QuoteResponse = await res.json();

      // Deserialize bigints from JSON strings
      return data.quotes.map((q) => ({
        ...q,
        dex:          q.dex as SwapQuote["dex"],
        amountOut:    BigInt(q.amountOut),
        estimatedGas: BigInt(q.estimatedGas),
      }));
    },
    staleTime:          10_000,
    refetchInterval:    15_000,
    retry:              1,
  });
}
