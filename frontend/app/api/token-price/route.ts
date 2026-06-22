/**
 * GET /api/token-price?address=0x...
 * Server-side token price lookup via Alchemy Token Prices API.
 * Keeps the API key server-side, never exposed to client.
 */

import { NextRequest, NextResponse } from "next/server";

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? "";
const WETH        = "0x4200000000000000000000000000000000000006";

// Price cache: address → { price, expiry }
const CACHE = new Map<string, { price: number; expiry: number }>();
const TTL   = 60 * 1000; // 1 minute

export async function GET(req: NextRequest) {
  const raw     = req.nextUrl.searchParams.get("address") ?? "";
  const address = raw.toLowerCase();

  if (!address) {
    return NextResponse.json({ price: 0 });
  }

  // Normalise native ETH → WETH
  const lookupAddress =
    address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ? WETH : address;

  // Check cache
  const cached = CACHE.get(lookupAddress);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json({ price: cached.price });
  }

  // 1. Alchemy Token Prices API
  if (ALCHEMY_KEY) {
    try {
      const res = await fetch(
        `https://api.g.alchemy.com/prices/v1/${ALCHEMY_KEY}/tokens/by-address`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            addresses: [{ network: "base-mainnet", address: lookupAddress }],
          }),
          cache: "no-store",
        },
      );
      if (res.ok) {
        const json = await res.json();
        const price = parseFloat(json?.data?.[0]?.prices?.[0]?.value ?? "0");
        if (price > 0) {
          CACHE.set(lookupAddress, { price, expiry: Date.now() + TTL });
          return NextResponse.json({ price });
        }
      }
    } catch { /* fall through */ }
  }

  // 2. Fallback: CoinGecko
  const COINGECKO_IDS: Record<string, string> = {
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ethereum",
    "0x4200000000000000000000000000000000000006": "ethereum",
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "usd-coin",
    "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": "dai",
    "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": "usd-coin",
    "0x940181a94a35a4569e4529a3cdfb74e38fd98631": "aerodrome-finance",
    "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf": "coinbase-wrapped-btc",
    "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22": "coinbase-wrapped-staked-eth",
  };
  const id = COINGECKO_IDS[address];
  if (id) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json() as Record<string, { usd: number }>;
        const price = data[id]?.usd ?? 0;
        if (price > 0) {
          CACHE.set(lookupAddress, { price, expiry: Date.now() + TTL });
          return NextResponse.json({ price });
        }
      }
    } catch { /* ignore */ }
  }

  return NextResponse.json({ price: 0 });
}
