"use client";

import { useState, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits } from "viem";
import { base } from "wagmi/chains";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TokenSelector }  from "./TokenSelector";
import { SlippageSettings } from "./SlippageSettings";
import { useSwapQuotes }  from "@/hooks/useSwapQuotes";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useMultiSwap, type SwapRow } from "@/hooks/useMultiSwap";
import { useTokenPrices } from "@/hooks/useTokenPrice";
import { formatInputAmount } from "@/lib/utils";
import { BASE_TOKENS } from "@/constants/tokens";
import type { SwapQuote } from "@/types/swap";
import type { Token } from "@/constants/tokens";

// ── Single input row ──────────────────────────────────────────
function SwapRowItem({
  row, address, slippage, tokenOut, prices, onUpdate, onRemove, canRemove, onQuote, onInsufficient, result, excludeAddresses,
}: {
  row: SwapRow; address: `0x${string}` | undefined; slippage: number;
  tokenOut: Token; prices: Record<string, number>;
  onUpdate: (c: Partial<SwapRow>) => void; onRemove: () => void;
  canRemove: boolean; onQuote: (id: number, q: SwapQuote | null) => void;
  onInsufficient: (id: number, insufficient: boolean) => void;
  result: "pending" | "success" | "error" | undefined;
  excludeAddresses: string[];
}) {
  const { balance } = useTokenBalance(address, row.tokenIn.address);

  const { data: quotes = [], isLoading } = useSwapQuotes({
    tokenIn:     row.tokenIn.address,
    tokenOut:    tokenOut.address,
    amountIn:    row.amountIn,
    decimalsIn:  row.tokenIn.decimals,
    decimalsOut: tokenOut.decimals,
    enabled:     !!row.amountIn && parseFloat(row.amountIn) > 0 && row.tokenIn.address !== tokenOut.address,
  });

  const bestQuote = quotes[0] ?? null;

  // Report quote to parent via useEffect — avoids side-effect-in-render
  useEffect(() => {
    onQuote(row.id, bestQuote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestQuote?.amountOutFormatted, row.id]);

  const amountInWei = row.amountIn
    ? (() => { try { return parseUnits(row.amountIn.replace(",", "."), row.tokenIn.decimals); } catch { return 0n; } })()
    : 0n;

  const isInsufficient = address ? (amountInWei > 0n && amountInWei > balance) : false;

  // Report insufficient state to parent
  useEffect(() => {
    onInsufficient(row.id, isInsufficient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInsufficient, row.id]);
  const balanceFmt     = formatInputAmount(balance, row.tokenIn.decimals);
  const exactBal       = formatInputAmount(balance, row.tokenIn.decimals);

  function setPct(pct: number) {
    if (balance === 0n) return;
    if (pct === 1.0) {
      onUpdate({ amountIn: exactBal });
    } else {
      const raw = (balance * BigInt(Math.round(pct * 10000))) / 10000n;
      onUpdate({ amountIn: formatInputAmount(raw, row.tokenIn.decimals) });
    }
  }

  return (
    <div className={`rounded-xl border p-2.5 bg-[--bg-input] transition-colors ${isInsufficient ? "border-[--accent-red]/50" : "border-[--border]"}`}>
      {/* Header: You pay label + balance */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[--text-secondary]">You pay</span>
        {address && (
          <span className="text-xs text-[--text-secondary]">
            Balance: <span className="text-[--text-primary] font-semibold">{balanceFmt}</span>
          </span>
        )}
      </div>

      {/* Amount input + token selector + remove */}
      <div className="flex items-center gap-2 mb-1.5">
        <input
          type="number" placeholder="0.0" value={row.amountIn}
          onChange={(e) => onUpdate({ amountIn: e.target.value.replace(",", ".") })}
          className={`flex-1 bg-transparent text-xl font-bold outline-none placeholder:text-[--text-secondary] min-w-0 ${isInsufficient ? "text-[--accent-red]" : "text-[--text-primary]"}`}
        />
        <TokenSelector selected={row.tokenIn} onSelect={(t) => onUpdate({ tokenIn: t, amountIn: "" })} excludeMany={excludeAddresses} label="token" />
        {canRemove && (
          <button onClick={onRemove} className="text-[--text-secondary] hover:text-[--accent-red] text-sm shrink-0 ml-1">✕</button>
        )}
      </div>

      {/* PCT buttons */}
      {address && (
        <div className="flex gap-1 mb-1.5">
          {[["25%", 0.25], ["50%", 0.50], ["75%", 0.75], ["100%", 1.00]].map(([label, pct]) => (
            <button key={label as string} onClick={() => setPct(pct as number)}
              className="flex-1 rounded-full bg-[--bg-card] border border-[--border] py-0 text-[10px] font-semibold text-[--text-secondary] hover:text-[--text-primary] hover:border-[--accent-blue] transition-all leading-5">
              {label as string}
            </button>
          ))}
        </div>
      )}
      {/* Status icons only (no quote amount — shown in You receive box) */}
      {(result === "pending" || result === "success" || result === "error" || (row.amountIn && !bestQuote && !isLoading)) && (
        <div className="flex items-center gap-1 text-[11px] text-[--text-secondary]">
          {isLoading && <LoadingSpinner size={10} />}
          {result === "pending" && <LoadingSpinner size={12} />}
          {result === "success" && <span style={{ color: "#C9693A" }} className="ml-1">✓</span>}
          {result === "error"   && <span className="text-[--accent-red] ml-1">✗</span>}
          {!isLoading && !bestQuote && row.amountIn && <span>No route ⚠️</span>}
        </div>
      )}
    </div>
  );
}

// ── Main Multi Swap Card ──────────────────────────────────────
export function MultiSwapCard({ slippage: externalSlippage }: { slippage?: number }) {
  const { address, chainId } = useAccount();
  const { switchChain }      = useSwitchChain();
  const [tokenOut, setTokenOut] = useState<Token>(BASE_TOKENS[1]);
  const [slippage, setSlippage] = useState(externalSlippage ?? 0.5);

  const { rows, addRow, removeRow, updateRow, executing, results, executeAll } = useMultiSwap(address, slippage, tokenOut);

  const { balance: balanceOut } = useTokenBalance(address, tokenOut.address);
  const allAddresses = [...rows.map(r => r.tokenIn.address), tokenOut.address];
  const { data: prices = {} } = useTokenPrices(allAddresses);

  const [quotesMap, setQuotesMap] = useState<Record<number, SwapQuote | null>>({});
  const handleQuote = (id: number, q: SwapQuote | null) => {
    setQuotesMap(prev => {
      if (prev[id] === q) return prev;
      if (prev[id]?.amountOutFormatted === q?.amountOutFormatted) return prev;
      return { ...prev, [id]: q };
    });
  };

  const [insufficientMap, setInsufficientMap] = useState<Record<number, boolean>>({});
  const handleInsufficient = (id: number, insufficient: boolean) => {
    setInsufficientMap(prev => prev[id] === insufficient ? prev : { ...prev, [id]: insufficient });
  };

  const hasInsufficient = Object.values(insufficientMap).some(Boolean);
  const canExecute = rows.some(r => r.amountIn && parseFloat(r.amountIn) > 0) && !hasInsufficient;
  const isWrongChain = !!address && chainId !== base.id;

  // Total USD input value
  const totalUsd = rows.reduce((sum, row) => {
    const price = prices[row.tokenIn.address.toLowerCase()] ?? 0;
    const amt   = parseFloat(row.amountIn || "0");
    return sum + price * amt;
  }, 0);

  // Total output
  const totalOut = rows.reduce((sum, row) => {
    const q = quotesMap[row.id];
    return sum + (q ? parseFloat(q.amountOutFormatted) : 0);
  }, 0);

  // Min received with slippage (kept for potential future use)
  const priceOut = prices[tokenOut.address.toLowerCase()] ?? 0;
  const totalOutUsd = priceOut > 0 && totalOut > 0 ? totalOut * priceOut : 0;

  return (
    <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-3 shadow-2xl w-full max-w-md">
      {/* Header — slippage settings + Add token */}
      <div className="mb-3 flex items-center justify-between">
        {rows.length < 3 ? (
          <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-[--text-secondary] hover:text-[--text-primary] transition-all py-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
            </svg>
            Add token (Max 3)
          </button>
        ) : <div />}
        <SlippageSettings value={slippage} onChange={setSlippage} />
      </div>

      {/* Input rows */}
      <div className="space-y-2 mb-2">
          {rows.map((row) => (
            <SwapRowItem
              key={row.id} row={row} address={address} slippage={slippage}
              tokenOut={tokenOut} prices={prices}
              onUpdate={(c) => updateRow(row.id, c)}
              onRemove={() => removeRow(row.id)}
              canRemove={rows.length > 1}
              onQuote={handleQuote}
              onInsufficient={handleInsufficient}
              result={results[row.id]}
              excludeAddresses={[
                tokenOut.address,
                ...rows.filter(r => r.id !== row.id).map(r => r.tokenIn.address),
              ]}
            />
          ))}
        </div>

      {/* Arrow — centered */}
      <div className="flex justify-center my-1.5">
        <button
          onClick={() => {
            if (rows.length === 1) {
              const prevIn  = rows[0].tokenIn;
              const prevOut = tokenOut;
              setTokenOut(prevIn);
              updateRow(rows[0].id, { tokenIn: prevOut, amountIn: "" });
            }
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[--bg-input] border border-[--border] text-[--text-secondary] hover:text-[--accent-blue] hover:border-[--accent-blue] transition-all"
          title="Swap tokens"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>
      {/* Target token — selectable, swap style */}
      <div className="mb-2 rounded-xl bg-[--bg-input] border border-[--border] p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[--text-secondary]">You receive</span>
          {address && (
            <span className="text-xs text-[--text-secondary]">
              Balance: <span className="text-[--text-primary] font-semibold">{formatInputAmount(balanceOut, tokenOut.decimals)}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold text-[--text-primary]">
              {totalOut > 0 ? totalOut.toFixed(4) : "0.0"}
            </div>
          </div>
          <TokenSelector selected={tokenOut} onSelect={(t) => setTokenOut(t)} label="target" />
        </div>
      </div>

      {/* Action */}
      {(totalUsd > 0 || totalOutUsd > 0) && (
        <div className="flex justify-end gap-3 mb-2">
          {totalUsd > 0 && (
            <span className="text-[11px] text-[--text-secondary]">
              Input: <span style={{ color: "#C9693A" }} className="font-semibold">${totalUsd.toFixed(2)}</span>
            </span>
          )}
          {totalOutUsd > 0 && (
            <span className="text-[11px] text-[--text-secondary]">
              Output: <span style={{ color: "#C9693A" }} className="font-semibold">${totalOutUsd.toFixed(2)}</span>
            </span>
          )}
        </div>
      )}
      {!address ? (
        <ConnectButton.Custom>{({ openConnectModal }) => (
          <button onClick={openConnectModal} className="w-full rounded-xl bg-[--accent-blue] py-3 text-sm font-bold text-white hover:brightness-110 transition-all">Connect Wallet</button>
        )}</ConnectButton.Custom>
      ) : isWrongChain ? (
        <button onClick={() => switchChain({ chainId: base.id })} className="w-full rounded-xl bg-[--accent-orange] py-3 text-sm font-bold text-white hover:brightness-110 transition-all">Switch to Base</button>
      ) : (
        <button
          onClick={() => executeAll(quotesMap)}
          disabled={!canExecute || executing}
          className="w-full rounded-xl py-3 text-sm font-bold transition-all disabled:cursor-not-allowed enabled:hover:brightness-110"
          style={{
            background: canExecute && !executing ? "linear-gradient(90deg,#C9693A,#B55A2E)" : "var(--bg-input)",
            color:      canExecute && !executing ? "#ffffff" : "var(--text-secondary)",
          }}
        >
          {executing
            ? <span className="flex items-center justify-center gap-2"><LoadingSpinner size={16} color="white" /> Swapping...</span>
            : hasInsufficient ? "Insufficient balance"
            : canExecute ? "Swap All"
            : "Enter amount"}
        </button>
      )}
    </div>
  );
}

