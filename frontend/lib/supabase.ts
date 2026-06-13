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
}) {
  const score_earned = 50;

  const { error } = await supabase.from("swap_records").insert({
    ...data,
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
async function upsertUserScore(
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
          streakBonus = 200; // STREAK_7_DAY bonus
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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


export async function fetchLeaderboard(limit = 100) {
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

/** Check if address was referred and get referrer */
export async function getReferrer(address: string): Promise<string | null> {
  const { data } = await supabase
    .from("referrals")
    .select("referrer")
    .eq("referee", address.toLowerCase())
    .single();
  return data?.referrer ?? null;
}
