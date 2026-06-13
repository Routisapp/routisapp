"use client";

import { useState, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, formatUnits } from "viem";
import { base } from "wagmi/chains";
import { TokenSelector }    from "./TokenSelector";
import { SlippageSettings } from "./SlippageSettings";
import { LoadingSpinner }   from "@/components/ui/LoadingSpinner";
import { useSwapQuotes }    from "@/hooks/useSwapQuotes";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { useSwapExecute }   from "@/hooks/useSwapExecute";
import { useWethWrap }      from "@/hooks/useWethWrap";
import { useTokenBalance }  from "@/hooks/useTokenBalance";
import { BASE_TOKENS, NATIVE_ETH, WETH_ADDRESS, type Token } from "@/constants/tokens";
import type { SwapQuote } from "@/types/swap";

const ETH_TOKEN  = BASE_TOKENS[0];
const USDC_TOKEN = BASE_TOKENS[2];

const PCT_BUTTONS = [
  { label: "25%",  pct: 0.25 },
  { label: "50%",  pct: 0.50 },
  { label: "75%",  pct: 0.75 },
  { label: "MAX",  pct: 1.00 },
];

export function SwapCard({ onQuotesChange, selectedDex: externalSelectedDex, onSelectDex }: {
  onQuotesChange?: (quotes: SwapQuote[], loading: boolean) => void;
  selectedDex?:    string | null;
  onSelectDex?:    (dex: string) => void;
} = {}) {
  const { address, chainId } = useAccount();
  const { switchChain }      = useSwitchChain();

  const [tokenIn,  setTokenIn]  = useState<Token>(ETH_TOKEN);
  const [tokenOut, setTokenOut] = useState<Token>(USDC_TOKEN);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState(0.5);

  // Use external selectedDex if provided, otherwise internal
  const [internalSelectedDex, setInternalSelectedDex] = useState<string | null>(null);
  const selectedDex    = externalSelectedDex !== undefined ? externalSelectedDex : internalSelectedDex;
  const setSelectedDex = (onSelectDex as ((dex: string | null) => void) | undefined) ?? setInternalSelectedDex;

  const { balance, refetch: refetchBalance } = useTokenBalance(address, tokenIn.address);

  const isWrap        = tokenIn.address === NATIVE_ETH    && tokenOut.address === WETH_ADDRESS;
  const isUnwrap      = tokenIn.address === WETH_ADDRESS  && tokenOut.address === NATIVE_ETH;
  const isWethEthPair = isWrap || isUnwrap;

  const { data: quotes = [], isLoading: quotesLoading, error: quotesError, refetch: refetchQuotes } = useSwapQuotes({
    tokenIn:     tokenIn.address,
    tokenOut:    tokenOut.address,
    amountIn,
    decimalsIn:  tokenIn.decimals,
    decimalsOut: tokenOut.decimals,
    enabled:     !!amountIn && parseFloat(amountIn) > 0 && !isWethEthPair,
  });

  const wethEthQuote = isWethEthPair && amountIn && parseFloat(amountIn) > 0 ? {
    dex:                (isWrap ? "WRAP" : "UNWRAP") as never,
    dexName:            isWrap ? "Wrap ETH → WETH" : "Unwrap WETH → ETH",
    amountOut:          parseUnits(amountIn, tokenOut.decimals),
    amountOutFormatted: amountIn,
    priceImpact:        0,
    estimatedGas:       21000n,
    estimatedGasUsd:    0,
    routePath:          [tokenIn.address, tokenOut.address],
    fee:                0,
  } : null;

  const activeQuote = isWethEthPair
    ? wethEthQuote
    : (quotes.find((q) => q.dex === selectedDex) ?? quotes[0] ?? null);

  const exactBalanceStr = formatUnits(balance, tokenIn.decimals);
  const amountInWei = amountIn
    ? (() => {
        try {
          const n = amountIn.replace(",", ".");
          if (n === exactBalanceStr) return balance;
          return parseUnits(n, tokenIn.decimals);
        } catch { return 0n; }
      })()
    : 0n;

  const spenderAddress = isWethEthPair ? "0x0000000000000000000000000000000000000000" :
    activeQuote?.dex === "UNISWAP_V3"     ? "0x2626664c2603336E57B271c5C0b26F421741e481" :
    activeQuote?.dex === "PANCAKESWAP_V3" ? "0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86" :
    activeQuote?.dex === "AERODROME"      ? "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43" :
    activeQuote?.dex === "SUSHISWAP"      ? "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891" :
    "0x0000000000000000000000000000000000000000";

  const { needsApproval, approve, isApproving } = useTokenApproval(
    isWethEthPair ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : tokenIn.address,
    spenderAddress,
    amountInWei,
    address,
  );

  const { execute, status: swapStatus } = useSwapExecute();
  const { wrap, unwrap, status: wethStatus } = useWethWrap();

  const isWrongChain   = !!address && chainId !== base.id;
  const isInsufficient = balance > 0n && amountInWei > balance;
  const isPending      = swapStatus === "swapping" || wethStatus === "pending";

  // Notify parent when quotes change (for side panel)
  useEffect(() => {
    if (onQuotesChange) {
      onQuotesChange(quotes, quotesLoading);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, quotesLoading]);



  function setPct(pct: number) {
    if (balance === 0n) return;
    const raw = (balance * BigInt(Math.round(pct * 10000))) / 10000n;
    // Format to max 6 decimals to avoid overflowing input
    const full = formatUnits(raw, tokenIn.decimals);
    const trimmed = parseFloat(full).toFixed(6).replace(/\.?0+$/, "");
    setAmountIn(trimmed);
    setSelectedDex(null);
  }

  function swapTokens() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn("");
    setSelectedDex(null);
  }

  async function handleSwap() {
    if (!address || !amountInWei || amountInWei === 0n) return;

    if (isWrap) {
      await wrap(amountInWei);
      setAmountIn("");
      setTimeout(() => refetchBalance(), 2000);
      return;
    }

    if (isUnwrap) {
      await unwrap(amountInWei);
      setAmountIn("");
      setTimeout(() => refetchBalance(), 2000);
      return;
    }

    if (!activeQuote) return;
    if (needsApproval) { await approve(); return; }
    if (!isWethEthPair) await refetchQuotes();

    await execute(
      {
        quote:       activeQuote,
        tokenIn:     tokenIn.address,
        tokenOut:    tokenOut.address,
        amountIn:    amountInWei,
        slippage,
        recipient:   address,
        decimalsIn:  tokenIn.decimals,
        decimalsOut: tokenOut.decimals,
      },
      address,
    );
    setTimeout(() => refetchBalance(), 2000);
  }

  const btnLabel =
    !address                                    ? null
    : isWrongChain                              ? "Switch to Base"
    : isInsufficient                            ? "Insufficient balance"
    : swapStatus === "approving" || isApproving ? "Approving..."
    : isPending                                 ? isWrap ? "Wrapping..." : isUnwrap ? "Unwrapping..." : "Swapping..."
    : needsApproval                             ? `Approve ${tokenIn.symbol}`
    : isWrap                                    ? "Wrap ETH → WETH"
    : isUnwrap                                  ? "Unwrap WETH → ETH"
    : activeQuote                               ? "Swap"
    : quotesLoading                             ? "Fetching quotes..."
    : "Enter amount";

  return (
    <div className="w-full max-w-md rounded-2xl border border-[--border] bg-[--bg-card] p-4 shadow-2xl">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-white">Swap</h2>
        <SlippageSettings value={slippage} onChange={setSlippage} />
      </div>

      {/* ── You Pay ── */}
      <div className="rounded-2xl bg-[#0d1117] border border-[--border] p-3 mb-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[--text-secondary]">You pay</span>
          {address && (
            <span className="text-xs text-[--text-secondary]">
              Balance: <span className="text-white font-semibold">{parseFloat(formatUnits(balance, tokenIn.decimals)).toFixed(6)}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <input
            type="number"
            placeholder="0.0"
            value={amountIn}
            onChange={(e) => {
              const val = e.target.value.replace(",", ".");
              if (val && balance > 0n) {
                try {
                  if (parseUnits(val, tokenIn.decimals) > balance) {
                    setAmountIn(formatUnits(balance, tokenIn.decimals));
                    setSelectedDex(null);
                    return;
                  }
                } catch { /* pass */ }
              }
              setAmountIn(val);
              setSelectedDex(null);
            }}
            className="flex-1 bg-transparent text-2xl font-bold text-white outline-none placeholder:text-white/30 min-w-0 w-0"
          />
          <TokenSelector
            selected={tokenIn}
            onSelect={(t) => { setTokenIn(t); setAmountIn(""); setSelectedDex(null); }}
            exclude={tokenOut.address}
            label="token"
          />
        </div>

        {/* PCT buttons */}
        {address && (
          <div className="flex gap-1.5">
            {PCT_BUTTONS.map(({ label, pct }) => (
              <button
                key={label}
                onClick={() => setPct(pct)}
                className="flex-1 rounded-full bg-[#1a1f2e] border border-[--border] py-1 text-xs font-semibold text-[--text-secondary] hover:text-white hover:border-[--accent-blue] transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {isInsufficient && (
          <p className="mt-1.5 text-xs text-[--accent-red]">Insufficient {tokenIn.symbol} balance</p>
        )}
      </div>

      {/* ── Swap arrow ── */}
      <div className="flex justify-center my-1.5">
        <button
          onClick={swapTokens}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1f2e] border border-[--border] text-[--text-secondary] hover:text-white hover:border-[--accent-blue] transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16V4m0 0L3 8m4-4l4 4" />
            <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* ── You Receive ── */}
      <div className="rounded-2xl bg-[#0d1117] border border-[--border] p-3 mb-3">
        <div className="mb-2">
          <span className="text-xs text-[--text-secondary]">You receive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 text-2xl font-bold text-white min-w-0 w-0 truncate">
            {quotesLoading
              ? <LoadingSpinner size={20} />
              : (activeQuote?.amountOutFormatted ?? "0.0")}
          </div>
          <TokenSelector
            selected={tokenOut}
            onSelect={(t) => { setTokenOut(t); setSelectedDex(null); }}
            exclude={tokenIn.address}
            label="token"
          />
        </div>
      </div>

      {quotesError && (
        <p className="mb-2 text-xs text-[--accent-orange]">⚠ Some DEXes are unavailable right now</p>
      )}

      {/* Action button */}
      {!address ? (
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={openConnectModal}
              className="w-full rounded-2xl bg-[--accent-blue] py-4 text-base font-bold text-white hover:brightness-110 transition-all"
            >
              Connect Wallet
            </button>
          )}
        </ConnectButton.Custom>
      ) : isWrongChain ? (
        <button
          onClick={() => switchChain({ chainId: base.id })}
          className="w-full rounded-2xl bg-[--accent-orange] py-4 text-base font-bold text-white hover:brightness-110 transition-all"
        >
          Switch to Base
        </button>
      ) : (
        <button
          onClick={handleSwap}
          disabled={
            isInsufficient || isPending ||
            swapStatus === "approving" || isApproving ||
            (!isWethEthPair && !activeQuote) ||
            !amountInWei || amountInWei === 0n
          }
          className="w-full rounded-2xl py-4 text-base font-bold transition-all disabled:cursor-not-allowed enabled:hover:brightness-110"
          style={{
            background: (!isInsufficient && (isWethEthPair || activeQuote) && amountInWei > 0n)
              ? "linear-gradient(90deg, #3b82f6, #2563eb)"
              : "#E8DDD0",
            color: (!isInsufficient && (isWethEthPair || activeQuote) && amountInWei > 0n)
              ? "#ffffff"
              : "#6B5A4E",
          }}
        >
          {(isPending || swapStatus === "approving" || isApproving) ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner size={18} color="white" /> {btnLabel}
            </span>
          ) : btnLabel}
        </button>
      )}
    </div>
  );
}
