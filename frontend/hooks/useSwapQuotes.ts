"use client";

import { useQuery }      from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { parseUnits }    from "viem";
import { useDebounce }   from "./useDebounce";
import { getOnchainQuotes } from "@/lib/onchainQuote";
import type { SwapQuote }   from "@/types/swap";

interface UseSwapQuotesParams {
  tokenIn:     string | null;
  tokenOut:    string | null;
  amountIn:    string;
  decimalsIn:  number;
  decimalsOut: number;
  enabled:     boolean;
}

export function useSwapQuotes({
  tokenIn,
  tokenOut,
  amountIn,
  decimalsIn,
  decimalsOut,
  enabled,
}: UseSwapQuotesParams) {
  const debouncedAmount = useDebounce(amountIn, 400);
  // Use wagmi's public client — already connected to Base, no CORS issues
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["swap-quotes-onchain", tokenIn, tokenOut, debouncedAmount, decimalsIn, decimalsOut],
    enabled:
      enabled &&
      !!tokenIn &&
      !!tokenOut &&
      !!debouncedAmount &&
      !!publicClient &&
      parseFloat(debouncedAmount.replace(",", ".")) > 0,
    queryFn: async (): Promise<SwapQuote[]> => {
      const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      const WETH       = "0x4200000000000000000000000000000000000006";

      const normalized  = debouncedAmount.replace(",", ".");
      const amountInWei = parseUnits(normalized, decimalsIn);

      return getOnchainQuotes(publicClient!, {
        tokenIn:     (tokenIn  === NATIVE_ETH ? WETH : tokenIn)!,
        tokenOut:    (tokenOut === NATIVE_ETH ? WETH : tokenOut)!,
        amountIn:    amountInWei,
        decimalsIn,
        decimalsOut,
      });
    },
    staleTime:       10_000,
    refetchInterval: 15_000,
    retry:           1,
  });
}
