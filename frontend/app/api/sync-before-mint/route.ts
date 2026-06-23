import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/sync-before-mint
 * Body: { userAddress: string, score: number }
 *
 * Proxies to /api/update-score with the internal secret (server-side only).
 * Called by the mint page before writeContract() to ensure on-chain score is current.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { userAddress?: string; score?: number };
    const { userAddress, score } = body;

    if (!userAddress || typeof score !== "number") {
      return NextResponse.json({ error: "Missing userAddress or score" }, { status: 400 });
    }

    // Server-side: use VERCEL_URL (auto-set by Vercel) or fallback to localhost
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
    const secret  = process.env.INTERNAL_API_SECRET ?? "";

    const res = await fetch(`${baseUrl}/api/update-score`, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ userAddress, score }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? "Sync failed" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync-before-mint] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
