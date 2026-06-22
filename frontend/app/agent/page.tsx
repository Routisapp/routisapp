"use client";

import { Header }    from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { AgentChat } from "@/components/agent/AgentChat";

export default function AgentPage() {
  return (
    <>
      <Header />
      <AgentChat />
      <MobileNav />
    </>
  );
}
