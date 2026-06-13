"use client";

import { useState } from "react";
import { useSwapQuotes } from "./useSwapQuotes";
import { useSwapExecute } from "./useSwapExecute";
import { useTokenBalance } from "./useTokenBalance";
import { parseUnits, formatUnits } from "viem";
import { BASE_TOKENS, type Token } from "@/constants/tokens";
import type { SwapQuote } from "@/types/swap";

export interface SwapRow {
  id:       number;
  tokenIn:  Token;
  amountIn: string;
}

const USDC = BASE_TOKENS[2];

export function useMultiSwap(address: `0x${string}` | undefined, slippage: number, tokenOut: Token) {
  const [rows, setRows] = useState<SwapRow[]>([
    { id: 1, tokenIn: BASE_TOKENS[0], amountIn: "" },
  ]);
  const [executing,    setExecuting]    = useState(false);
  const [results,      setResults]      = useState<Record<number, "pending" | "success" | "error">>({});
  const { execute } = useSwapExecute();

  function addRow() {
    if (rows.length >= 3) return;
    const usedAddresses = rows.map(r => r.tokenIn.address);
    const next = BASE_TOKENS.find(t => !usedAddresses.includes(t.address) && t.address !== tokenOut.address);
    if (!next) return;
    setRows(prev => [...prev, { id: Date.now(), tokenIn: next, amountIn: "" }]);
  }

  function removeRow(id: number) {
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function updateRow(id: number, changes: Partial<SwapRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  }

  async function executeAll(quotes: Record<number, SwapQuote | null>) {
    if (!address) return;
    setExecuting(true);
    const newResults: Record<number, "pending" | "success" | "error"> = {};

    for (const row of rows) {
      const quote = quotes[row.id];
      if (!quote || !row.amountIn || parseFloat(row.amountIn) === 0) continue;
      newResults[row.id] = "pending";
      setResults({ ...newResults });
      try {
        const amountInWei = parseUnits(row.amountIn.replace(",", "."), row.tokenIn.decimals);
        await execute(
          {
            quote,
            tokenIn:     row.tokenIn.address,
            tokenOut:    tokenOut.address,
            amountIn:    amountInWei,
            slippage,
            recipient:   address,
            decimalsIn:  row.tokenIn.decimals,
            decimalsOut: tokenOut.decimals,
          },
          address,
        );
        newResults[row.id] = "success";
      } catch {
        newResults[row.id] = "error";
      }
      setResults({ ...newResults });
    }
    setExecuting(false);
  }

  return { rows, addRow, removeRow, updateRow, executing, results, executeAll };
}
