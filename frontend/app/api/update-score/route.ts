import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

export const dynamic = "force-dynamic";

// ─── ABI (only what we need) ──────────────────────────────────────────────────
const NFT_ABI = parseAbi([
  "function updateScore(address user, uint256 score) external",
  "function userScores(address user) external view returns (uint256)",
]);

// ─── Shared clients (created once per request) ───────────────────────────────
function getClients() {
  const privateKey = process.env.OWNER_PRIVATE_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_TRADER_NFT_ADDRESS as `0x${string}`;
  const rpcUrl = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

  if (!privateKey) throw new Error("OWNER_PRIVATE_KEY not set");
  if (!contractAddress) throw new Error("NEXT_PUBLIC_TRADER_NFT_ADDRESS not set");

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  return { walletClient, publicClient, account, contractAddress };
}

// ─── POST /api/update-score ───────────────────────────────────────────────────
/**
 * Body: { userAddress: string, score: number }
 *
 * Called internally after insertSwapRecord() or addMintScore() updates Supabase.
 * Writes the new score on-chain via updateScore(user, score).
 *
 * Security:
 *  - OWNER_PRIVATE_KEY is server-side only (no NEXT_PUBLIC_ prefix)
 *  - Requests must include the internal API secret header
 */
export async function POST(req: NextRequest) {
  try {
    // ── Internal secret check ──────────────────────────────────────────────
    const secret = req.headers.get("x-internal-secret");
    const expectedSecret = process.env.INTERNAL_API_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse body ─────────────────────────────────────────────────────────
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

    if (score < 0 || !Number.isInteger(score)) {
      return NextResponse.json({ error: "Score must be a non-negative integer" }, { status: 400 });
    }

    // ── Call contract ──────────────────────────────────────────────────────
    const { walletClient, publicClient, contractAddress } = getClients();

    const txHash = await walletClient.writeContract({
      address:      contractAddress,
      abi:          NFT_ABI,
      functionName: "updateScore",
      args:         [userAddress as `0x${string}`, BigInt(score)],
    });

    // Wait for confirmation (1 block)
    const receipt = await publicClient.waitForTransactionReceipt({
      hash:               txHash,
      confirmations:      1,
      pollingInterval:    2_000,
      retryCount:         10,
    });

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      userAddress,
      score,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[update-score] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
