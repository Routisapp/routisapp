"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi, maxUint256 } from "viem";
import { toast } from "sonner";
import { NATIVE_ETH } from "@/constants/tokens";

export function useTokenApproval(
  tokenAddress: string,
  spender: string,
  amount: bigint,
  ownerAddress: `0x${string}` | undefined,
) {
  const isNative = tokenAddress === NATIVE_ETH;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:      tokenAddress as `0x${string}`,
    abi:          erc20Abi,
    functionName: "allowance",
    args:         ownerAddress ? [ownerAddress, spender as `0x${string}`] : undefined,
    query: {
      enabled:
        !!ownerAddress &&
        !isNative &&
        spender !== "0x0000000000000000000000000000000000000000" &&
        spender !== "0x0",
    },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const needsApproval =
    !isNative &&
    spender !== "0x0000000000000000000000000000000000000000" &&
    spender !== "0x0" &&
    (allowance === undefined || allowance < amount);

  async function approve() {
    if (isNative) return;
    try {
      toast.loading("Approving token...", { id: "approve" });
      const hash = await writeContractAsync({
        address:      tokenAddress as `0x${string}`,
        abi:          erc20Abi,
        functionName: "approve",
        args:         [spender as `0x${string}`, maxUint256],
      });
      setApproveTxHash(hash);
      toast.success("Token approved", { id: "approve" });
      await refetchAllowance();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approve failed";
      toast.error(msg.includes("User rejected") ? "Transaction rejected" : "Approval failed", { id: "approve" });
      throw err;
    }
  }

  return { needsApproval, approve, isApproving: isPending || isConfirming, allowance };
}
