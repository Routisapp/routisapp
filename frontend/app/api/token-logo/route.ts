import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SOURCES = [
  (address: string) => `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/${address}/logo.png`,
  (address: string) => `https://tokens.1inch.io/${address}.png`,
  (address: string) => `https://assets.coingecko.com/coins/images/small/${address}.png`,
];

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  // SECURITY: validate address is a valid ERC-20/EOA hex address before using in URLs
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address format" }, { status: 400 });
  }

  for (const source of SOURCES) {
    try {
      const res = await fetch(source(address), { method: "HEAD" });
      if (res.ok) return NextResponse.redirect(source(address));
    } catch {
      // try next source
    }
  }

  // fallback placeholder
  return NextResponse.redirect(
    new URL(`/icons/token-placeholder.svg`, req.nextUrl.origin),
  );
}
