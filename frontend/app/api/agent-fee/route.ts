/**
 * /api/agent-fee — x402 korumalı fee endpoint
 * 0.1 USDC Base mainnet, CDP Facilitator via @x402/next
 */
import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { createFacilitatorConfig } from "@coinbase/x402";
import { createPrivateKey } from "crypto";

export const dynamic = "force-dynamic";

const TREASURY = (
  process.env.ROUTIS_TREASURY_ADDRESS ??
  process.env.X402_PAY_TO ??
  "0xd6A895d67eAc925Faa0C9789Cb1A5CE248Bc52d0"
) as `0x${string}`;

// SEC1 PEM → PKCS#8 PEM (CDP portal SEC1 indiriyor, generateJwt PKCS#8 bekliyor)
function sec1ToPkcs8(pem: string): string {
  try {
    const key = createPrivateKey({ key: pem, format: "pem" });
    return key.export({ type: "pkcs8", format: "pem" }) as string;
  } catch {
    return pem;
  }
}

const cdpKeyId  = process.env.CDP_API_KEY_ID ?? "";
let   rawSecret = process.env.CDP_API_KEY_SECRET ?? "";
if (rawSecret.includes("BEGIN EC PRIVATE KEY")) {
  rawSecret = sec1ToPkcs8(rawSecret);
}

const cdpKeyValid = cdpKeyId.length > 0 && !cdpKeyId.includes("ORG_ID") && rawSecret.length > 0;
const facilitatorConfig = cdpKeyValid
  ? createFacilitatorConfig(cdpKeyId, rawSecret)
  : { url: "https://x402.org/facilitator" };
const network = cdpKeyValid ? "eip155:8453" : "eip155:84532";

const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);
const server = new x402ResourceServer(facilitatorClient).register(network, new ExactEvmScheme());

const agentFeeHandler = async (_req: NextRequest): Promise<NextResponse> =>
  NextResponse.json({ ok: true });

export const POST = withX402(
  agentFeeHandler,
  {
    accepts: {
      scheme:            "exact",
      price:             "$0.20",
      network,
      payTo:             TREASURY,
      maxTimeoutSeconds: 300,
    },
    description: "Routis AI Agent — swap route fee (0.1 USDC)",
    mimeType:    "application/json",
  },
  server,
);
