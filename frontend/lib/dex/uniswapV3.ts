import type { SwapParams, SwapQuote } from "@/types/swap";
import { formatTokenAmount } from "@/lib/utils";
import { createPublicClient, http } from "viem";
import { base } from "wagmi/chains";

// Server-side only client — runs inside /api/quote route, no CORS
const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.BASE_RPC_URL ||           // server-only (no NEXT_PUBLIC_)
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    "https://base-rpc.publicnode.com",
  ),
});

const QUOTER_V2 = "0x3d4e44Eb1374240CE5F1B136244b0E8B0f69A6F3" as const;

// Most liquid pools first: 500 (0.05%) and 3000 (0.3%) have the deepest liquidity on Base
// 100 (0.01%) is stablecoin-only, 10000 (1%) is exotic pairs
const FEE_TIERS = [500, 3000, 10000, 100] as const;

const QUOTER_ABI = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{
      name: "params",
      type: "tuple",
      components: [
        { name: "tokenIn",           type: "address" },
        { name: "tokenOut",          type: "address" },
        { name: "amountIn",          type: "uint256" },
        { name: "fee",               type: "uint24"  },
        { name: "sqrtPriceLimitX96", type: "uint160" },
      ],
    }],
    outputs: [
      { name: "amountOut",               type: "uint256" },
      { name: "sqrtPriceX96After",       type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32"  },
      { name: "gasEstimate",             type: "uint256" },
    ],
  },
] as const;


const WETH = "0x4200000000000000000000000000000000000006" as const;
const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export async function getUniswapV3Quote(params: SwapParams): Promise<SwapQuote> {
  const tokenIn  = params.tokenIn  === NATIVE_ETH ? WETH : params.tokenIn  as `0x${string}`;
  const tokenOut = params.tokenOut === NATIVE_ETH ? WETH : params.tokenOut as `0x${string}`;

  // Query all fee tiers in parallel, pick best amountOut
  const results = await Promise.allSettled(
    FEE_TIERS.map((fee) =>
      publicClient.readContract({
        address:      QUOTER_V2,
        abi:          QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        args: [{
          tokenIn,
          tokenOut,
          amountIn:          params.amountIn,
          fee,
          sqrtPriceLimitX96: 0n,
        }],
      }),
    ),
  );

  let best: { amountOut: bigint; gas: bigint; fee: number } | null = null;

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      const [amountOut, , , gasEstimate] = r.value as [bigint, bigint, number, bigint];
      // Only accept non-zero quotes
      if (amountOut > 0n && (!best || amountOut > best.amountOut)) {
        best = { amountOut, gas: gasEstimate, fee: FEE_TIERS[i] };
      }
    }
  });

  if (!best) throw new Error("Uniswap V3: no liquidity on any fee tier");

  const { amountOut, gas, fee } = best as { amountOut: bigint; gas: bigint; fee: number };

  return {
    dex:                "UNISWAP_V3",
    dexName:            "Uniswap V3",
    amountOut,
    amountOutFormatted: formatTokenAmount(amountOut, params.decimalsOut),
    priceImpact:        0.1,
    estimatedGas:       gas,
    estimatedGasUsd:    0,
    routePath:          [params.tokenIn, params.tokenOut],
    fee, // exact fee tier used — critical for execute
  };
}
