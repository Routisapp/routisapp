"use client";

/**
 * useRouteStats
 *
 * Fetches the platform-wide DEX route distribution and keeps it live via:
 *   1. 60-second polling interval (background refresh)
 *   2. Manual `refresh()` call — invoked by useSwapExecute after a
 *      successful swap so the diagram updates immediately without waiting
 *      for the next poll cycle.
 *
 * Data source: fetchRouteStats() in lib/supabase.ts
 *   - Queries swap_records filtered by timeWindow (default "7d")
 *   - Returns ALL supported DEXes, even those with count=0
 *   - Excludes wrap/unwrap utility operations
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchRouteStats, type RouteStats } from "@/lib/supabase";

export type { RouteStats };

export type TimeWindow = "24h" | "7d" | "30d" | "all";

interface UseRouteStatsOptions {
  /** Time window for filtering swap records. Default "7d" */
  timeWindow?: TimeWindow;
  /** Polling interval in ms. Default 60 000 (60s). Set 0 to disable polling. */
  pollInterval?: number;
  /**
   * When true, suppresses the automatic initial fetch on mount.
   * Useful when you only need the refresh() function (e.g. SwapLayout triggering
   * a refresh of the RouteStatsCard's own hook instance via a shared mechanism).
   * Default: false
   */
  skipInitialFetch?: boolean;
}

interface UseRouteStatsResult {
  stats:      RouteStats[];
  /** Total swap count within the window (wrap/unwrap excluded) */
  total:      number;
  loading:    boolean;
  error:      string | null;
  /** Call to immediately re-fetch (e.g. after a successful swap) */
  refresh:    () => void;
  timeWindow: TimeWindow;
  setTimeWindow: (tw: TimeWindow) => void;
}

const DEFAULT_POLL_MS = 60_000;

export function useRouteStats({
  timeWindow:       initialWindow    = "7d",
  pollInterval      = DEFAULT_POLL_MS,
  skipInitialFetch  = false,
}: UseRouteStatsOptions = {}): UseRouteStatsResult {

  const [stats,      setStats]      = useState<RouteStats[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(!skipInitialFetch);
  const [error,      setError]      = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(initialWindow);

  const fetchIdRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRouteStats(timeWindow);
      if (id !== fetchIdRef.current) return;
      setStats(data);
      setTotal(data.reduce((acc, r) => acc + r.count, 0));
    } catch (e) {
      if (id !== fetchIdRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load route stats");
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [timeWindow]);

  // Initial fetch — skipped when skipInitialFetch=true (refresh-only instances)
  useEffect(() => {
    if (skipInitialFetch) return;
    void load();
  }, [load, skipInitialFetch]);

  // Polling
  useEffect(() => {
    if (pollInterval <= 0) return;
    const timer = setInterval(() => void load(), pollInterval);
    return () => clearInterval(timer);
  }, [load, pollInterval]);

  return { stats, total, loading, error, refresh: load, timeWindow, setTimeWindow };
}
