import { Header }            from "@/components/layout/Header";
import { MobileNav }         from "@/components/layout/MobileNav";
import { WalletStatsPanel }  from "@/components/wallet-stats/WalletStatsPanel";

export const metadata = {
  title: "Wallet Stats — Routis",
  description: "On-chain activity stats for your Base wallet",
};

export default function WalletStatsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-10">
        <WalletStatsPanel />
      </main>
      <MobileNav />
    </>
  );
}
