"use client";

import { useEffect, useRef } from "react";
import { useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { NATIVE_ETH } from "@/constants/tokens";

export function useTokenBalance(address: `0x${string}` | undefined, tokenAddress: string) {
  const isNative = tokenAddress === NATIVE_ETH;
  const lastRefetchRef = useRef<number>(0);

  const native = useBalance({
    address,
    query: {
      enabled:         !!address && isNative,
      refetchInterval: 2_000, // refresh every 2s (faster)
      staleTime:       1_000, // Consider data stale after 1s
    },
  });

  const token = useReadContract({
    address:      tokenAddress as `0x${string}`,
    abi:          erc20Abi,
    functionName: "balanceOf",
    args:         address ? [address] : undefined,
    query: {
      enabled:         !!address && !isNative,
      refetchInterval: 2_000, // refresh every 2s (faster)
      staleTime:       1_000, // Consider data stale after 1s
    },
  });

  // Aggressive refetch on mount and visibility change
  useEffect(() => {
    if (!address) return;
    
    const now = Date.now();
    // Throttle to prevent too many refetches
    if (now - lastRefetchRef.current < 1000) return;
    lastRefetchRef.current = now;

    // Initial refetch on mount
    if (isNative) {
      native.refetch();
    } else {
      token.refetch();
    }

    // Refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastRefetchRef.current < 1000) return;
        lastRefetchRef.current = now;
        
        if (isNative) {
          native.refetch();
        } else {
          token.refetch();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [address, tokenAddress, isNative]);

  if (isNative) {
    return {
      balance:   native.data?.value ?? 0n,
      formatted: native.data?.formatted ?? "0",
      decimals:  18,
      isLoading: native.isLoading,
      refetch:   native.refetch,
    };
  }

  return {
    balance:   (token.data as bigint | undefined) ?? 0n,
    formatted: "0",
    decimals:  18,
    isLoading: token.isLoading,
    refetch:   token.refetch,
  };
}
