/**
 * /api/quote — thin server-side fallback.
 *
 * The primary quote path is now client-side via useSwapQuotes → getOnchainQuotes.
 * This route is kept for any server-side callers (e.g. og-image, bots).
 */
import { NextRequest, NextResponse } from "next/server";
import { viemClient }       from "@/lib/viemClient";
import { getOnchainQuotes } from "@/lib/onchainQuote";
import type { SwapParams }  from "@/types/swap";

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

  // SECURITY: validate amountIn is a safe integer string before passing to BigInt
  if (!/^\d{1,78}$/.test(amountIn)) {
    return NextResponse.json({ error: "Invalid amountIn: must be a positive integer string" }, { status: 400 });
  }

  // SECURITY: validate token addresses are valid checksummed-like hex
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenIn) || !/^0x[a-fA-F0-9]{40}$/.test(tokenOut)) {
    return NextResponse.json({ error: "Invalid token address format" }, { status: 400 });
  }

  // SECURITY: validate decimals are safe numbers
  const decIn  = Number(decimalsIn);
  const decOut = Number(decimalsOut);
  if (!Number.isInteger(decIn) || !Number.isInteger(decOut) || decIn < 0 || decIn > 18 || decOut < 0 || decOut > 18) {
    return NextResponse.json({ error: "Invalid decimals: must be integer 0-18" }, { status: 400 });
  }

  const params: SwapParams = {
    tokenIn,
    tokenOut,
    amountIn:    BigInt(amountIn),
    decimalsIn:  decIn,
    decimalsOut: decOut,
  };

  const quotes = await getOnchainQuotes(viemClient, params);

  const serialized = quotes.map(q => ({
    ...q,
    amountOut:    q.amountOut.toString(),
    estimatedGas: q.estimatedGas.toString(),
  }));

  return NextResponse.json({ quotes: serialized, count: serialized.length });
}
