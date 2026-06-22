/**
 * derive.ts — All computed stats from raw Blockscout data.
 * Pure functions, no I/O.
 */

import type { BlockscoutTx } from "./client";

// Agex router/contract addresses on Base mainnet (lowercase)
const AGEX_ADDRESSES = new Set([
  "0x2626664c2603336e57b271c5c0b26f421741e481",
  "0x678aa4bf4e210cf2166753e054d5b7c31cc7fa86",
  "0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43",
  "0x6bded42c6da8fbf0d2ba55b2fa120c5e0c8d7891",
]);

function toDay(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

// ── Active days & longest day streak ────────────────────────────────────────
export function computeActiveDaysAndStreak(txs: BlockscoutTx[]): {
  activeDays: number;
  dayStreak:  number;
} {
  if (txs.length === 0) return { activeDays: 0, dayStreak: 0 };

  const daySet = new Set(txs.map(tx => toDay(tx.timestamp)));
  const days   = Array.from(daySet).sort();

  let maxStreak = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000;
    if (diff === 1) { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 1;
  }

  return { activeDays: days.length, dayStreak: maxStreak };
}

// ── Sent / Received counts ──────────────────────────────────────────────────
export function computeSentReceived(txs: BlockscoutTx[], walletAddr: string): {
  sent: number; received: number;
} {
  const lower = walletAddr.toLowerCase();
  let sent = 0, received = 0;
  for (const tx of txs) {
    if (tx.from.hash.toLowerCase() === lower) sent++;
    else received++;
  }
  return { sent, received };
}

// ── Unique addresses interacted with ────────────────────────────────────────
export function computeUniqueAddresses(txs: BlockscoutTx[], walletAddr: string): number {
  const lower = walletAddr.toLowerCase();
  const addrs = new Set<string>();
  for (const tx of txs) {
    const f = tx.from.hash.toLowerCase();
    const t = tx.to?.hash.toLowerCase();
    if (f !== lower) addrs.add(f);
    if (t && t !== lower) addrs.add(t);
  }
  return addrs.size;
}

// ── Agex swap count (fallback — main count comes from Supabase) ─────────────
export function computeAgexSwaps(txs: BlockscoutTx[], walletAddr: string): number {
  const lower = walletAddr.toLowerCase();
  return txs.filter(tx =>
    tx.from.hash.toLowerCase() === lower &&
    tx.to !== null &&
    AGEX_ADDRESSES.has(tx.to.hash.toLowerCase()) &&
    tx.status === "ok"
  ).length;
}

// ── First tx date ────────────────────────────────────────────────────────────
export function computeFirstTxDate(txs: BlockscoutTx[]): string {
  if (txs.length === 0) return "—";
  const oldest = txs[txs.length - 1].timestamp;
  return new Date(oldest).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── Last tx — relative time string ──────────────────────────────────────────
export function computeLastTxAge(txs: BlockscoutTx[]): string {
  if (txs.length === 0) return "—";
  const diffMs  = Date.now() - new Date(txs[0].timestamp).getTime();
  const diffMin = Math.floor(diffMs  / 60000);
  const diffH   = Math.floor(diffMin / 60);
  const diffD   = Math.floor(diffH   / 24);

  if (diffH < 1)  return diffMin <= 1 ? "Just now" : `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 30) return `${diffD}d ago`;

  const months  = Math.floor(diffD / 30);
  const remDays = diffD % 30;
  return remDays === 0 ? `${months} mo ago` : `${months} mo ${remDays}d ago`;
}

// ── Onchain Score (40-100) ───────────────────────────────────────────────────
//
// Kriterler:
//   Total Txs        → log2-scale, max 20 pt
//   Active Days      → linear,     max 15 pt
//   Agex Swaps       → log2-scale, max 20 pt  (platform bonus)
//   Unique Addresses → log2-scale, max 15 pt
//   Last Tx Recency  → linear,     max 15 pt  (30 günde sıfır)
//   ETH Balance      → tiered,     max  5 pt
//   Day Streak       → linear,     max 10 pt
//
// raw [0,100] → final = 40 + raw × 0.60 → [40, 100]
//
export function computeOnchainScore(params: {
  totalTxs:         number;
  dayStreak:        number;
  activeDays:       number;
  uniqueAddresses:  number;
  agexSwaps:        number;
  lastTxDaysAgo?:   number;
  ethBalanceFloat?: number;
}): number {
  const {
    totalTxs, dayStreak, activeDays, uniqueAddresses, agexSwaps,
    lastTxDaysAgo   = 999,
    ethBalanceFloat = 0,
  } = params;

  const txScore        = Math.min(20, Math.log2(totalTxs + 1) * 2.5);
  const daysScore      = Math.min(15, activeDays * (15 / 120));
  const agexScore      = Math.min(20, Math.log2(agexSwaps + 1) * 4);
  const diversityScore = Math.min(15, Math.log2(uniqueAddresses + 1) * 3);
  const recencyScore   = Math.max(0, Math.min(15, 15 - lastTxDaysAgo * 0.5));
  const balScore       = ethBalanceFloat >= 1.0 ? 5
                       : ethBalanceFloat >= 0.1 ? 4
                       : ethBalanceFloat >= 0.01 ? 2
                       : ethBalanceFloat >  0   ? 1 : 0;
  const streakScore    = Math.min(10, dayStreak * (10 / 30));

  const raw = txScore + daysScore + agexScore + diversityScore + recencyScore + balScore + streakScore;
  return Math.round(Math.min(100, 40 + raw * 0.60));
}
