import type { SwapParams, SwapQuote } from "@/types/swap";
import { formatTokenAmount } from "@/lib/utils";
import { createPublicClient, http } from "viem";
import { base } from "wagmi/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.BASE_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    "https://base-rpc.publicnode.com",
  ),
});

const ROUTER = "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891" as const;

const ROUTER_ABI = [
  {
    name: "getAmountsOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path",     type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

const WETH = "0x4200000000000000000000000000000000000006" as const;


export async function getSushiSwapQuote(params: SwapParams): Promise<SwapQuote> {
  const tokenIn  = params.tokenIn  === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? WETH : params.tokenIn  as `0x${string}`;
  const tokenOut = params.tokenOut === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? WETH : params.tokenOut as `0x${string}`;

  const path = tokenIn === WETH || tokenOut === WETH
    ? [tokenIn, tokenOut]
    : [tokenIn, WETH, tokenOut];

  const amounts = await publicClient.readContract({
    address:      ROUTER,
    abi:          ROUTER_ABI,
    functionName: "getAmountsOut",
    args:         [params.amountIn, path],
  }) as bigint[];

  const amountOut = amounts[amounts.length - 1];

  return {
    dex:                "SUSHISWAP",
    dexName:            "SushiSwap",
    amountOut,
    amountOutFormatted: formatTokenAmount(amountOut, params.decimalsOut),
    priceImpact:        0.3,
    estimatedGas:       150_000n,
    estimatedGasUsd:    0,
    routePath:          path,
    fee:                30,   // 0.30%
  };
}
