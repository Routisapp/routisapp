import { createPublicClient } from "viem";
import { base } from "wagmi/chains";
import { baseTransport } from "./rpc";

/**
 * Shared viem public client for Base mainnet.
 * Uses fallback RPC transport — auto-retries on failures.
 */
export const publicClient = createPublicClient({
  chain:     base,
  transport: baseTransport,
});
