import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// x402 payment requirements for /api/agent
// EIP-3009 transferWithAuthorization — USDC on Base mainnet
export async function GET() {
  const payTo     = process.env.X402_PAY_TO ?? "0xd6A895d67eAc925Faa0C9789Cb1A5CE248Bc52d0";
  const network   = "eip155:8453"; // Base mainnet
  const usdcBase  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const price     = "100000"; // 0.1 USDC in atomic units (6 decimals)

  return NextResponse.json({
    scheme: "exact",
    network,
    maxAmountRequired: price,
    resource: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/agent`,
    description: "Routis AI Agent — swap route query",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 300,
    asset: usdcBase,
    outputSchema: null,
    extra: {
      name: "USD Coin",
      version: "2",
    },
  });
}
