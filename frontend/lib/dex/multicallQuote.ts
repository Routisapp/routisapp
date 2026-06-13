/**
 * multicallQuote.ts
 *
 * Uniswap V3 ve PancakeSwap V3 Quoter'ları simulate (eth_call) ile paralel çağrır.
 * Aerodrome ve SushiSwap view fonksiyonlarını tek multicall'da toplar.
 */

import { createPublicClient, http, type Abi } from "viem";
import { base } from "wagmi/chains";
import { formatTokenAmount } from "@/lib/utils";
import type { SwapParams, SwapQuote } from "@/types/swap";

// ─── Shared server-side client ────────────────────────────────
const client = createPublicClient({
  chain:     base,
  transport: http(
    process.env.BASE_RPC_URL ||
    "https://base-rpc.publicnode.com",
    { timeout: 10_000 },
  ),
});

// ─── Constants ────────────────────────────────────────────────
const WETH       = "0x4200000000000000000000000000000000000006" as const;
const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const UNISWAP_QUOTER   = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as `0x${string}`;
const PANCAKE_QUOTER   = "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997" as `0x${string}`;
const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43" as `0x${string}`;
const SUSHI_ROUTER     = "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891" as `0x${string}`;
const AERO_FACTORY     = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da" as `0x${string}`;

// ─── ABIs ─────────────────────────────────────────────────────
const V3_QUOTER_ABI = [{
  name: "quoteExactInputSingle", type: "function",
  // Must be "view" for eth_call to work in simulateContract
  stateMutability: "view",
  inputs: [{ name: "params", type: "tuple", components: [
    { name: "tokenIn",           type: "address" },
    { name: "tokenOut",          type: "address" },
    { name: "amountIn",          type: "uint256" },
    { name: "fee",               type: "uint24"  },
    { name: "sqrtPriceLimitX96", type: "uint160" },
  ]}],
  outputs: [
    { name: "amountOut",               type: "uint256" },
    { name: "sqrtPriceX96After",       type: "uint160" },
    { name: "initializedTicksCrossed", type: "uint32"  },
    { name: "gasEstimate",             type: "uint256" },
  ],
}] as const satisfies Abi;

const AERODROME_ABI = [{
  name: "getAmountsOut", type: "function", stateMutability: "view",
  inputs: [
    { name: "amountIn", type: "uint256" },
    { name: "routes", type: "tuple[]", components: [
      { name: "from",    type: "address" },
      { name: "to",      type: "address" },
      { name: "stable",  type: "bool"    },
      { name: "factory", type: "address" },
    ]},
  ],
  outputs: [{ name: "amounts", type: "uint256[]" }],
}] as const satisfies Abi;

const SUSHI_ABI = [{
  name: "getAmountsOut", type: "function", stateMutability: "view",
  inputs: [
    { name: "amountIn", type: "uint256" },
    { name: "path",     type: "address[]" },
  ],
  outputs: [{ name: "amounts", type: "uint256[]" }],
}] as const satisfies Abi;

// ─── Fee tiers ─────────────────────────────────────────────────
const UNI_FEES     = [500, 3000, 10000, 100] as const;
const PANCAKE_FEES = [500, 2500, 10000, 100] as const;

// ─── Helper: get best V3 quote across fee tiers ────────────────
async function getBestV3Quote(
  quoter: `0x${string}`,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint,
  fees: readonly number[],
): Promise<{ amountOut: bigint; gas: bigint; fee: number } | null> {
  const results = await Promise.allSettled(
    fees.map(fee =>
      client.readContract({
        address:      quoter,
        abi:          V3_QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        args:         [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
      }),
    ),
  );

  let best: { amountOut: bigint; gas: bigint; fee: number } | null = null;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      const [amountOut, , , gasEstimate] = r.value as [bigint, bigint, number, bigint];
      if (amountOut > 0n && (!best || amountOut > best.amountOut)) {
        best = { amountOut, gas: gasEstimate, fee: fees[i] };
      }
    }
  });
  return best;
}

// ─── Main quote function ────────────────────────────────────────
export async function getMulticallQuotes(params: SwapParams): Promise<SwapQuote[]> {
  const tIn  = (params.tokenIn  === NATIVE_ETH ? WETH : params.tokenIn)  as `0x${string}`;
  const tOut = (params.tokenOut === NATIVE_ETH ? WETH : params.tokenOut) as `0x${string}`;
  const amt  = params.amountIn;

  const sushiPath = tIn === WETH || tOut === WETH
    ? [tIn, tOut]
    : [tIn, WETH, tOut];

  // Run V3 quoters (parallel readContract) + view multicall simultaneously
  const [uniResult, pancakeResult, viewResults] = await Promise.allSettled([
    getBestV3Quote(UNISWAP_QUOTER, tIn, tOut, amt, UNI_FEES),
    getBestV3Quote(PANCAKE_QUOTER, tIn, tOut, amt, PANCAKE_FEES),
    client.multicall({
      contracts: [
        // Aerodrome stable
        {
          address:      AERODROME_ROUTER,
          abi:          AERODROME_ABI,
          functionName: "getAmountsOut" as const,
          args:         [amt, [{ from: tIn, to: tOut, stable: true,  factory: AERO_FACTORY }]],
        },
        // Aerodrome volatile
        {
          address:      AERODROME_ROUTER,
          abi:          AERODROME_ABI,
          functionName: "getAmountsOut" as const,
          args:         [amt, [{ from: tIn, to: tOut, stable: false, factory: AERO_FACTORY }]],
        },
        // SushiSwap
        {
          address:      SUSHI_ROUTER,
          abi:          SUSHI_ABI,
          functionName: "getAmountsOut" as const,
          args:         [amt, sushiPath],
        },
      ],
      allowFailure: true,
    }),
  ]);

  const quotes: SwapQuote[] = [];

  // ── Uniswap V3 ──────────────────────────────────────────────
  if (uniResult.status === "fulfilled" && uniResult.value) {
    const { amountOut, gas, fee } = uniResult.value;
    quotes.push({
      dex: "UNISWAP_V3", dexName: "Uniswap V3",
      amountOut, amountOutFormatted: formatTokenAmount(amountOut, params.decimalsOut),
      priceImpact: 0.1, estimatedGas: gas, estimatedGasUsd: 0,
      routePath: [params.tokenIn, params.tokenOut], fee,
    });
  }

  // ── PancakeSwap V3 ───────────────────────────────────────────
  if (pancakeResult.status === "fulfilled" && pancakeResult.value) {
    const { amountOut, gas, fee } = pancakeResult.value;
    quotes.push({
      dex: "PANCAKESWAP_V3", dexName: "PancakeSwap V3",
      amountOut, amountOutFormatted: formatTokenAmount(amountOut, params.decimalsOut),
      priceImpact: 0.15, estimatedGas: gas, estimatedGasUsd: 0,
      routePath: [params.tokenIn, params.tokenOut], fee,
    });
  }

  // ── Aerodrome + SushiSwap (from multicall) ───────────────────
  if (viewResults.status === "fulfilled") {
    const [aeroStable, aeroVolatile, sushi] = viewResults.value;

    // Aerodrome — best of stable/volatile
    let aeroBest: { amountOut: bigint; isStable: boolean } | null = null;
    for (const [r, isStable] of [[aeroStable, true], [aeroVolatile, false]] as const) {
      if (r.status === "success" && r.result) {
        const amounts   = r.result as bigint[];
        const amountOut = amounts[amounts.length - 1];
        if (amountOut > 0n && (!aeroBest || amountOut > aeroBest.amountOut)) {
          aeroBest = { amountOut, isStable };
        }
      }
    }
    if (aeroBest) {
      const { amountOut, isStable } = aeroBest;
      quotes.push({
        dex: "AERODROME", dexName: "Aerodrome",
        amountOut, amountOutFormatted: formatTokenAmount(amountOut, params.decimalsOut),
        priceImpact: 0.05, estimatedGas: 180_000n, estimatedGasUsd: 0,
        routePath: [params.tokenIn, params.tokenOut],
        fee: isStable ? 5 : 30,
      });
    }

    // SushiSwap
    if (sushi.status === "success" && sushi.result) {
      const amounts   = sushi.result as bigint[];
      const amountOut = amounts[amounts.length - 1];
      if (amountOut > 0n) {
        quotes.push({
          dex: "SUSHISWAP", dexName: "SushiSwap",
          amountOut, amountOutFormatted: formatTokenAmount(amountOut, params.decimalsOut),
          priceImpact: 0.3, estimatedGas: 150_000n, estimatedGasUsd: 0,
          routePath: sushiPath, fee: 30,
        });
      }
    }
  }

  return quotes.sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));
}
