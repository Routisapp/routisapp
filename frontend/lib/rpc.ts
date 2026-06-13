import { http, fallback } from "viem";

/**
 * Server-side only RPC transport for API routes (/api/quote).
 * These run on Node.js — no CORS restriction.
 * Never imported by client-side components.
 */
const RPC_URLS = [
  process.env.BASE_RPC_URL,           // server-only env var
  "https://base-rpc.publicnode.com",  // reliable public node
  "https://base.gateway.tenderly.co", // tenderly fallback
].filter(Boolean) as string[];

export const BASE_RPC_URLS = RPC_URLS;

export const baseTransport = fallback(
  RPC_URLS.map((url) =>
    http(url, { timeout: 10_000, retryCount: 2, retryDelay: 500 }),
  ),
  { rank: false },
);
