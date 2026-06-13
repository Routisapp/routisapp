"use client";

import { useState } from "react";
import { useSendTransaction } from "wagmi";
import { encodeFunctionData, parseAbi } from "viem";

const WETH = "0x4200000000000000000000000000000000000006" as const;

const WETH_ABI = parseAbi([
  "function deposit() payable",
  "function withdraw(uint256 wad)",
]);

export function useWethWrap() {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const { sendTransactionAsync } = useSendTransaction();

  async function wrap(amountIn: bigint) {
    setStatus("pending");
    try {
      const hash = await sendTransactionAsync({
        to:    WETH,
        value: amountIn,
        data:  encodeFunctionData({ abi: WETH_ABI, functionName: "deposit" }),
        gas:   50000n,
      });
      setStatus("success");
      return hash;
    } catch (e) {
      setStatus("idle");
      throw e;
    }
  }

  async function unwrap(amountIn: bigint) {
    setStatus("pending");
    try {
      const hash = await sendTransactionAsync({
        to:   WETH,
        data: encodeFunctionData({
          abi:          WETH_ABI,
          functionName: "withdraw",
          args:         [amountIn],
        }),
        gas: 50000n,
      });
      setStatus("success");
      return hash;
    } catch (e) {
      setStatus("idle");
      throw e;
    }
  }

  return { wrap, unwrap, status };
}
