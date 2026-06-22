"use client";

import { useState } from "react";
import { useSwapExecute } from "./useSwapExecute";
import { parseUnits }     from "viem";
import { toast }          from "sonner";
import { BASE_TOKENS, type Token } from "@/constants/tokens";
import type { SwapQuote } from "@/types/swap";

export interface SwapRow {
  id:       number;
  tokenIn:  Token;
  amountIn: string;
}

export function useMultiSwap(address: `0x${string}` | undefined, slippage: number, tokenOut: Token) {
  const [rows,     setRows]     = useState<SwapRow[]>([{ id: 1, tokenIn: BASE_TOKENS[0], amountIn: "" }]);
  const [executing, setExecuting] = useState(false);
  const [results,   setResults]   = useState<Record<number, "pending" | "success" | "error">>({});
  const { execute } = useSwapExecute();

  function addRow() {
    if (rows.length >= 3) return;
    // Exclude tokenOut AND all already-selected tokenIn addresses
    const used = new Set([tokenOut.address.toLowerCase(), ...rows.map(r => r.tokenIn.address.toLowerCase())]);
    const next  = BASE_TOKENS.find(t => !used.has(t.address.toLowerCase()));
    if (!next) return;
    setRows(prev => [...prev, { id: Date.now(), tokenIn: next, amountIn: "" }]);
  }

  function removeRow(id: number) {
    setRows(prev => prev.filter(r => r.id !== id));
    // Clean up result for removed row
    setResults(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function updateRow(id: number, changes: Partial<SwapRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  }

  async function executeAll(quotes: Record<number, SwapQuote | null>) {
    if (!address) return;
    setExecuting(true);

    // Only process rows that have a valid amount and quote
    const eligible = rows.filter(r => r.amountIn && parseFloat(r.amountIn) > 0 && quotes[r.id]);

    // Mark all eligible as pending up-front
    const initial: Record<number, "pending" | "success" | "error"> = {};
    eligible.forEach(r => { initial[r.id] = "pending"; });
    setResults(initial);

    // Execute sequentially — each swap awaits the previous.
    // INTENTIONAL BEHAVIOR: if one swap fails, the loop continues with the remaining rows.
    // This lets the user swap 3 tokens in one click even if one fails (e.g. insufficient balance).
    // A summary toast is shown at the end so the user knows the overall outcome.
    const final = { ...initial };
    for (const row of eligible) {
      const quote = quotes[row.id]!;
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
          "multi_swap",
        );
        final[row.id] = "success";
      } catch {
        final[row.id] = "error";
      }
      // Update per-row after each swap so UI reflects progress immediately
      setResults({ ...final });
    }

    // Fix 4: Show a summary toast so the user knows the overall result of the multi-swap.
    // Per-row icons in the UI show individual status, but this gives a clear overall signal.
    const successCount = Object.values(final).filter(s => s === "success").length;
    const errorCount   = Object.values(final).filter(s => s === "error").length;
    const total        = eligible.length;

    if (errorCount === 0) {
      toast.success(`All ${total} swap${total > 1 ? "s" : ""} successful!`, { id: "multi-swap-summary" });
    } else if (successCount === 0) {
      toast.error(`All ${total} swap${total > 1 ? "s" : ""} failed`, { id: "multi-swap-summary" });
    } else {
      toast.warning(
        `${successCount}/${total} swap${total > 1 ? "s" : ""} successful — ${errorCount} failed`,
        { id: "multi-swap-summary" },
      );
    }

    setExecuting(false);
  }

  return { rows, addRow, removeRow, updateRow, executing, results, executeAll };
}
