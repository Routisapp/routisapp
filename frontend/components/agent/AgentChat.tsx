"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAccount, useWalletClient, usePublicClient, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, erc20Abi } from "viem";
import { useSwapExecute } from "@/hooks/useSwapExecute";
import { BASE_TOKENS, NATIVE_ETH } from "@/constants/tokens";
import { DEX_ID_BY_NAME } from "@/constants/dex-registry";
import type { AgentMessage, SwapPreview } from "@/types/agent";
import type { SwapExecuteParams } from "@/types/swap";
import { MessageBubble } from "./MessageBubble";
import { x402Fetch } from "@/lib/x402Client";

const USDC_ADDRESS           = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const PLATFORM_FEE_AMOUNT    = 300_000n; // 0.3 USDC (6 decimals) — x402 fee kontrolü için
const EXAMPLE_PROMPTS = [
  "Swap 5 USDC to ETH",
  "Swap 0.005 ETH to USDC",
];

export function AgentChat() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [messages, setMessages]           = useState<AgentMessage[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [pendingSwapId, setPendingSwapId] = useState<string | undefined>();
  const [cancelledIds, setCancelledIds]   = useState<Set<string>>(new Set());
  const [swapStatuses, setSwapStatuses]   = useState<Record<string, "confirmed" | "rejected" | "cancelled">>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const { execute } = useSwapExecute();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: AgentMessage = {
      id:      crypto.randomUUID(),
      role:    "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].slice(-10).map((m) => ({
        role:    m.role,
        content: m.content,
      }));

      const res = await fetch("/api/agent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: history, userAddress: address }),
      });

      const text = await res.text();
      let data: { content?: string; swapPreview?: unknown; error?: string } = {};
      try { data = JSON.parse(text); } catch { data = { error: text || "Unknown error" }; }

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id:      crypto.randomUUID(),
            role:    "assistant" as const,
            content: data.error ?? "Something went wrong. Please try again.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id:          crypto.randomUUID(),
          role:        "assistant" as const,
          content:     data.content,
          swapPreview: data.swapPreview,
        },
      ]);
    } catch (err) {
      console.error("[agent sendMessage error]", err);
      setMessages((prev) => [
        ...prev,
        {
          id:      crypto.randomUUID(),
          role:    "assistant" as const,
          content: err instanceof Error ? err.message : "Network error. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, address, walletClient, publicClient]);

  const handleConfirmSwap = useCallback(async (preview: SwapPreview, msgId: string) => {
    if (!address) return;

    const tokenIn  = BASE_TOKENS.find((t) => t.symbol.toUpperCase() === preview.fromToken.toUpperCase());
    const tokenOut = BASE_TOKENS.find((t) => t.symbol.toUpperCase() === preview.toToken.toUpperCase());

    if (!tokenIn || !tokenOut) { alert("Token not found."); return; }

    const dexKey = DEX_ID_BY_NAME[preview.bestDex];
    if (!dexKey) { alert(`DEX not supported: ${preview.bestDex}`); return; }

    try {
      setPendingSwapId(msgId);

      // ── Step 1: USDC bakiye kontrolü (0.1 USDC = 100000 atomic units) ────
      if (publicClient) {
        const usdcBalance = await publicClient.readContract({
          address:      USDC_ADDRESS,
          abi:          erc20Abi,
          functionName: "balanceOf",
          args:         [address as `0x${string}`],
        }) as bigint;

        if (usdcBalance < PLATFORM_FEE_AMOUNT) {
          throw new Error(
            `Insufficient USDC balance for fee. Need 0.3 USDC, have ${(Number(usdcBalance) / 1e6).toFixed(2)} USDC.`
          );
        }
      }

      // ── Step 2: x402 fee — 0.1 USDC via CDP facilitator ──────────────────
      if (walletClient && publicClient) {
        const feeRes = await x402Fetch(
          "/api/agent-fee",
          {
            method:  "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body:    "{}",
          },
          walletClient,
          publicClient,
        );
        if (!feeRes.ok) {
          const rawText = await feeRes.text().catch(() => "");
          let errMsg = "Fee payment failed";
          try { errMsg = JSON.parse(rawText)?.error ?? rawText ?? errMsg; } catch { errMsg = rawText || errMsg; }
          throw new Error(errMsg);
        }
      }

      // ── Step 2: Execute the actual swap ──────────────────────────────────
      const amountInWei  = parseUnits(preview.amountIn,  tokenIn.decimals);
      const amountOutWei = parseUnits(preview.amountOut, tokenOut.decimals);

      const params: SwapExecuteParams = {
        quote: {
          dex:                dexKey,
          dexName:            preview.bestDex,
          amountOut:          amountOutWei,
          amountOutFormatted: preview.amountOut,
          priceImpact:        parseFloat(preview.priceImpact),
          estimatedGas:       200_000n,
          estimatedGasUsd:    0,
          routePath:          [tokenIn.address, tokenOut.address],
          fee:                parseFeeToBasicPoints(preview.fee),
        },
        tokenIn:     tokenIn.address  === NATIVE_ETH ? NATIVE_ETH : tokenIn.address,
        tokenOut:    tokenOut.address === NATIVE_ETH ? NATIVE_ETH : tokenOut.address,
        amountIn:    amountInWei,
        slippage:    0.5,
        recipient:   address,
        decimalsIn:  tokenIn.decimals,
        decimalsOut: tokenOut.decimals,
      };

      await execute(params, address, "ai_agent");
      setCancelledIds((prev) => new Set(prev).add(msgId));
      setSwapStatuses((prev) => ({ ...prev, [msgId]: "confirmed" }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCancelledIds((prev) => new Set(prev).add(msgId));
      if (msg.toLowerCase().includes("user rejected")) {
        setSwapStatuses((prev) => ({ ...prev, [msgId]: "rejected" }));
      } else {
        setSwapStatuses((prev) => ({ ...prev, [msgId]: "cancelled" }));
        console.error("[agent swap error]", err);
      }
    } finally {
      setPendingSwapId(undefined);
    }
  }, [address, execute]);

  const handleCancelSwap = useCallback((msgId: string) => {
    setCancelledIds((prev) => new Set(prev).add(msgId));
    setSwapStatuses((prev) => ({ ...prev, [msgId]: "cancelled" }));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100dvh - 56px - 64px - env(safe-area-inset-bottom))", background: "var(--bg-primary)" }}
    >

      {/* Title — sticky header */}
      <div className="shrink-0 px-4 pt-6 pb-4 bg-[--bg-primary]">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-[#C9693A]">Routis AI Agent</h1>
          <p className="mt-1 text-sm text-[--text-secondary]">I'll find the best swap route for you.</p>
        </div>
      </div>

      {/* Messages — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="mx-auto max-w-2xl">

          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-10 text-center" style={{ marginTop: -10 }}>
              <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-3 rounded-2xl px-8 py-10 relative">

                {/* Robot icon */}
                <div className="flex justify-center w-full" style={{ marginBottom: -3 }}>
                  <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="7" width="18" height="13" rx="2"/>
                    <path d="M8 11h.01M12 11h.01M16 11h.01"/>
                    <path d="M12 7V4"/><circle cx="12" cy="3" r="1"/>
                  </svg>
                </div>

                {/* Example buttons */}
                <p className="text-xs text-[--text-secondary] text-center" style={{ opacity: 0.7 }}>
                  You need USDC in your wallet for the x402 AI Agent to work.
                </p>
                <div className="inline-flex flex-wrap gap-3 justify-center">
                  {EXAMPLE_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:brightness-95 border border-[--border] bg-[--bg-card] text-[--text-primary] w-fit"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={{ ...msg, swapStatus: swapStatuses[msg.id] }}
              onConfirmSwap={(preview) => handleConfirmSwap(preview, msg.id)}
              onCancelSwap={handleCancelSwap}
              pendingSwapId={pendingSwapId}
              cancelledSwapIds={cancelledIds}
            />
          ))}

          {/* Loading dots */}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="rounded-2xl px-5 py-3 bg-[--bg-card] border border-[--border]" style={{ borderRadius: "18px 18px 18px 4px" }}>
                <LoadingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Fixed input bar */}
      <div
        className="shrink-0 px-4 pb-2 pt-2 border-t border-[--border] bg-[--bg-primary]"
      >
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 rounded-2xl px-4 py-2 bg-[--bg-card] border border-[--border]">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about swaps on Base..."
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed text-[--text-primary] placeholder:text-[--text-secondary]"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="shrink-0 flex items-center gap-2 rounded-xl px-4 py-1.5 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: "#C9693A" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21L23 12 2 3v7l15 2-15 2v7z"/>
              </svg>
              Send
            </button>
          </div>

          <p className="mt-1 text-center text-xs text-[--text-secondary]" style={{ opacity: 0.6 }}>
            ⓘ A fee of 0.3 USDC will be charged for each approved transaction.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1.5 items-center py-0.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 7, height: 7,
            background: "#C9693A",
            animation: `agentBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes agentBounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

function parseFeeToBasicPoints(feeStr: string): number {
  const num = parseFloat(feeStr.replace("%", ""));
  if (isNaN(num)) return 500;
  // Uniswap V3 fee tiers are in units of 1/1,000,000
  // 0.01% → 100, 0.05% → 500, 0.30% → 3000, 1.00% → 10000
  return Math.round(num * 10000);
}
