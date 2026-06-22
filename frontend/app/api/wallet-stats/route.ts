/**
 * /api/wallet-stats?address=0x...
 *
 * Data sources (all parallel):
 *  - Alchemy RPC  : totalTxs, firstTxDate, lastTxDate, activeDays, uniqueAddresses, gasFees
 *  - Blockscout   : ETH balance (single lightweight call)
 *  - Supabase     : agexSwaps, volumeUsd, routisAge (pre-aggregated, instant)
 *
 * Cache: 10-min in-process TTL — serves instantly on repeat visits.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAddressInfo, fetchChainStats } from "@/lib/basescan/client";
import { computeOnchainScore } from "@/lib/basescan/derive";
import { formatUnits } from "viem";
import { getWalletScore } from "@/lib/walletScore";
import { upsertWalletScore } from "@/lib/supabase";

const CACHE     = new Map<string, { data: WalletStats; expiry: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const maxDuration = 55;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export interface WalletStats {
  address:         string;
  ethBalance:      string;
  totalTxs:        number;
  sent:            number;
  received:        number;
  tokenTransfers:  number;
  internalTxs:     number;
  activeDays:      number;
  dayStreak:       number;
  agexSwaps:       number;
  volumeUsd:       number;
  uniqueAddresses: number;
  firstTx:         string;
  lastTx:          string;
  onchainScore:    number;
  heatmap:         Record<string, number>;
  cachedAt:        number;
  // New fields
  gasFees:         string;   // Total gas spent in ETH (e.g. "0.0042")
  baseVolume:      number;   // Total USD volume on Base via Routis
  routisAge:       string;   // How long the user has been using Routis (e.g. "3 months")
}

async function fetchAgexStats(address: string) {
  const lower = address.toLowerCase();

  // user_scores: swap count, volume (aggregated by upsertUserScore), first swap date
  const { data: scores } = await supabase
    .from("user_scores")
    .select("swap_count, volume_usd")
    .eq("address", lower)
    .single();

  // swap_records: first ever swap date for Routis age
  const { data: firstSwap } = await supabase
    .from("swap_records")
    .select("created_at")
    .eq("user_address", lower)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return {
    swapCount:     scores?.swap_count ?? 0,
    volumeUsd:     scores?.volume_usd ?? 0,
    firstSwapDate: firstSwap?.created_at ?? null,
  };
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function lastTxAge(iso: string): string {
  if (!iso) return "—";
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMin / 60);
  const diffD   = Math.floor(diffH / 24);
  if (diffH < 1)  return diffMin <= 1 ? "Just now" : `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 30) return `${diffD}d ago`;
  const months  = Math.floor(diffD / 30);
  const remDays = diffD % 30;
  return remDays === 0 ? `${months} mo ago` : `${months} mo ${remDays}d ago`;
}

/** Format how long ago a date was (e.g. "2 years 3 months") */
function formatRoutisAge(isoDate: string | null): string {
  if (!isoDate) return "—";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffD  = Math.floor(diffMs / 86400000);
  if (diffD < 1)   return "Today";
  if (diffD < 30)  return `${diffD} day${diffD > 1 ? "s" : ""}`;
  const months = Math.floor(diffD / 30);
  const years  = Math.floor(months / 12);
  const remMon = months % 12;
  if (years === 0) return `${months} month${months > 1 ? "s" : ""}`;
  if (remMon === 0) return `${years} year${years > 1 ? "s" : ""}`;
  return `${years}y ${remMon}mo`;
}

/** Compute wallet score and upsert to leaderboard — called after every stats fetch */
async function runUpsert(address: string, data: WalletStats) {
  try {
    const walletAgeMonths = data.firstTx && data.firstTx !== "—"
      ? (Date.now() - new Date(data.firstTx).getTime()) / (1000 * 60 * 60 * 24 * 30)
      : 0;
    const walletAgeDays = data.firstTx && data.firstTx !== "—"
      ? Math.floor((Date.now() - new Date(data.firstTx).getTime()) / 86400000)
      : 0;
    const scoreResult = getWalletScore(
      data.totalTxs, walletAgeMonths, data.baseVolume, data.uniqueAddresses,
      parseFloat(data.gasFees ?? "0") || 0,
    );
    await upsertWalletScore({
      address,
      wallet_score:     scoreResult.total,
      total_txs:        data.totalTxs,
      wallet_age_days:  walletAgeDays,
      base_volume_usd:  data.baseVolume,
      gas_fees_eth:     data.gasFees ?? "0",
      unique_addresses: data.uniqueAddresses,
    });
    console.log(`[leaderboard] upserted ${address} score=${scoreResult.total}`);
  } catch (err) {
    console.error("[leaderboard] upsert failed:", err);
  }
}

export async function GET(req: NextRequest) {
  const raw     = req.nextUrl.searchParams.get("address") ?? "";
  const address = raw.toLowerCase();

  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const cached = CACHE.get(address);
  if (cached && Date.now() < cached.expiry) {
    // Still upsert on cache hit so leaderboard stays fresh
    void runUpsert(address, cached.data);
    return NextResponse.json(cached.data);
  }

  try {
    // All 3 sources in parallel — no sequential bottleneck
    const [addrInfo, chainStats, agexStats] = await Promise.all([
      fetchAddressInfo(address),  // Blockscout: ETH balance (single call, fast)
      fetchChainStats(address),   // Alchemy: totalTxs, activeDays, uniqueAddr, firstTx, lastTx, gasFees
      fetchAgexStats(address),    // Supabase: swap count + volume + createdAt (pre-aggregated, instant)
    ]);

    const { totalTxs, firstTxDate, lastTxDate, activeDays, uniqueAddresses, gasFees, baseVolumeUsd } = chainStats;
    const { swapCount: agexSwaps, volumeUsd, firstSwapDate } = agexStats;

    const balWei          = addrInfo.coin_balance ?? "0";
    const ethBalanceFloat = parseFloat(formatUnits(BigInt(balWei), 18));
    const ethBalance      = ethBalanceFloat.toFixed(4);

    const lastTxDaysAgo = lastTxDate
      ? (Date.now() - new Date(lastTxDate).getTime()) / 86400000
      : 999;

    const onchainScore = computeOnchainScore({
      totalTxs,
      dayStreak:      0,        // streak requires sequential analysis — omit for speed
      activeDays,
      uniqueAddresses,
      agexSwaps,
      lastTxDaysAgo,
      ethBalanceFloat,
    });

    const data: WalletStats = {
      address,
      ethBalance,
      totalTxs,
      sent:           totalTxs,  // nonce = sent count
      received:       0,
      tokenTransfers: 0,
      internalTxs:    0,
      activeDays,
      dayStreak:      0,
      agexSwaps,
      volumeUsd,
      uniqueAddresses,
      firstTx:    fmtDate(firstTxDate),
      lastTx:     lastTxAge(lastTxDate),
      onchainScore,
      heatmap:    {},
      cachedAt:   Date.now(),
      // New fields
      gasFees:    gasFees ?? "0",
      baseVolume: baseVolumeUsd,
      routisAge:  formatRoutisAge(firstSwapDate),
    };

    CACHE.set(address, { data, expiry: Date.now() + CACHE_TTL });

    // Save wallet score to leaderboard (awaited so errors are visible in logs)
    await runUpsert(address, data);

    return NextResponse.json(data);

  } catch (err) {
    console.error("[wallet-stats]", err);
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(
      { error: (err as Error).message ?? "Failed to fetch" },
      { status: 500 },
    );
  }
}
