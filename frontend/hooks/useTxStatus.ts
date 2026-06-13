"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";

export type TxStatus = "pending" | "success" | "failed";

interface TxState {
  status:       TxStatus;
  errorReason?: string;
}

/**
 * Polls Base mainnet for tx receipt every 3 seconds.
 * Returns status: pending → success | failed
 */
export function useTxStatus(txHash: string | undefined): TxState {
  const [state, setState] = useState<TxState>({ status: "pending" });
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!txHash || !publicClient) return;
    setState({ status: "pending" });

    let stopped = false;

    async function poll() {
      while (!stopped) {
        try {
          const receipt = await publicClient!.getTransactionReceipt({
            hash: txHash as `0x${string}`,
          });
          if (receipt) {
            if (receipt.status === "success") {
              setState({ status: "success" });
            } else {
              setState({ status: "failed", errorReason: "Reverted on-chain" });
            }
            return;
          }
        } catch { /* not mined yet */ }
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    poll();
    return () => { stopped = true; };
  }, [txHash, publicClient]);

  return state;
}
