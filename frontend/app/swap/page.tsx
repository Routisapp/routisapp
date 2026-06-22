"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Header }         from "@/components/layout/Header";
import { MobileNav }      from "@/components/layout/MobileNav";
import { SwapLayout }     from "@/components/swap/SwapLayout";
import { MultiSwapCard }  from "@/components/swap/MultiSwapCard";
import { RouteStatsCard } from "@/components/swap/RouteStatsCard";

export default function SwapPage() {
  const [tab, setTab] = useState<"swap" | "multi">("swap");
  const slippage = 0.5;

  // Measure the active card height (first direct child of the left column).
  // Works for both Swap tab (SwapLayout wrapper) and Multi Swap tab (MultiSwapCard).
  const swapColRef  = useRef<HTMLDivElement>(null);
  const [swapCardH, setSwapCardH] = useState(0);

  const measureSwapCard = useCallback(() => {
    if (!swapColRef.current) return;
    // First child of the left column = the active card component's root element
    const firstChild = swapColRef.current.firstElementChild as HTMLElement | undefined;
    if (!firstChild) return;
    // For SwapLayout, grab only its first child (swap card, not routes panel below it)
    const target = tab === "swap"
      ? (firstChild.firstElementChild as HTMLElement | undefined) ?? firstChild
      : firstChild;
    const h = target.offsetHeight;
    if (h > 0) setSwapCardH(h);
  }, [tab]);

  useEffect(() => {
    measureSwapCard();
    const ro = new ResizeObserver(measureSwapCard);
    if (swapColRef.current) ro.observe(swapColRef.current);
    return () => ro.disconnect();
  }, [measureSwapCard, tab]);

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-start px-4 py-4 pb-24 md:pb-6">

        {/* Tab switcher */}
        <div className="mb-3 flex items-center gap-3 w-full max-w-[900px]">
          <button onClick={() => setTab("swap")}
            className={`text-sm font-semibold transition-all px-3 py-1 rounded-full ${
              tab === "swap" ? "bg-[--accent-blue] text-white" : "text-[--text-secondary] hover:text-[--text-primary]"
            }`}>Swap</button>
          <button onClick={() => setTab("multi")}
            className={`text-sm font-semibold transition-all px-3 py-1 rounded-full ${
              tab === "multi" ? "bg-[--accent-blue] text-white" : "text-[--text-secondary] hover:text-[--text-primary]"
            }`}>Multi Swap</button>
        </div>

        {/*
          Desktop (xl+): grid-cols-2, items-start
            Left : SwapLayout (swap card + routes panel stacked)
            Right: RouteStatsCard — fixed to swap-card height only
        */}
        <div className="w-full max-w-[900px] flex flex-col gap-4 xl:grid xl:grid-cols-2 xl:items-start">

          {/* Left column — ref wraps the whole column so we can query into it */}
          <div ref={swapColRef} className="w-full">
            {tab === "swap"  && <SwapLayout />}
            {tab === "multi" && <MultiSwapCard slippage={slippage} />}
          </div>

          {/* Right column — RouteStatsCard pinned to swap-card height */}
          <div className="w-full">
            <RouteStatsCard fixedHeight={swapCardH > 0 ? swapCardH : undefined} />
          </div>

        </div>
      </main>
      <MobileNav />
    </>
  );
}
