/**
 * dex-registry.ts
 *
 * SINGLE SOURCE OF TRUTH for every DEX integrated into Agex aggregator.
 *
 * To add a new DEX:
 *   1. Add one entry to SUPPORTED_DEXES below.
 *   2. Add the corresponding execution logic in useSwapExecute.ts
 *      (the ABI + writeContractAsync call for that DEX's router).
 *   3. Add the quote logic in lib/onchainQuote.ts.
 *   No other file needs to change — all DEX names, addresses, icons,
 *   colors, and abbreviations are derived from this registry.
 */

import type { DexKey } from "@/types/swap";

export interface DexConfig {
  /** Enum key — must match DexKey in types/swap.ts */
  id:            DexKey;
  /** Human-readable display name stored in swap_records.dex */
  name:          string;
  /** Brand color (hex) — used in QuoteList fallback avatar and accents */
  color:         string;
  /** Short ticker abbreviation for small-space displays */
  abbr:          string;
  /**
   * Logo URL or inline data-URI.
   * Use a reliable CDN or data-URI; onError fallbacks to colored abbr avatar.
   */
  logoUrl:       string;
  /**
   * Swap router address on Base mainnet.
   * This is the address users approve and the contract that executes swaps.
   * Verified on BaseScan — see inline comments.
   */
  routerAddress: `0x${string}`;
  /**
   * Quoter address (V3 DEXes only).
   * Used by onchainQuote.ts to fetch price quotes without executing a swap.
   * Leave undefined for AMM DEXes that use getAmountsOut instead.
   */
  quoterAddress?: `0x${string}`;
}

// ─── Registry ──────────────────────────────────────────────────────────────────
export const SUPPORTED_DEXES: DexConfig[] = [
  {
    id:            "UNISWAP_V3",
    name:          "Uniswap V3",
    color:         "#FF007A",
    abbr:          "UNI",
    // /large/ = 250×250px — crisp at any node size. /thumb/ = 32×32px (blurry when scaled up)
    // Source: https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png
    logoUrl:       "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
    routerAddress: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterAddress: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
  },
  {
    id:            "PANCAKESWAP_V3",
    name:          "PancakeSwap V3",
    color:         "#1FC7D4",
    abbr:          "CAKE",
    // Local file in /public — original PancakeSwap logo
    logoUrl:       "/pancakeswap.png",
    routerAddress: "0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86",
    quoterAddress: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
  },
  {
    id:            "AERODROME",
    name:          "Aerodrome",
    color:         "#C9693A",
    abbr:          "AERO",
    // /large/ = 250×250px
    // Source: https://assets.coingecko.com/coins/images/31745/large/token.png
    logoUrl:       "https://assets.coingecko.com/coins/images/31745/large/token.png",
    routerAddress: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
  },
  {
    id:            "SUSHISWAP",
    name:          "SushiSwap",
    color:         "#FA52A0",
    abbr:          "SUSHI",
    // /large/ = 250×250px
    // Source: https://assets.coingecko.com/coins/images/12271/large/512x512_Logo_no_chop.png
    logoUrl:       "https://assets.coingecko.com/coins/images/12271/large/512x512_Logo_no_chop.png",
    routerAddress: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891",
  },
];

// ─── Derived lookup maps (computed once, used throughout the app) ──────────────

/** id → full config */
export const DEX_BY_ID: Record<DexKey, DexConfig> = Object.fromEntries(
  SUPPORTED_DEXES.map(d => [d.id, d])
) as Record<DexKey, DexConfig>;

/** id → router address  (replaces DEX_ROUTERS from dex-addresses.ts) */
export const DEX_ROUTER_ADDRESS: Record<DexKey, `0x${string}`> = Object.fromEntries(
  SUPPORTED_DEXES.map(d => [d.id, d.routerAddress])
) as Record<DexKey, `0x${string}`>;

/** id → display name  (replaces DEX_NAMES from dex-addresses.ts) */
export const DEX_DISPLAY_NAME: Record<DexKey, string> = Object.fromEntries(
  SUPPORTED_DEXES.map(d => [d.id, d.name])
) as Record<DexKey, string>;

/** Display name → id  (for reverse lookup, e.g. Supabase row → DexKey) */
export const DEX_ID_BY_NAME: Record<string, DexKey> = Object.fromEntries(
  SUPPORTED_DEXES.map(d => [d.name, d.id])
) as Record<string, DexKey>;

/** All display names as an array (e.g. for route stats filtering) */
export const ALL_DEX_NAMES: string[] = SUPPORTED_DEXES.map(d => d.name);

/** All DexKey ids as an array */
export const ALL_DEX_IDS: DexKey[] = SUPPORTED_DEXES.map(d => d.id);

// ─── Aerodrome factory (used in onchainQuote.ts and useSwapExecute.ts) ─────────
// Not a per-DEX address but Aerodrome-specific infrastructure
export const AERODROME_FACTORY = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da" as const;
