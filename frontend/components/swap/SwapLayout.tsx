"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, formatUnits } from "viem";
import { base } from "wagmi/chains";
import { TokenSelector }    from "./TokenSelector";
import { QuoteList }        from "./QuoteList";
import { SlippageSettings } from "./SlippageSettings";
import { LoadingSpinner }   from "@/components/ui/LoadingSpinner";
import { useSwapQuotes }    from "@/hooks/useSwapQuotes";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { useSwapExecute }   from "@/hooks/useSwapExecute";
import { useWethWrap }      from "@/hooks/useWethWrap";
import { useTokenBalance }  from "@/hooks/useTokenBalance";
import { formatInputAmount } from "@/lib/utils";
import { BASE_TOKENS, NATIVE_ETH, WETH_ADDRESS, type Token } from "@/constants/tokens";
import { DEX_ROUTER_ADDRESS } from "@/constants/dex-registry";
import { useRouteStats }     from "@/hooks/useRouteStats";

const ETH_TOKEN  = BASE_TOKENS.find(t => t.symbol === "ETH")!;
const USDC_TOKEN = BASE_TOKENS.find(t => t.symbol === "USDC")!;

const PCT_BUTTONS = [
  { label: "25%", pct: 0.25 },
  { label: "50%", pct: 0.50 },
  { label: "75%", pct: 0.75 },
  { label: "MAX", pct: 1.00 },
];

export function SwapLayout() {
  const { address, chainId } = useAccount();
  const { switchChain }      = useSwitchChain();

  const [tokenIn,     setTokenIn]     = useState<Token>(ETH_TOKEN);
  const [tokenOut,    setTokenOut]    = useState<Token>(USDC_TOKEN);
  const [amountIn,    setAmountIn]    = useState("");
  const [slippage,    setSlippage]    = useState(0.5);
  const [selectedDex, setSelectedDex] = useState<string | null>(null);

  const { balance, refetch: refetchBalance }                = useTokenBalance(address, tokenIn.address);
  const { balance: balanceOut, refetch: refetchBalanceOut } = useTokenBalance(address, tokenOut.address);

  const isWrap        = tokenIn.address === NATIVE_ETH   && tokenOut.address === WETH_ADDRESS;
  const isUnwrap      = tokenIn.address === WETH_ADDRESS && tokenOut.address === NATIVE_ETH;
  const isWethEthPair = isWrap || isUnwrap;

  const { data: quotes = [], isLoading: quotesLoading, error: quotesError, refetch: refetchQuotes } = useSwapQuotes({
    tokenIn: tokenIn.address, tokenOut: tokenOut.address, amountIn,
    decimalsIn: tokenIn.decimals, decimalsOut: tokenOut.decimals,
    enabled: !!amountIn && parseFloat(amountIn.replace(",", ".")) > 0 && !isWethEthPair,
  });

  const wethEthQuote = isWethEthPair && amountIn && parseFloat(amountIn.replace(",", ".")) > 0 ? {
    dex: (isWrap ? "WRAP" : "UNWRAP") as never,
    dexName: isWrap ? "Wrap ETH → WETH" : "Unwrap WETH → ETH",
    amountOut: parseUnits(amountIn, tokenOut.decimals),
    amountOutFormatted: amountIn,
    priceImpact: 0, estimatedGas: 21000n, estimatedGasUsd: 0,
    routePath: [tokenIn.address, tokenOut.address], fee: 0,
  } : null;

  const activeQuote = isWethEthPair
    ? wethEthQuote
    : (quotes.find((q) => q.dex === selectedDex) ?? quotes[0] ?? null);

  // exactBalanceStr: full-precision string used ONLY for the amountInWei equality shortcut
  // inputBalanceStr: trimmed string suitable for the input field (MAX button)
  const exactBalanceStr = formatUnits(balance, tokenIn.decimals);
  const inputBalanceStr = formatInputAmount(balance, tokenIn.decimals);

  const amountInWei = amountIn ? (() => {
    try {
      const n = amountIn.replace(",", ".");
      // Match both full-precision and trimmed representations of the full balance
      if (n === exactBalanceStr || n === inputBalanceStr) return balance;
      return parseUnits(n, tokenIn.decimals);
    } catch { return 0n; }
  })() : 0n;

  const spenderAddress = isWethEthPair
    ? "0x0000000000000000000000000000000000000000"
    : (DEX_ROUTER_ADDRESS[activeQuote?.dex as keyof typeof DEX_ROUTER_ADDRESS]
        ?? "0x0000000000000000000000000000000000000000");

  const { needsApproval, approve, isApproving } = useTokenApproval(
    isWethEthPair ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : tokenIn.address,
    spenderAddress, amountInWei, address,
  );

  const { execute, status: swapStatus } = useSwapExecute(() => {
    refetchBalance();
    refetchBalanceOut();
    // Kriter 7: swap tamamlanınca diyagramı anında güncelle (60s polling'i bekleme)
    refreshRouteStats();
  });

  // Route stats refresh — called after each successful swap
  const { refresh: refreshRouteStats } = useRouteStats({ pollInterval: 0, skipInitialFetch: true });
  // pollInterval:0 + skipInitialFetch:true → hiç fetch yapmaz, sadece refresh() tetikler.
  // RouteStatsCard'ın kendi useRouteStats instance'ı 60s polling'i yönetir.
  const { wrap, unwrap, status: wethStatus } = useWethWrap();

  const isWrongChain   = !!address && chainId !== base.id;
  // isInsufficient: true whenever a positive amount exceeds the on-chain balance.
  // Intentionally no "balance > 0n" guard — zero balance + any amount must be insufficient.
  const isInsufficient = address ? (amountInWei > 0n && amountInWei > balance) : false;
  const isPending      = swapStatus === "swapping" || wethStatus === "pending";

  function setPct(pct: number) {
    if (balance === 0n) return;
    if (pct === 1.0) {
      // MAX: use trimmed input-safe string (no 18-decimal raw value)
      setAmountIn(inputBalanceStr);
    } else {
      const raw = (balance * BigInt(Math.round(pct * 10000))) / 10000n;
      setAmountIn(formatInputAmount(raw, tokenIn.decimals));
    }
    setSelectedDex(null);
  }

  function swapTokens() {
    setTokenIn(tokenOut); setTokenOut(tokenIn); setAmountIn(""); setSelectedDex(null);
  }

  async function handleSwap() {
    if (!address || !amountInWei || amountInWei === 0n) return;
    if (isWrap)   { await wrap(amountInWei);   setAmountIn(""); refetchBalance(); refetchBalanceOut(); return; }
    if (isUnwrap) { await unwrap(amountInWei); setAmountIn(""); refetchBalance(); refetchBalanceOut(); return; }
    if (!activeQuote) return;
    if (needsApproval) { await approve(); return; }

    // Refetch quotes and use the freshest data; fall back to cached activeQuote
    let quoteToUse = activeQuote;
    if (!isWethEthPair) {
      try {
        const result = await refetchQuotes();
        const freshQuotes = result.data ?? [];
        const fresh = freshQuotes.find((q) => q.dex === selectedDex) ?? freshQuotes[0];
        if (fresh) quoteToUse = fresh;
      } catch { /* use cached quote */ }
    }

    await execute(
      { quote: quoteToUse, tokenIn: tokenIn.address, tokenOut: tokenOut.address, amountIn: amountInWei, slippage, recipient: address, decimalsIn: tokenIn.decimals, decimalsOut: tokenOut.decimals },
      address,
    );
    // Clear input after successful swap (execute throws on failure, so this only runs on success)
    setAmountIn("");
    setSelectedDex(null);
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

  const hasRoutes = quotes.length > 0 || quotesLoading;

  return (
    <div className="flex w-full flex-col gap-2">

      {/* ── Swap card ── */}
      <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-3 shadow-2xl">

        {/* Header — sadece slippage */}
        <div className="mb-3 flex justify-end">
          <SlippageSettings value={slippage} onChange={setSlippage} />
        </div>

        {/* You pay */}
        <div className="rounded-xl bg-[--bg-input] border border-[--border] p-2.5 mb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[--text-secondary]">You pay</span>
            {address && (
              <span className="text-[11px] text-[--text-secondary]">
                Balance: <span className="text-[--text-primary] font-semibold">{formatInputAmount(balance, tokenIn.decimals)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <input
              type="number" placeholder="0.0" value={amountIn}
              onChange={(e) => {
                const val = e.target.value.replace(",", ".");
                setAmountIn(val); setSelectedDex(null);
              }}
              className="flex-1 bg-transparent text-xl font-bold text-[--text-primary] outline-none placeholder:text-[--text-secondary] min-w-0 w-0"
            />
            <TokenSelector selected={tokenIn} onSelect={(t) => { setTokenIn(t); setAmountIn(""); setSelectedDex(null); }} exclude={tokenOut.address} label="token" />
          </div>
          {address && (
            <div className="flex gap-1">
              {PCT_BUTTONS.map(({ label, pct }) => (
                <button key={label} onClick={() => setPct(pct)}
                  className="flex-1 rounded-full bg-[--bg-card] border border-[--border] py-0.5 text-[11px] font-semibold text-[--text-secondary] hover:text-[--text-primary] hover:border-[--accent-blue] transition-all">
                  {label}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Arrow */}
        <div className="flex justify-center my-1.5">
          <button onClick={swapTokens} className="flex h-10 w-10 items-center justify-center rounded-full bg-[--bg-input] border border-[--border] text-[--text-secondary] hover:text-[--accent-blue] hover:border-[--accent-blue] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* You receive */}
        <div className="rounded-xl bg-[--bg-input] border border-[--border] p-2.5 mb-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[--text-secondary]">You receive</span>
            {address && (
              <span className="text-[11px] text-[--text-secondary]">
                Balance: <span className="text-[--text-primary] font-semibold">{formatInputAmount(balanceOut, tokenOut.decimals)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-xl font-bold text-[--text-primary] min-w-0 w-0 truncate">
              {quotesLoading ? <LoadingSpinner size={18} /> : (activeQuote?.amountOutFormatted ?? "0.0")}
            </div>
            <TokenSelector selected={tokenOut} onSelect={(t) => { setTokenOut(t); setSelectedDex(null); }} exclude={tokenIn.address} label="token" />
          </div>
        </div>

        {quotesError && <p className="mb-1.5 text-[11px] text-[--accent-orange]">⚠ Some DEXes unavailable</p>}

        {/* Exchange rate info */}
        {activeQuote && amountInWei > 0n && !isWethEthPair && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl bg-[--bg-input] border border-[--border] px-2.5 py-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b8fa8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/>
            </svg>
            <span className="text-[11px] text-[--text-secondary]">
              1 {tokenIn.symbol} ={" "}
              <span className="text-[--text-primary] font-semibold">
                {(
                  parseFloat(activeQuote.amountOutFormatted) /
                  parseFloat(formatUnits(amountInWei, tokenIn.decimals))
                ).toFixed(tokenOut.decimals <= 6 ? 4 : 6)}
              </span>{" "}
              {tokenOut.symbol}
            </span>
            <span className="sm:ml-auto text-[11px] text-[--text-secondary]">
              ≈ 1 {tokenOut.symbol} ={" "}
              <span className="text-[--text-primary] font-semibold">
                {(
                  parseFloat(formatUnits(amountInWei, tokenIn.decimals)) /
                  parseFloat(activeQuote.amountOutFormatted)
                ).toFixed(tokenIn.decimals <= 6 ? 4 : 6)}
              </span>{" "}
              {tokenIn.symbol}
            </span>
          </div>
        )}

        {/* Action */}
        {!address ? (
          <ConnectButton.Custom>{({ openConnectModal }) => (
            <button onClick={openConnectModal} className="w-full rounded-xl bg-[--accent-blue] py-3 text-sm font-bold text-white hover:brightness-110 transition-all">Connect Wallet</button>
          )}</ConnectButton.Custom>
        ) : isWrongChain ? (
          <button onClick={() => switchChain({ chainId: base.id })} className="w-full rounded-xl bg-[--accent-orange] py-3 text-sm font-bold text-white hover:brightness-110 transition-all">Switch to Base</button>
        ) : (
          <button onClick={handleSwap}
            disabled={isInsufficient || isPending || swapStatus === "approving" || isApproving || (!isWethEthPair && !activeQuote) || !amountInWei || amountInWei === 0n}
            className="w-full rounded-xl py-3 text-sm font-bold transition-all disabled:cursor-not-allowed enabled:hover:brightness-110"
            style={{ background: (!isInsufficient && (isWethEthPair || activeQuote) && amountInWei > 0n) ? "linear-gradient(90deg,#C9693A,#B55A2E)" : "var(--bg-input)",
                     color:      (!isInsufficient && (isWethEthPair || activeQuote) && amountInWei > 0n) ? "#ffffff" : "var(--text-secondary)" }}>
            {(isPending || swapStatus === "approving" || isApproving)
              ? <span className="flex items-center justify-center gap-2"><LoadingSpinner size={16} color="white" /> {btnLabel}</span>
              : btnLabel}
          </button>
        )}
      </div>

      {/* ── Routes panel ── */}
      {hasRoutes && (
        <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-3 shadow-2xl">
          <QuoteList quotes={quotes} isLoading={quotesLoading} selected={selectedDex ?? (quotes[0]?.dex ?? null)} onSelect={setSelectedDex} />
        </div>
      )}
    </div>
  );
}
