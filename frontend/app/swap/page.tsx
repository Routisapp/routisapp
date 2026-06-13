"use client";

import { useState } from "react";
import { Header }         from "@/components/layout/Header";
import { MobileNav }      from "@/components/layout/MobileNav";
import { SwapLayout }     from "@/components/swap/SwapLayout";
import { MultiSwapCard }  from "@/components/swap/MultiSwapCard";

export default function SwapPage() {
  const [tab, setTab] = useState<"swap" | "multi">("swap");
  const slippage = 0.5;

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-start px-4 py-4 pb-24 md:pb-6">
        <div className="mb-4 hidden" />

        {/* Tab switcher — Hibra style */}
        <div className="mb-3 flex items-center gap-3 w-full max-w-md">
          <button
            onClick={() => setTab("swap")}
            className={`text-sm font-semibold transition-all px-3 py-1 rounded-full ${
              tab === "swap"
                ? "bg-[--accent-blue] text-white"
                : "text-[--text-secondary] hover:text-white"
            }`}
          >
            Swap
          </button>
          <button
            onClick={() => setTab("multi")}
            className={`text-sm font-semibold transition-all px-3 py-1 rounded-full ${
              tab === "multi"
                ? "bg-[--accent-blue] text-white"
                : "text-[--text-secondary] hover:text-white"
            }`}
          >
            Multi Swap
          </button>
        </div>

        {tab === "swap"  && <SwapLayout />}
        {tab === "multi" && <MultiSwapCard slippage={slippage} />}
      </main>
      <MobileNav />
    </>
  );
}
