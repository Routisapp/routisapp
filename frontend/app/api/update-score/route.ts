import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/update-score
 * Body: { userAddress: string, score: number }
 *
 * Supabase is the source of truth for scores.
 * On-chain score sync removed — badges are off-chain (Supabase only).
 * This endpoint is kept as a no-op stub so existing callers don't break.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Internal secret check ──────────────────────────────────────────────
    const secret         = req.headers.get("x-internal-secret");
    const expectedSecret = process.env.INTERNAL_API_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse & validate body ──────────────────────────────────────────────
    const body = await req.json() as { userAddress?: string; score?: number };
    const { userAddress, score } = body;

    if (!userAddress || typeof score !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: userAddress (string), score (number)" },
        { status: 400 },
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 });
    }

    // Scores are stored in Supabase — no on-chain write needed.
    return NextResponse.json({ success: true, userAddress, score });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[update-score] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
