"use client";

import { useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { NATIVE_ETH } from "@/constants/tokens";

export function useTokenBalance(address: `0x${string}` | undefined, tokenAddress: string) {
  const isNative = tokenAddress === NATIVE_ETH;

  const native = useBalance({
    address,
    query: {
      enabled:         !!address && isNative,
      refetchInterval: 10_000, // refresh every 10s
    },
  });

  const token = useReadContract({
    address:      tokenAddress as `0x${string}`,
    abi:          erc20Abi,
    functionName: "balanceOf",
    args:         address ? [address] : undefined,
    query: {
      enabled:         !!address && !isNative,
      refetchInterval: 10_000, // refresh every 10s
    },
  });

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
