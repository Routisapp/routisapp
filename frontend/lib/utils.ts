import { formatUnits } from "viem";

/** 1234567.89 → "1.23M", 12345 → "12.3K", 123 → "123" */
export function formatNumber(n: number, decimals = 2): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(decimals)     + "K";
  return n.toFixed(decimals);
}

/** BigInt token amount → human-readable string */
export function formatTokenAmount(amount: bigint, tokenDecimals: number, displayDecimals = 6): string {
  const str = formatUnits(amount, tokenDecimals);
  const num = parseFloat(str);
  if (num === 0) return "0";
  if (num < 0.000001) return "<0.000001";
  return num.toFixed(displayDecimals).replace(/\.?0+$/, "");
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
  if (score >= 2000) return { id: 3, name: "Diamond", color: "#7B5EA7" };
  if (score >= 1500) return { id: 2, name: "Gold",    color: "#FFD700" };
  if (score >= 1000) return { id: 1, name: "Silver",  color: "#C0C0C0" };
  if (score >= 500)  return { id: 0, name: "Bronze",  color: "#CD7F32" };
  return              { id: -1, name: "Unranked",     color: "#8b8fa8" };
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
const COINGECKO_IDS: Record<string, string> = {
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": "ethereum",
  "0x4200000000000000000000000000000000000006": "ethereum",
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": "usd-coin",
  "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb": "dai",
  "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA": "usd-coin",
  "0x940181a94A35A4569E4529a3CDfB74e38FD98631": "aerodrome-finance",
  "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf": "coinbase-wrapped-btc",
  "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22": "coinbase-wrapped-staked-eth",
};

/** Fetch USD price for a token address (non-hook, async) */
export async function fetchTokenPrice(address: string): Promise<number> {
  const id = COINGECKO_IDS[address];
  if (!id) return 0;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { cache: "no-store" },
    );
    if (!res.ok) return 0;
    const data = await res.json() as Record<string, { usd: number }>;
    return data[id]?.usd ?? 0;
  } catch {
    return 0;
  }
}
