"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchReferrals, fetchReferralRewards } from "@/lib/supabase";
import { shortAddress } from "@/lib/utils";

interface Props {
  address: string;
}

// ─── Tier definitions ─────────────────────────────────────────────────────────
const TIERS = [
  {
    name: "Bronze",
    range: "1–5 friends",
    pts: "+25 pts/swap",
    color: "#C9693A",
    min: 1,
    max: 5,
  },
  {
    name: "Silver",
    range: "6–20 friends",
    pts: "+50 pts/swap",
    color: "#8C7B6E",
    min: 6,
    max: 20,
  },
  {
    name: "Gold",
    range: "21+ friends",
    pts: "+100 pts/swap",
    color: "#B8860B",
    min: 21,
    max: Infinity,
  },
] as const;

function getCurrentTier(friendCount: number) {
  if (friendCount >= 21) return "Gold";
  if (friendCount >= 6) return "Silver";
  return "Bronze";
}

// ─── Referral row types ───────────────────────────────────────────────────────
interface ReferralRow {
  referee: string;
  created_at: string;
  swap_count?: number;
}

interface RewardRow {
  referee: string;
  points_earned: number;
  created_at?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ReferralView({ address }: Props) {
  const [copied, setCopied] = useState(false);

  const refLink = `https://routis.app/ref/${address.slice(0, 8)}`;

  function copyLink() {
    navigator.clipboard.writeText(refLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const { data: referrals = [] } = useQuery<ReferralRow[]>({
    queryKey: ["referrals", address],
    queryFn: () => fetchReferrals(address) as Promise<ReferralRow[]>,
    enabled: !!address,
  });

  const { data: rewards = [] } = useQuery<RewardRow[]>({
    queryKey: ["referral-rewards", address],
    queryFn: () => fetchReferralRewards(address) as Promise<RewardRow[]>,
    enabled: !!address,
  });

  const friendCount = referrals.length;
  const totalReferralPts = rewards.reduce(
    (sum, r) => sum + (r.points_earned ?? 0),
    0,
  );
  const currentTierName = getCurrentTier(friendCount);

  // Build per-friend reward map
  const rewardsByReferee: Record<string, number> = {};
  for (const r of rewards) {
    rewardsByReferee[r.referee] =
      (rewardsByReferee[r.referee] ?? 0) + r.points_earned;
  }

  // Last active from most recent reward date
  const lastActiveByReferee: Record<string, string> = {};
  for (const r of rewards) {
    if (r.created_at) {
      const prev = lastActiveByReferee[r.referee];
      if (!prev || r.created_at > prev) {
        lastActiveByReferee[r.referee] = r.created_at;
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* ── A) Referral link ──────────────────────────────────── */}
      <div className="rounded-xl border border-[--border] bg-[--bg-card] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[--text-secondary] mb-2">
          Your Referral Link
        </p>
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{ background: "var(--bg-input)", borderColor: "var(--border)" }}
        >
          <span className="flex-1 text-xs font-mono text-[--text-primary] truncate">
            {refLink}
          </span>
          <button
            onClick={copyLink}
            className="shrink-0 rounded-md px-3 py-1 text-xs font-bold text-white transition-colors duration-200"
            style={{ background: copied ? "#B8860B" : "#C9693A" }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[--text-secondary]">
          {friendCount} friends referred · {totalReferralPts} pts earned
        </p>
      </div>

      {/* ── B) Tier system ────────────────────────────────────── */}
      <div className="rounded-xl border border-[--border] bg-[--bg-card] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[--text-secondary] mb-3">
          Referral Tier System
        </p>
        <div className="space-y-2">
          {TIERS.map((tier) => {
            const isActive = currentTierName === tier.name;
            return (
              <div
                key={tier.name}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 border transition-all"
                style={{
                  borderColor: isActive ? tier.color : "var(--border)",
                  background: isActive ? `${tier.color}18` : "transparent",
                }}
              >
                <div className="flex items-center gap-2.5">
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: tier.color }}
                    />
                  )}
                  {!isActive && <span className="w-1.5 h-1.5 rounded-full shrink-0 opacity-0" />}
                  <span className="text-sm font-bold" style={{ color: tier.color }}>
                    {tier.name}
                  </span>
                  <span className="text-[11px] text-[--text-secondary]">
                    {tier.range}
                  </span>
                </div>
                <span
                  className="text-[11px] font-semibold shrink-0"
                  style={{ color: tier.color }}
                >
                  {tier.pts}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-[--text-secondary]">
          Current tier:{" "}
          <span
            className="font-bold"
            style={{
              color: TIERS.find((t) => t.name === currentTierName)?.color,
            }}
          >
            {currentTierName}
          </span>
          {friendCount === 0 && " · You haven't invited any friends yet"}
        </p>
      </div>

      {/* ── C) Friends list table ─────────────────────────────── */}
      <div className="rounded-xl border border-[--border] bg-[--bg-card] overflow-hidden">
        <div className="px-4 py-3 border-b border-[--border]">
          <span className="text-sm font-bold text-[--text-primary]">
            Invited Users
          </span>
        </div>

        {referrals.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[--text-secondary]">
            No invited users yet
          </p>
        ) : (
          <>
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_60px_90px_80px] gap-2 px-4 py-2 border-b border-[--border] text-[10px] font-bold uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              <div>Address</div>
              <div className="text-center">Swaps</div>
              <div className="text-center">Last Active</div>
              <div className="text-right">Earned</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[--border]">
              {referrals.map((r) => {
                const pts = rewardsByReferee[r.referee] ?? 0;
                const lastActive = lastActiveByReferee[r.referee] ?? r.created_at;
                const swapCount = r.swap_count ?? 0;

                return (
                  <div
                    key={r.referee}
                    className="grid grid-cols-[1fr_60px_90px_80px] gap-2 items-center px-4 py-3 text-sm"
                  >
                    <span className="font-mono text-[--text-primary] text-xs truncate">
                      {shortAddress(r.referee)}
                    </span>
                    <span className="text-center text-xs text-[--text-secondary]">
                      {swapCount}
                    </span>
                    <span className="text-center text-[10px] text-[--text-secondary]">
                      {lastActive
                        ? new Date(lastActive).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                          })
                        : "—"}
                    </span>
                    <span
                      className="text-right text-xs font-bold"
                      style={{ color: pts > 0 ? "#C9693A" : "var(--text-secondary)" }}
                    >
                      {pts > 0 ? `+${pts} pts` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
