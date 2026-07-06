/**
 * onchainQuote.ts
 *
 * Fetches swap quotes directly from Base contracts — no API round-trip.
 * Runs in the browser via wagmi's usePublicClient or in API routes via viemClient.
 *
 * DEX contracts on Base mainnet:
 *  - Uniswap V3 Quoter:     0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a  ← Fix 2: was 0x3d4e44Eb1374240CE5F1B136cf7571f040a7D0B4 (wrong)
 *  - PancakeSwap V3 Quoter: 0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997
 *  - Aerodrome Router:      0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43
 *  - SushiSwap Router:      0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891
 */

import type { Abi, PublicClient } from "viem"; // Fix 1: added Abi — required for `satisfies Abi` on AERO_ABI / SUSHI_ABI
import { formatTokenAmount } from "@/lib/utils";
import type { SwapParams, SwapQuote } from "@/types/swap";
import { DEX_BY_ID, AERODROME_FACTORY } from "@/constants/dex-registry";

// ── Constants ─────────────────────────────────────────────────────────────────
const WETH         = "0x4200000000000000000000000000000000000006" as `0x${string}`;
const UNI_QUOTER   = DEX_BY_ID["UNISWAP_V3"].quoterAddress!   as `0x${string}`;
const PCS_QUOTER   = DEX_BY_ID["PANCAKESWAP_V3"].quoterAddress! as `0x${string}`;
const AERO_ROUTER  = DEX_BY_ID["AERODROME"].routerAddress      as `0x${string}`;
const SUSHI_ROUTER = DEX_BY_ID["SUSHISWAP"].routerAddress      as `0x${string}`;

const UNI_FEES = [100, 500, 3000, 10000] as const;
const PCS_FEES = [100, 500, 2500, 10000] as const; // PancakeSwap uses 2500 not 3000

// ── Quote cache (15s TTL) ─────────────────────────────────────────────────────
interface CacheEntry { value: SwapQuote[]; ts: number }
const quoteCache = new Map<string, CacheEntry>();
const QUOTE_TTL  = 15_000;

function cacheKey(p: SwapParams): string {
  // Fix 4: include decimalsIn — same token pair with different decimalsIn would otherwise collide
  return `${p.tokenIn}-${p.tokenOut}-${p.amountIn}-${p.decimalsIn}-${p.decimalsOut}`;
}

// ── ABIs ──────────────────────────────────────────────────────────────────────
const AERO_ABI = [{
  name: "getAmountsOut",
  type: "function",
  stateMutability: "view",
  inputs: [
    { name: "amountIn", type: "uint256" },
    { name: "routes", type: "tuple[]", components: [
      { name: "from",    type: "address" },
      { name: "to",      type: "address" },
      { name: "stable",  type: "bool"    },
      { name: "factory", type: "address" },
    ]},
  ],
  outputs: [{ name: "amounts", type: "uint256[]" }],
}] as const satisfies Abi;

const SUSHI_ABI = [{
  name: "getAmountsOut",
  type: "function",
  stateMutability: "view",
  inputs: [
    { name: "amountIn", type: "uint256" },
    { name: "path",     type: "address[]" },
  ],
  outputs: [{ name: "amounts", type: "uint256[]" }],
}] as const satisfies Abi;

// ── Raw eth_call for V3 QuoterV2 ─────────────────────────────────────────────
// Manual hex encoding — no ABI offset pointers, matches what QuoterV2 expects.
// Omits `from` field to avoid zero-address revert.
// Selector: quoteExactInputSingle((address,address,uint256,uint24,uint160)) = 0xc6a5026a
function pad20(addr: string) { return "000000000000000000000000" + addr.replace("0x","").toLowerCase(); }
function pad32(n: bigint)    { return n.toString(16).padStart(64,"0"); }
function pad24(n: number)    { return BigInt(n).toString(16).padStart(64,"0"); }

const V3_QUOTE_SEL = "c6a5026a";

async function rawQuoteV3(
  client:   PublicClient,
  quoter:   `0x${string}`,
  tIn:      string,
  tOut:     string,
  amtIn:    bigint,
  fee:      number,
): Promise<{ amountOut: bigint; gas: bigint } | null> {
  const data = ("0x" + V3_QUOTE_SEL
    + pad20(tIn)
    + pad20(tOut)
    + pad32(amtIn)
    + pad24(fee)
    + pad32(0n)) as `0x${string}`;
  
  // Retry logic for reliability
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Pass account: undefined to prevent wagmi injecting the connected wallet
      // as `from` — QuoterV2 reverts when called from non-zero addresses
      const r = await client.call({ to: quoter, data, account: undefined });
      if (!r.data || r.data === "0x") {
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 300)); // Wait 300ms before retry
          continue;
        }
        return null;
      }
      const hex = r.data.slice(2);
      if (hex.length < 64) return null;
      const amountOut   = BigInt("0x" + hex.slice(0, 64));
      // gasEstimate is the 4th return value (slot index 3, bytes 192-256)
      const gasEstimate = hex.length >= 256 ? BigInt("0x" + hex.slice(192, 256)) : 150_000n;
      return amountOut > 0n ? { amountOut, gas: gasEstimate } : null;
    } catch (err) {
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 300)); // Wait before retry
        continue;
      }
      console.warn(`[rawQuoteV3] Failed after retry:`, err);
      return null;
    }
  }
  return null;
}

// Both DEXes use the same selector and ABI encoding
const rawQuoteUni = rawQuoteV3;
const rawQuotePCS = rawQuoteV3;

type RawQuoteFn = (
  client: PublicClient, quoter: `0x${string}`, tIn: string, tOut: string, amt: bigint, fee: number
) => Promise<{ amountOut: bigint; gas: bigint } | null>;

async function bestV3(
  client:  PublicClient,
  quoter:  `0x${string}`,
  tIn:     string,
  tOut:    string,
  amt:     bigint,
  fees:    readonly number[],
  rawFn:   RawQuoteFn,
): Promise<{ amountOut: bigint; gas: bigint; fee: number } | null> {
  const results = await Promise.all(
    fees.map(fee => rawFn(client, quoter, tIn, tOut, amt, fee).then(r => r ? { ...r, fee } : null))
  );
  return results
    .filter((r): r is { amountOut: bigint; gas: bigint; fee: number } => r !== null)
    .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1))[0] ?? null;
}

/** Two-hop: tokenIn → WETH → tokenOut (for illiquid direct pairs) */
async function bestV3TwoHop(
  client: PublicClient,
  quoter: `0x${string}`,
  tIn:    string,
  tOut:   string,
  amt:    bigint,
  fees:   readonly number[],
  rawFn:  RawQuoteFn,
): Promise<{ amountOut: bigint; gas: bigint; fee: number } | null> {
  if (tIn.toLowerCase() === WETH.toLowerCase() || tOut.toLowerCase() === WETH.toLowerCase()) return null;
  const hop1 = await bestV3(client, quoter, tIn, WETH, amt, fees, rawFn);
  if (!hop1) return null;
  const hop2 = await bestV3(client, quoter, WETH, tOut, hop1.amountOut, fees, rawFn);
  if (!hop2) return null;
  return { amountOut: hop2.amountOut, gas: hop1.gas + hop2.gas + 50_000n, fee: hop1.fee };
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function getOnchainQuotes(
  client: PublicClient,
  params: SwapParams,
): Promise<SwapQuote[]> {
  // Cache hit
  const key    = cacheKey(params);
  const cached = quoteCache.get(key);
  if (cached && Date.now() - cached.ts < QUOTE_TTL) return cached.value;

  const tIn  = (params.tokenIn  === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? WETH : params.tokenIn)  as `0x${string}`;
  const tOut = (params.tokenOut === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? WETH : params.tokenOut) as `0x${string}`;
  const amt  = params.amountIn;

  const useHop    = tIn.toLowerCase() !== WETH.toLowerCase() && tOut.toLowerCase() !== WETH.toLowerCase();
  const sushiPath = useHop ? [tIn, WETH, tOut] : [tIn, tOut];

  // Build all multicall contracts (view-only: Aerodrome + Sushi)
  const viewContracts = [
    { address: AERO_ROUTER, abi: AERO_ABI, functionName: "getAmountsOut" as const,
      args: [amt, [{ from: tIn, to: tOut, stable: true,  factory: AERODROME_FACTORY }]] as const },
    { address: AERO_ROUTER, abi: AERO_ABI, functionName: "getAmountsOut" as const,
      args: [amt, [{ from: tIn, to: tOut, stable: false, factory: AERODROME_FACTORY }]] as const },
    ...(useHop ? [{
      address: AERO_ROUTER, abi: AERO_ABI, functionName: "getAmountsOut" as const,
      args: [amt, [
        { from: tIn,  to: WETH, stable: false, factory: AERODROME_FACTORY },
        { from: WETH, to: tOut, stable: false, factory: AERODROME_FACTORY },
      ]] as const,
    }] : []),
    { address: SUSHI_ROUTER, abi: SUSHI_ABI, functionName: "getAmountsOut" as const,
      args: [amt, sushiPath] as const },
  ] as const;

  // Fire V3 quoters + view multicall in parallel
  // Uniswap uses raw eth_call (nonpayable); PancakeSwap uses readContract (proper ABI)
  const [uniDirectRes, pcsDirectRes, uniHopRes, pcsHopRes, viewRes] = await Promise.allSettled([
    bestV3(client, UNI_QUOTER, tIn, tOut, amt, UNI_FEES, rawQuoteUni),
    bestV3(client, PCS_QUOTER, tIn, tOut, amt, PCS_FEES, rawQuotePCS),
    bestV3TwoHop(client, UNI_QUOTER, tIn, tOut, amt, UNI_FEES, rawQuoteUni),
    bestV3TwoHop(client, PCS_QUOTER, tIn, tOut, amt, PCS_FEES, rawQuotePCS),
    client.multicall({ contracts: viewContracts as Parameters<typeof client.multicall>[0]["contracts"], allowFailure: true }),
  ]);

  const quotes: SwapQuote[] = [];

  // Pick best between direct and two-hop for each V3 DEX
  function pickBestV3(
    directRes: typeof uniDirectRes,
    hopRes:    typeof uniHopRes,
    dex:       SwapQuote["dex"],
    dexName:   string,
    impact:    number,
  ) {
    const d = directRes.status === "fulfilled" ? directRes.value : null;
    const h = hopRes.status    === "fulfilled" ? hopRes.value    : null;
    const best = (d && h) ? (d.amountOut >= h.amountOut ? d : h)
               : d ?? h;
    if (!best) return;
    const isHop = best === h && h !== null;
    quotes.push({
      dex, dexName,
      amountOut: best.amountOut,
      amountOutFormatted: formatTokenAmount(best.amountOut, params.decimalsOut),
      priceImpact: isHop ? impact + 0.05 : impact,
      estimatedGas: best.gas, estimatedGasUsd: 0,
      routePath: isHop ? [params.tokenIn, WETH, params.tokenOut] : [params.tokenIn, params.tokenOut],
      fee: best.fee,
    });
  }

  pickBestV3(uniDirectRes, uniHopRes, "UNISWAP_V3",     DEX_BY_ID["UNISWAP_V3"].name,     0.10);
  pickBestV3(pcsDirectRes, pcsHopRes, "PANCAKESWAP_V3", DEX_BY_ID["PANCAKESWAP_V3"].name, 0.15);

  // Aerodrome + Sushi from multicall
  if (viewRes.status === "fulfilled") {
    const res      = viewRes.value as { status: string; result?: unknown }[];
    const stableR  = res[0];
    const volatileR = res[1];
    const hopR     = useHop ? res[2] : null;
    const sushiR   = res[useHop ? 3 : 2];

    let aeroBest: bigint | null = null;
    for (const r of [stableR, volatileR, hopR]) {
      if (r?.status === "success" && r.result) {
        const arr = r.result as bigint[];
        const out = arr[arr.length - 1];
        if (out > 0n && (!aeroBest || out > aeroBest)) aeroBest = out;
      }
    }
    if (aeroBest) {
      quotes.push({
        dex: "AERODROME", dexName: DEX_BY_ID["AERODROME"].name,
        amountOut: aeroBest,
        amountOutFormatted: formatTokenAmount(aeroBest, params.decimalsOut),
        priceImpact: 0.05, estimatedGas: 180_000n, estimatedGasUsd: 0,
        routePath: [params.tokenIn, params.tokenOut], fee: 30,
      });
    }

    if (sushiR?.status === "success" && sushiR.result) {
      const arr = sushiR.result as bigint[];
      const out = arr[arr.length - 1];
      if (out > 0n) {
        quotes.push({
          dex: "SUSHISWAP", dexName: DEX_BY_ID["SUSHISWAP"].name,
          amountOut: out,
          amountOutFormatted: formatTokenAmount(out, params.decimalsOut),
          priceImpact: 0.30, estimatedGas: 200_000n, estimatedGasUsd: 0,
          routePath: sushiPath, fee: 30,
        });
      }
    }
  }

  const sorted = quotes.sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));
  quoteCache.set(key, { value: sorted, ts: Date.now() });
  return sorted;
}
