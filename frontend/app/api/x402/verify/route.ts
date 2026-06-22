import { NextRequest, NextResponse } from "next/server";
import { createCdpAuthHeaders } from "@coinbase/x402";

export const dynamic = "force-dynamic";

/**
 * POST /api/x402/verify
 * CDP facilitator'a verify isteği gönderir.
 * createCdpAuthHeaders her istek için JWT (Bearer token) üretir — 2 dakika geçerli.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const cdpKeyId     = process.env.CDP_API_KEY_ID;
    const cdpKeySecret = process.env.CDP_API_KEY_SECRET;

    if (!cdpKeyId || !cdpKeySecret) {
      return NextResponse.json({ error: "CDP API keys not configured" }, { status: 503 });
    }

    // createCdpAuthHeaders her çağrıda yeni JWT imzalar
    const getAuthHeaders = createCdpAuthHeaders(cdpKeyId, cdpKeySecret);
    const authHeaders    = await getAuthHeaders();

    const facilitatorUrl = "https://api.cdp.coinbase.com/platform/v2/x402/verify";

    const res = await fetch(facilitatorUrl, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders.verify, // Authorization: Bearer <JWT> + Correlation-Context
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
