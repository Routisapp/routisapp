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

const ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43" as const;

const ROUTER_ABI = [
  {
    name: "getAmountsOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      {
        name: "routes",
        type: "tuple[]",
        components: [
          { name: "from",   type: "address" },
          { name: "to",     type: "address" },
          { name: "stable", type: "bool"    },
          { name: "factory",type: "address" },
        ],
      },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

const DEFAULT_FACTORY = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da" as const;


export async function getAerodromeQuote(params: SwapParams): Promise<SwapQuote> {
  const tokenIn  = params.tokenIn  === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
    ? "0x4200000000000000000000000000000000000006"
    : params.tokenIn;
  const tokenOut = params.tokenOut === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
    ? "0x4200000000000000000000000000000000000006"
    : params.tokenOut;

  // Try stable and volatile pools
  const [stableResult, volatileResult] = await Promise.allSettled([
    publicClient.readContract({
      address: ROUTER,
      abi:     ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [params.amountIn, [{ from: tokenIn as `0x${string}`, to: tokenOut as `0x${string}`, stable: true,  factory: DEFAULT_FACTORY }]],
    }),
    publicClient.readContract({
      address: ROUTER,
      abi:     ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [params.amountIn, [{ from: tokenIn as `0x${string}`, to: tokenOut as `0x${string}`, stable: false, factory: DEFAULT_FACTORY }]],
    }),
  ]);

  let best: bigint | null = null;
  let isStable = false;

  if (stableResult.status   === "fulfilled") { const v = (stableResult.value   as bigint[])[1]; if (!best || v > best) { best = v; isStable = true;  } }
  if (volatileResult.status === "fulfilled") { const v = (volatileResult.value as bigint[])[1]; if (!best || v > best) { best = v; isStable = false; } }

  if (!best) throw new Error("Aerodrome: no liquidity");

  return {
    dex:                "AERODROME",
    dexName:            "Aerodrome",
    amountOut:          best,
    amountOutFormatted: formatTokenAmount(best, params.decimalsOut),
    priceImpact:        0.05,
    estimatedGas:       180_000n,
    estimatedGasUsd:    0,
    routePath:          [params.tokenIn, params.tokenOut],
    fee:                isStable ? 5 : 30,   // 0.05% stable / 0.30% volatile
  };
}
