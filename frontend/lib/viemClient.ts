/**
 * Singleton viem public client for Base mainnet.
 * Import this everywhere instead of creating a new client per module.
 * Works both server-side (API routes) and client-side (hooks).
 */
import { createPublicClient, http } from "viem";
import { base } from "wagmi/chains";

const RPC_URL =
  (typeof process !== "undefined" && process.env?.BASE_RPC_URL) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_RPC_URL) ||
  "https://mainnet.base.org";

export const viemClient = createPublicClient({
  chain:     base,
  transport: http(RPC_URL, { timeout: 15_000 }),
});
