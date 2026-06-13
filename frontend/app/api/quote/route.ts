import { NextRequest, NextResponse } from "next/server";
import { getMulticallQuotes } from "@/lib/dex/multicallQuote";
import type { SwapParams } from "@/types/swap";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tokenIn     = searchParams.get("tokenIn");
  const tokenOut    = searchParams.get("tokenOut");
  const amountIn    = searchParams.get("amountIn");
  const decimalsIn  = searchParams.get("decimalsIn");
  const decimalsOut = searchParams.get("decimalsOut");

  if (!tokenIn || !tokenOut || !amountIn || !decimalsIn || !decimalsOut) {
    return NextResponse.json(
      { error: "Missing params: tokenIn, tokenOut, amountIn, decimalsIn, decimalsOut" },
      { status: 400 },
    );
  }

  const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const WETH       = "0x4200000000000000000000000000000000000006";

  const params: SwapParams = {
    tokenIn:     tokenIn  === NATIVE_ETH ? WETH : tokenIn,
    tokenOut:    tokenOut === NATIVE_ETH ? WETH : tokenOut,
    amountIn:    BigInt(amountIn),
    decimalsIn:  Number(decimalsIn),
    decimalsOut: Number(decimalsOut),
  };

  // Single multicall — all DEXes in ONE RPC request
  const quotes = await getMulticallQuotes(params);

  const serialized = quotes.map(q => ({
    ...q,
    amountOut:    q.amountOut.toString(),
    estimatedGas: q.estimatedGas.toString(),
  }));

  return NextResponse.json({ quotes: serialized, count: serialized.length });
}
