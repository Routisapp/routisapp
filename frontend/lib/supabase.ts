import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Swap record ─────────────────────────────────────────────
export async function insertSwapRecord(data: {
  user_address: string;
  token_in:     string;
  token_out:    string;
  amount_in:    string;
  amount_out:   string;
  dex:          string;
  tx_hash:      string;
  volume_usd:   number;
  swap_type?:   "swap" | "multi_swap" | "ai_agent"; // puan tipi
}) {
  // Puan tipi: swap=100, multi_swap=150, ai_agent=250
  const score_earned =
    data.swap_type === "ai_agent"    ? 250 :
    data.swap_type === "multi_swap"  ? 150 : 100; // POINTS.SWAP default

  const { error } = await supabase.from("swap_records").insert({
    user_address: data.user_address,
    token_in:     data.token_in,
    token_out:    data.token_out,
    amount_in:    data.amount_in,
    amount_out:   data.amount_out,
    dex:          data.dex,
    tx_hash:      data.tx_hash,
    volume_usd:   data.volume_usd,
    score_earned,
  });
  if (error) throw error;

  await upsertUserScore(data.user_address, {
    score_delta:      score_earned,
    swap_count_delta: 1,
    volume_delta:     data.volume_usd,
  });
}

// ─── NFT mint score ───────────────────────────────────────────
export async function addMintScore(address: string) {
  await upsertUserScore(address, { score_delta: 100 });
}

// ─── Streak helper (UTC+3) ────────────────────────────────────
/** Returns the calendar date string "YYYY-MM-DD" in UTC+3 for a given ISO timestamp */
function toUTC3DateStr(isoString: string): string {
  const utcMs = new Date(isoString).getTime();
  const utc3Ms = utcMs + 3 * 60 * 60 * 1000; // shift +3h
  return new Date(utc3Ms).toISOString().slice(0, 10);
}

function todayUTC3(): string {
  return toUTC3DateStr(new Date().toISOString());
}

// ─── Upsert user score ────────────────────────────────────────
export async function upsertUserScore(
  address: string,
  delta: {
    score_delta?:      number;
    swap_count_delta?: number;
    volume_delta?:     number;
  },
) {
  const { data: existing } = await supabase
    .from("user_scores")
    .select("*")
    .eq("address", address.toLowerCase())
    .single();

  const now = new Date().toISOString();

  if (existing) {
    // ── Streak calculation ─────────────────────────────────
    const lastDate  = toUTC3DateStr(existing.last_activity);
    const todayDate = todayUTC3();

    let newStreak = existing.consecutive_days ?? 1;
    let streakBonus = 0;

    if (todayDate === lastDate) {
      // Same UTC+3 day — streak unchanged
    } else {
      // Check if yesterday (in UTC+3)
      const yesterday = toUTC3DateStr(
        new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(),
      );
      if (lastDate === yesterday) {
        // Consecutive day — increment
        newStreak = (existing.consecutive_days ?? 1) + 1;
        // Award streak bonus every 7 days
        if (newStreak % 7 === 0) {
          streakBonus = 500; // POINTS.STREAK_7_DAY
        }
      } else {
        // Gap detected — reset streak
        newStreak = 1;
      }
    }

    const finalScore = existing.score + (delta.score_delta ?? 0) + streakBonus;

    await supabase
      .from("user_scores")
      .update({
        score:            finalScore,
        swap_count:       existing.swap_count + (delta.swap_count_delta ?? 0),
        volume_usd:       existing.volume_usd + (delta.volume_delta     ?? 0),
        consecutive_days: newStreak,
        last_activity:    now,
      })
      .eq("address", address.toLowerCase());

    // Sync new score to smart contract (best-effort, non-blocking)
    void syncScoreOnChain(address.toLowerCase(), finalScore);
  } else {
    const initialScore = delta.score_delta ?? 0;

    await supabase.from("user_scores").insert({
      address:          address.toLowerCase(),
      score:            initialScore,
      swap_count:       delta.swap_count_delta ?? 0,
      volume_usd:       delta.volume_delta     ?? 0,
      consecutive_days: 1,
      last_activity:    now,
    });

    // Sync initial score to smart contract (best-effort, non-blocking)
    void syncScoreOnChain(address.toLowerCase(), initialScore);
  }
}

// ─── On-chain score sync ──────────────────────────────────────
/**
 * After Supabase is updated, syncs the new score to the smart contract.
 * - Server-side: calls /api/update-score directly via fetch (internal)
 * - Client-side: calls /api/update-score as a fire-and-forget POST
 * Errors are caught and logged — never thrown (score sync is best-effort).
 */
async function syncScoreOnChain(address: string, newScore: number): Promise<void> {
  try {
    const secret = process.env.INTERNAL_API_SECRET ?? "";
    // Server-side: VERCEL_URL is auto-set; client-side: use relative path
    const baseUrl = typeof window === "undefined"
      ? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"))
      : "";

    await fetch(`${baseUrl}/api/update-score`, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ userAddress: address, score: newScore }),
    });
  } catch (err) {
    // Non-critical — Supabase is source of truth, on-chain is best-effort
    console.warn("[syncScoreOnChain] Failed to sync on-chain score:", err);
  }
}


export async function fetchLeaderboard(limit = 10000) {
  const { data, error } = await supabase
    .from("user_scores")
    .select("*")
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── User score ───────────────────────────────────────────────
export async function fetchUserScore(address: string) {
  const { data, error } = await supabase
    .from("user_scores")
    .select("*")
    .eq("address", address.toLowerCase())
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

// ─── Swap history ─────────────────────────────────────────────
export async function fetchSwapHistory(address: string, page = 0, pageSize = 50) {
  const { data, error } = await supabase
    .from("swap_records")
    .select("*")
    .eq("user_address", address.toLowerCase())
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw error;
  return data ?? [];
}

// ─── Route distribution ───────────────────────────────────────
/**
 * RouteStats: one entry per supported DEX, always including ALL DEXes
 * even if count === 0.  `hasSwaps` lets UI dim zero-usage nodes.
 */
export interface RouteStats {
  /** DEX enum key — matches DexKey in types/swap.ts */
  id:         string;
  /** Human-readable display name (from registry) */
  name:       string;
  /** Number of swaps via this DEX in the time window */
  count:      number;
  /** 0–100, calculated against DEX-only total (wraps excluded) */
  percentage: number;
  /** false when count === 0 — UI can render dimmed node */
  hasSwaps:   boolean;
}

// WETH utility ops stored in dex column — not real DEX routes, excluded from stats
const WRAP_UNWRAP_NAMES = new Set([
  "Wrap ETH → WETH", "Unwrap WETH → ETH", "Wrap", "Unwrap", "WRAP", "UNWRAP",
]);

/** Maps timeWindow string to a cutoff ISO timestamp, or null for "all time" */
function windowCutoff(timeWindow: string): string | null {
  const units: Record<string, number> = { h: 3600, d: 86400, w: 604800 };
  const m = timeWindow.match(/^(\d+)([hdw])$/);
  if (!m) return null;                                     // "all" → no filter
  const ms = parseInt(m[1]) * (units[m[2]] ?? 0) * 1000;
  return new Date(Date.now() - ms).toISOString();
}

/**
 * Calculates the platform-wide DEX usage distribution.
 *
 * Key guarantees (matches prompt requirements):
 *  • Every DEX in SUPPORTED_DEXES appears — percentage 0 if unused.
 *  • Wrap/unwrap operations are excluded (utility steps, not routes).
 *  • Filters records by `timeWindow` using `created_at` column.
 *  • Sorted: active DEXes desc by count, then zero-count entries alphabetically.
 *
 * @param timeWindow  e.g. "7d", "24h", "30d", "all" (default "7d")
 */
export async function fetchRouteStats(timeWindow = "7d"): Promise<RouteStats[]> {
  // Static import — dynamic import causes issues in some Next.js client contexts
  const { SUPPORTED_DEXES } = await import("@/constants/dex-registry");

  // Build Supabase query — filter by time window if applicable
  const cutoff = windowCutoff(timeWindow);
  let query = supabase.from("swap_records").select("dex, created_at");
  if (cutoff) {
    query = query.gte("created_at", cutoff);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[fetchRouteStats] Supabase error:", error);
    throw new Error(error.message ?? "Supabase query failed");
  }

  // Count per DEX name (excludes wrap/unwrap rows)
  const counts = new Map<string, number>();
  for (const row of (data ?? [])) {
    const name = (row.dex as string) || "";
    if (!name || WRAP_UNWRAP_NAMES.has(name)) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  // Total only across known DEX names (unknown rows don't inflate denominator)
  const knownNames = new Set(SUPPORTED_DEXES.map(d => d.name));
  const total = [...counts.entries()]
    .filter(([name]) => knownNames.has(name))
    .reduce((acc, [, c]) => acc + c, 0);

  // LEFT JOIN: every registry DEX gets an entry, missing ones get count=0
  const result: RouteStats[] = SUPPORTED_DEXES.map(dex => {
    const count = counts.get(dex.name) ?? 0;
    return {
      id:         dex.id,
      name:       dex.name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
      hasSwaps:   count > 0,
    };
  });

  // Sort: active first (desc by count), then unused alphabetically
  result.sort((a, b) =>
    a.count !== b.count ? b.count - a.count : a.name.localeCompare(b.name),
  );

  // Append any DB names not in registry (never silently lose data)
  for (const [name, count] of counts.entries()) {
    if (!knownNames.has(name)) {
      result.push({
        id:         name.toUpperCase().replace(/\s+/g, "_"),
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
        hasSwaps:   true,
      });
    }
  }

  return result;
}

// ─── Referral ─────────────────────────────────────────────────

/** Register that `referee` was invited by `referrer` */
export async function registerReferral(referrer: string, referee: string) {
  const { error } = await supabase.from("referrals").insert({
    referrer: referrer.toLowerCase(),
    referee:  referee.toLowerCase(),
  });
  // ignore duplicate (referee already registered)
  if (error && !error.message.includes("duplicate")) throw error;
}

/** Get all referrals made by this address */
export async function fetchReferrals(referrer: string) {
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer", referrer.toLowerCase())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Get total rewards earned via referrals */
export async function fetchReferralRewards(referrer: string) {
  const { data, error } = await supabase
    .from("referral_rewards")
    .select("*")
    .eq("referrer", referrer.toLowerCase());
  if (error) throw error;
  return data ?? [];
}

/** Add referral reward when a referee swaps */
export async function addReferralReward(referrer: string, referee: string, swapTxHash: string, points: number) {
  const { error } = await supabase.from("referral_rewards").insert({
    referrer:      referrer.toLowerCase(),
    referee:       referee.toLowerCase(),
    swap_tx_hash:  swapTxHash,
    points_earned: points,
  });
  if (error) throw error;
  // Add points to referrer
  await upsertUserScore(referrer, { score_delta: points });
}

/** Get the date of the first ever Routis swap for an address */
export async function fetchFirstSwapDate(address: string): Promise<string | null> {
  const { data } = await supabase
    .from("swap_records")
    .select("created_at")
    .eq("user_address", address.toLowerCase())
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  return data?.created_at ?? null;
}

/** Upsert wallet score for leaderboard — called after wallet stats are computed */
export async function upsertWalletScore(entry: {
  address:         string;
  wallet_score:    number;
  total_txs:       number;
  wallet_age_days: number;
  base_volume_usd: number;
  gas_fees_eth:    string;
  unique_addresses: number;
}) {
  const { error } = await supabase
    .from("wallet_score_leaderboard")
    .upsert({
      address:          entry.address.toLowerCase(),
      wallet_score:     entry.wallet_score,
      total_txs:        entry.total_txs,
      wallet_age_days:  entry.wallet_age_days,
      base_volume_usd:  entry.base_volume_usd,
      gas_fees_eth:     entry.gas_fees_eth,
      unique_addresses: entry.unique_addresses,
      updated_at:       new Date().toISOString(),
    }, { onConflict: "address" });
  if (error) console.warn("[upsertWalletScore]", error.message);
}

/** Fetch top wallet score leaderboard entries */
export async function fetchWalletScoreLeaderboard(limit = 50) {
  const { data, error } = await supabase
    .from("wallet_score_leaderboard")
    .select("address, wallet_score, total_txs, wallet_age_days, base_volume_usd, updated_at")
    .order("wallet_score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Check if address already got the X follow reward */
export async function hasXFollowReward(address: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("x_follow_rewards")
      .select("address")
      .eq("address", address.toLowerCase())
      .single();
    return !!data;
  } catch { return false; }
}

/** Mark address as having received the X follow reward */
export async function markXFollowReward(address: string): Promise<void> {
  try {
    await supabase.from("x_follow_rewards").upsert(
      { address: address.toLowerCase(), rewarded_at: new Date().toISOString() },
      { onConflict: "address" }
    );
  } catch { /* non-critical */ }
}
export async function hasSybilPaid(address: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("sybil_payments")
      .select("address")
      .eq("address", address.toLowerCase())
      .single();
    if (error) return false;
    return !!data;
  } catch { return false; }
}

/** Mark an address as having paid for sybil reveal */
export async function markSybilPaid(address: string): Promise<void> {
  try {
    await supabase.from("sybil_payments").upsert(
      { address: address.toLowerCase(), paid_at: new Date().toISOString() },
      { onConflict: "address" }
    );
  } catch { /* non-critical */ }
}

/** Check if address was referred and get referrer */
export async function getReferrer(address: string): Promise<string | null> {
  const { data } = await supabase
    .from("referrals")
    .select("referrer")
    .eq("referee", address.toLowerCase())
    .single();
  return data?.referrer ?? null;
}
