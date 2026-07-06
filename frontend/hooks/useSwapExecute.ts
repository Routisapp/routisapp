"use client";

// CANONICAL SOURCE — there is only one copy of this hook.
// useMultiSwap.ts imports from "./useSwapExecute"
// SwapLayout.tsx imports from "@/hooks/useSwapExecute"
// Both resolve to this file. Do NOT create additional copies.

import { useState } from "react";
import { useWriteContract, usePublicClient, useSendTransaction } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { encodeFunctionData, erc20Abi, maxUint256, formatUnits, concat } from "viem";
import { Attribution } from "ox/erc8021";
import { toast } from "sonner";
import { insertSwapRecord } from "@/lib/supabase";
import { basescanTx, fetchTokenPrice } from "@/lib/utils";
import type { SwapExecuteParams, SwapStatus } from "@/types/swap";
import { DEX_ROUTERS } from "@/constants/dex-addresses";
import { AERODROME_FACTORY } from "@/constants/dex-registry";

// 🔧 Builder Code Attribution
const BUILDER_CODE_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_92yf9czs"] }) as `0x${string}`;

// Helper: Append builder code to transaction data
function appendBuilderCode(data: `0x${string}`): `0x${string}` {
  return concat([data, BUILDER_CODE_SUFFIX]);
}

const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WETH       = "0x4200000000000000000000000000000000000006" as const;

const WETH_ABI = [
  { name: "deposit",  type: "function", stateMutability: "payable",    inputs: [],                                 outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [{ name: "wad", type: "uint256" }], outputs: [] },
] as const;

const UNIV3_ROUTER_ABI = [
  {
    name: "exactInputSingle", type: "function", stateMutability: "payable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "tokenIn",           type: "address" },
      { name: "tokenOut",          type: "address" },
      { name: "fee",               type: "uint24"  },
      { name: "recipient",         type: "address" },
      { name: "amountIn",          type: "uint256" },
      { name: "amountOutMinimum",  type: "uint256" },
      { name: "sqrtPriceLimitX96", type: "uint160" },
    ]}],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "unwrapWETH9", type: "function", stateMutability: "payable",
    inputs: [{ name: "amountMinimum", type: "uint256" }, { name: "recipient", type: "address" }],
    outputs: [],
  },
  {
    name: "multicall", type: "function", stateMutability: "payable",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]" }],
  },
] as const;

const AERODROME_ROUTER_ABI = [
  {
    name: "swapExactTokensForTokens", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" }, { name: "amountOutMin", type: "uint256" },
      { name: "routes", type: "tuple[]", components: [
        { name: "from", type: "address" }, { name: "to", type: "address" },
        { name: "stable", type: "bool" },  { name: "factory", type: "address" },
      ]},
      { name: "to", type: "address" }, { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    name: "swapExactETHForTokens", type: "function", stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "routes", type: "tuple[]", components: [
        { name: "from", type: "address" }, { name: "to", type: "address" },
        { name: "stable", type: "bool" },  { name: "factory", type: "address" },
      ]},
      { name: "to", type: "address" }, { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    name: "swapExactTokensForETH", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" }, { name: "amountOutMin", type: "uint256" },
      { name: "routes", type: "tuple[]", components: [
        { name: "from", type: "address" }, { name: "to", type: "address" },
        { name: "stable", type: "bool" },  { name: "factory", type: "address" },
      ]},
      { name: "to", type: "address" }, { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

const SUSHI_ROUTER_ABI = [
  {
    name: "swapExactTokensForTokens", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" }, { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },   { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    name: "swapExactETHForTokens", type: "function", stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" }, { name: "path", type: "address[]" },
      { name: "to", type: "address" },           { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    name: "swapExactTokensForETH", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" }, { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },   { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

function isWethEthPair(tokenIn: string, tokenOut: string): "wrap" | "unwrap" | null {
  const a = tokenIn.toLowerCase();
  const b = tokenOut.toLowerCase();
  if (a === NATIVE_ETH.toLowerCase() && b === WETH.toLowerCase()) return "wrap";
  if (a === WETH.toLowerCase() && b === NATIVE_ETH.toLowerCase()) return "unwrap";
  return null;
}

export function useSwapExecute(onSuccess?: () => void) {
  const [status,  setStatus]  = useState<SwapStatus>("idle");
  const [txHash,  setTxHash]  = useState<`0x${string}` | undefined>();
  const { writeContractAsync }   = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const queryClient = useQueryClient();
  // usePublicClient uses the wallet's connected provider — no CORS issues
  const walletClient = usePublicClient();

  // 🔧 Wrapper: writeContract with builder code
  async function writeWithBuilderCode(params: Parameters<typeof writeContractAsync>[0]) {
    const data = encodeFunctionData({
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
    });
    const dataWithBuilder = appendBuilderCode(data);
    
    return sendTransactionAsync({
      to: params.address,
      data: dataWithBuilder,
      value: params.value || 0n,
      gas: params.gas,
    });
  }

  async function execute(params: SwapExecuteParams, userAddress: string, swapType: "swap" | "multi_swap" | "ai_agent" = "swap") {
    setStatus("swapping");
    toast.loading("Sending transaction...", { id: "swap" });

    // Wait up to 2s for walletClient to be ready (handles first-render undefined)
    let client = walletClient;
    if (!client) {
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 250));
        client = walletClient;
        if (client) break;
      }
    }

    if (!client) {
      setStatus("error");
      toast.error("Wallet not connected — please try again", { id: "swap" });
      throw new Error("Wallet client not ready");
    }

    const slippageBps  = BigInt(Math.round(params.slippage * 100));
    const amountOutMin = params.quote.amountOut - (params.quote.amountOut * slippageBps) / 10000n;
    const deadline     = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

    const isNativeIn  = params.tokenIn.toLowerCase()  === NATIVE_ETH.toLowerCase();
    const isNativeOut = params.tokenOut.toLowerCase() === NATIVE_ETH.toLowerCase();
    const tokenIn     = (isNativeIn  ? WETH : params.tokenIn)  as `0x${string}`;
    const tokenOut    = (isNativeOut ? WETH : params.tokenOut) as `0x${string}`;
    const wethOp      = isWethEthPair(params.tokenIn, params.tokenOut);

    try {
      let hash: `0x${string}`;

      // ── ERC-20 Approve (skip for native ETH and wrap/unwrap) ─
      // walletClient is guaranteed non-null here (checked above)
      if (!isNativeIn && wethOp === null) {
        const spender = (
          params.quote.dex === "UNISWAP_V3"     ? DEX_ROUTERS.UNISWAP_V3     :
          params.quote.dex === "PANCAKESWAP_V3" ? DEX_ROUTERS.PANCAKESWAP_V3 :
          params.quote.dex === "AERODROME"      ? DEX_ROUTERS.AERODROME      :
                                                   DEX_ROUTERS.SUSHISWAP
        ) as `0x${string}`;

        const allowance = await client.readContract({
          address:      tokenIn,
          abi:          erc20Abi,
          functionName: "allowance",
          args:         [params.recipient as `0x${string}`, spender],
        }) as bigint;

        if (allowance < params.amountIn) {
          toast.loading("Approving token...", { id: "swap" });
          // Approve with builder code
          const approveTx = await writeWithBuilderCode({
            address:      tokenIn,
            abi:          erc20Abi,
            functionName: "approve",
            args:         [spender, maxUint256],
          });
          await client.waitForTransactionReceipt({ hash: approveTx });
          toast.loading("Sending transaction...", { id: "swap" });
        }
      }

      // ── WETH wrap / unwrap (direkt WETH contract, no router) ─
      if (wethOp === "wrap") {
        // deposit() — with builder code
        const wrapData = encodeFunctionData({ abi: WETH_ABI, functionName: "deposit" });
        const wrapDataWithBuilder = appendBuilderCode(wrapData);
        hash = await sendTransactionAsync({
          to:    WETH,
          data:  wrapDataWithBuilder,
          value: params.amountIn,
          gas:   60000n,
        });

      } else if (wethOp === "unwrap") {
        // withdraw() — with builder code
        const unwrapData = encodeFunctionData({
          abi:          WETH_ABI,
          functionName: "withdraw",
          args:         [params.amountIn],
        });
        const unwrapDataWithBuilder = appendBuilderCode(unwrapData);
        hash = await sendTransactionAsync({
          to:   WETH,
          data: unwrapDataWithBuilder,
          gas: 60000n,
        });

      // ── Uniswap V3 / PancakeSwap V3 ──────────────────────────
      } else if (params.quote.dex === "UNISWAP_V3" || params.quote.dex === "PANCAKESWAP_V3") {
        const router = (params.quote.dex === "UNISWAP_V3"
          ? DEX_ROUTERS.UNISWAP_V3 : DEX_ROUTERS.PANCAKESWAP_V3) as `0x${string}`;

        if (isNativeOut) {
          const swapData   = encodeFunctionData({ abi: UNIV3_ROUTER_ABI, functionName: "exactInputSingle", args: [{ tokenIn, tokenOut: WETH, fee: params.quote.fee, recipient: router, amountIn: params.amountIn, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }] });
          const unwrapData = encodeFunctionData({ abi: UNIV3_ROUTER_ABI, functionName: "unwrapWETH9",      args: [amountOutMin, params.recipient as `0x${string}`] });
          const multicallData = encodeFunctionData({ abi: UNIV3_ROUTER_ABI, functionName: "multicall", args: [[swapData, unwrapData]] });
          const multicallDataWithBuilder = appendBuilderCode(multicallData);
          hash = await sendTransactionAsync({ to: router, data: multicallDataWithBuilder, value: 0n });
        } else {
          hash = await writeWithBuilderCode({
            address: router, abi: UNIV3_ROUTER_ABI, functionName: "exactInputSingle",
            args: [{ tokenIn, tokenOut, fee: params.quote.fee, recipient: params.recipient as `0x${string}`, amountIn: params.amountIn, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
            value: isNativeIn ? params.amountIn : 0n,
          });
        }

      // ── Aerodrome ─────────────────────────────────────────────
      } else if (params.quote.dex === "AERODROME") {
        const router   = DEX_ROUTERS.AERODROME as `0x${string}`;
        const isStable = params.quote.fee <= 5;
        const route    = [{ from: tokenIn, to: tokenOut, stable: isStable, factory: AERODROME_FACTORY }];

        if (isNativeIn) {
          hash = await writeWithBuilderCode({ address: router, abi: AERODROME_ROUTER_ABI, functionName: "swapExactETHForTokens", args: [amountOutMin, route, params.recipient as `0x${string}`, deadline], value: params.amountIn });
        } else if (isNativeOut) {
          hash = await writeWithBuilderCode({ address: router, abi: AERODROME_ROUTER_ABI, functionName: "swapExactTokensForETH", args: [params.amountIn, amountOutMin, route, params.recipient as `0x${string}`, deadline] });
        } else {
          hash = await writeWithBuilderCode({ address: router, abi: AERODROME_ROUTER_ABI, functionName: "swapExactTokensForTokens", args: [params.amountIn, amountOutMin, route, params.recipient as `0x${string}`, deadline] });
        }

      // ── SushiSwap ─────────────────────────────────────────────
      } else if (params.quote.dex === "SUSHISWAP") {
        const router = DEX_ROUTERS.SUSHISWAP as `0x${string}`;
        const path   = [tokenIn, WETH, tokenOut].filter((v, i, a) => i === 0 || v !== a[i - 1]) as `0x${string}`[];

        if (isNativeIn) {
          hash = await writeWithBuilderCode({ address: router, abi: SUSHI_ROUTER_ABI, functionName: "swapExactETHForTokens", args: [amountOutMin, path, params.recipient as `0x${string}`, deadline], value: params.amountIn });
        } else if (isNativeOut) {
          hash = await writeWithBuilderCode({ address: router, abi: SUSHI_ROUTER_ABI, functionName: "swapExactTokensForETH", args: [params.amountIn, amountOutMin, path, params.recipient as `0x${string}`, deadline] });
        } else {
          hash = await writeWithBuilderCode({ address: router, abi: SUSHI_ROUTER_ABI, functionName: "swapExactTokensForTokens", args: [params.amountIn, amountOutMin, path, params.recipient as `0x${string}`, deadline] });
        }

      } else {
        throw new Error(`Unsupported DEX: ${params.quote.dex}`);
      }

      setTxHash(hash);

      // Wait for tx to be confirmed before refreshing balances & stats
      try {
        await client.waitForTransactionReceipt({ hash, confirmations: 1 });
      } catch { /* non-blocking — proceed even if receipt polling fails */ }

      setStatus("success");
      onSuccess?.();

      // Invalidate all cached queries so balances and Routis stats refresh immediately
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-stats"] });
      queryClient.invalidateQueries({ queryKey: ["swap-history"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-score-leaderboard"] });

      toast.success("Swap successful!", {
        id:     "swap",
        action: { label: "View on Basescan", onClick: () => window.open(basescanTx(hash)) },
      });

      // Fetch price first, then insert with real volume in a single atomic call
      const pricePromise = fetchTokenPrice(params.tokenIn);

      const volumeUsd = await (async () => {
        try {
          const price = await pricePromise;
          const amountNum = parseFloat(formatUnits(params.amountIn, params.decimalsIn));
          return price * amountNum;
        } catch { return 0; }
      })();

      insertSwapRecord({
        user_address: userAddress.toLowerCase(),
        token_in:     params.tokenIn,
        token_out:    params.tokenOut,
        amount_in:    params.amountIn.toString(),
        amount_out:   params.quote.amountOut.toString(),
        dex:          params.quote.dexName,
        tx_hash:      hash,
        volume_usd:   volumeUsd,
        swap_type:    swapType,
      }).then(async () => {
        // Referral reward
        try {
          const { getReferrer: getRef, addReferralReward: addReward } = await import("@/lib/supabase");
          const referrer = await getRef(userAddress);
          if (referrer) {
            await addReward(referrer, userAddress, hash, 25);
          }
        } catch { /* non-blocking */ }
      }).catch(console.error);

    } catch (err: unknown) {
      setStatus("error");
      const msg = (err instanceof Error ? err.message : "").toLowerCase();
      toast.error(
        msg.includes("user rejected")  ? "Transaction rejected"
        : msg.includes("insufficient") ? "Insufficient balance"
        : msg.includes("no weth")      ? "No WETH balance to unwrap"
        : msg.includes("slippage") || msg.includes("too little") ? "Price moved — try higher slippage"
        : "Swap failed",
        { id: "swap" },
      );
      console.error("[swap error]", err);
      throw err;
    }
  }

  function reset() { setStatus("idle"); setTxHash(undefined); }

  return { execute, status, txHash, reset };
}
