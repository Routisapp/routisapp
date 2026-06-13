import type { SwapParams, SwapQuote } from "@/types/swap";
import { formatTokenAmount } from "@/lib/utils";
import { createPublicClient, http } from "viem";
import { base } from "wagmi/chains";

// PancakeSwap V3 Quoter on Base mainnet
const QUOTER = "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997" as const;

const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.BASE_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    "https://base-rpc.publicnode.com",
  ),
});

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
const FEE_TIERS = [500, 2500, 10000, 100] as const; // most liquid first


export async function getPancakeSwapV3Quote(params: SwapParams): Promise<SwapQuote> {
  const tokenIn  = params.tokenIn  === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? WETH : params.tokenIn  as `0x${string}`;
  const tokenOut = params.tokenOut === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? WETH : params.tokenOut as `0x${string}`;

  const results = await Promise.allSettled(
    FEE_TIERS.map((fee) =>
      publicClient.readContract({
        address: QUOTER,
        abi:     QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        args: [{ tokenIn, tokenOut, amountIn: params.amountIn, fee, sqrtPriceLimitX96: 0n }],
      }),
    ),
  );

  let best: { amountOut: bigint; gas: bigint; fee: number } | null = null;

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      const [amountOut, , , gasEstimate] = r.value as [bigint, bigint, number, bigint];
      if (amountOut > 0n && (!best || amountOut > best.amountOut)) {
        best = { amountOut, gas: gasEstimate, fee: FEE_TIERS[i] };
      }
    }
  });

  if (!best) throw new Error("PancakeSwap V3: no liquidity");

  const { amountOut, gas, fee } = best as { amountOut: bigint; gas: bigint; fee: number };

  return {
    dex:                "PANCAKESWAP_V3",
    dexName:            "PancakeSwap V3",
    amountOut,
    amountOutFormatted: formatTokenAmount(amountOut, params.decimalsOut),
    priceImpact:        0.15,
    estimatedGas:       gas,
    estimatedGasUsd:    0,
    routePath:          [params.tokenIn, params.tokenOut],
    fee,
  };
}
