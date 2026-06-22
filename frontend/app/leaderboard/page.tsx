"use client";

import { Header }             from "@/components/layout/Header";
import { MobileNav }          from "@/components/layout/MobileNav";
import { StatCards, AggregateCards } from "@/components/leaderboard/StatCards";
import { LeaderboardTable }   from "@/components/leaderboard/LeaderboardTable";
import { useLeaderboard }     from "@/hooks/useLeaderboard";

export default function LeaderboardPage() {
  const { data: entries = [], isLoading } = useLeaderboard();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-10">

        {/* ── Stat cards ── */}
        <AggregateCards />
        <StatCards />

        {/* ── Table with search, filter, pagination ── */}
        <LeaderboardTable entries={entries} isLoading={isLoading} />

      </main>
      <MobileNav />
    </>
  );
}
