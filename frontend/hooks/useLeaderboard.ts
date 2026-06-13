"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchLeaderboard, supabase } from "@/lib/supabase";
import { getTierFromScore } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/leaderboard";

export function useLeaderboard() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const data = await fetchLeaderboard(100);
      return data.map((row, i) => {
        const tier = getTierFromScore(row.score);
        return { ...row, rank: i + 1, tier_name: tier.name, tier_id: tier.id };
      });
    },
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("leaderboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_scores" }, () => {
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}
