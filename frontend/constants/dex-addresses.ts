/**
 * dex-addresses.ts — Backward-compatibility re-exports
 *
 * The canonical DEX registry has moved to constants/dex-registry.ts.
 * This file re-exports the shapes that existing imports expect so that
 * no call-site outside this constants/ folder needs to change.
 *
 * DO NOT add new DEX data here — edit dex-registry.ts instead.
 */

export {
  SUPPORTED_DEXES,
  DEX_BY_ID,
  DEX_ROUTER_ADDRESS as DEX_ROUTERS,
  DEX_DISPLAY_NAME   as DEX_NAMES,
  AERODROME_FACTORY,
} from "@/constants/dex-registry";

// UNISWAP_QUOTER_V2 — kept here for any remaining direct imports
import { DEX_BY_ID } from "@/constants/dex-registry";
export const UNISWAP_QUOTER_V2 = DEX_BY_ID["UNISWAP_V3"].quoterAddress!;
