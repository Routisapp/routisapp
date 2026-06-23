import { formatUnits } from "viem";

/** 1234567.89 → "1.2M", 12345 → "12.3K", 450 → "450" */
export function formatNumber(n: number, decimals = 1): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(decimals)     + "K";
  return Number.isInteger(n) ? String(n) : n.toFixed(decimals);
}

/** BigInt token amount → human-readable string */
export function formatTokenAmount(amount: bigint, tokenDecimals: number, displayDecimals = 6): string {
  const str = formatUnits(amount, tokenDecimals);
  const num = parseFloat(str);
  if (num === 0) return "0";
  if (num < 0.000001) return "<0.000001";
  return num.toFixed(displayDecimals).replace(/\.?0+$/, "");
}

/**
 * Format a BigInt wei amount for display in an input field.
 * Always uses period as decimal separator (never comma).
 * Trims trailing zeros so "0.007300000000" → "0.0073".
 * Caps at 8 significant decimals to avoid raw 18-decimal strings.
 */
export function formatInputAmount(amount: bigint, tokenDecimals: number): string {
  const str = formatUnits(amount, tokenDecimals);
  const num = parseFloat(str);
  if (num === 0) return "0";
  // Use toFixed(8) then strip trailing zeros — always period separator
  return num.toFixed(8).replace(/\.?0+$/, "");
}

/** 0xAbCd...1234 */
export function shortAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** USD formatting */
export function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

/** basescan tx link */
export function basescanTx(hash: string): string {
  return `https://basescan.org/tx/${hash}`;
}

/** NFT tier from score */
export function getTierFromScore(score: number): { id: number; name: string; color: string } {
  if (score >= 10000) return { id: 3, name: "Diamond", color: "#7B5EA7" };
  if (score >= 5000)  return { id: 2, name: "Gold",    color: "#FFD700" };
  if (score >= 2500)  return { id: 1, name: "Silver",  color: "#C0C0C0" };
  if (score >= 1000)  return { id: 0, name: "Bronze",  color: "#CD7F32" };
  return               { id: -1, name: "Unranked",     color: "#8b8fa8" };
}

/** Debounce helper */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Token price fetch (one-off, non-hook) ─────────────────

/** Fetch USD price for a token address.
 *  Routes through /api/token-price to keep the Alchemy key server-side.
 *  Falls back to CoinGecko on the server if Alchemy fails.
 */
export async function fetchTokenPrice(address: string): Promise<number> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const res  = await fetch(`${base}/api/token-price?address=${address}`, {
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const json = await res.json() as { price: number };
    return json.price ?? 0;
  } catch {
    return 0;
  }
}
