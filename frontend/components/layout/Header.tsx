"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const NAV = [
  { href: "/swap",        label: "Swap",        icon: "⇄"  },
  { href: "/mint",        label: "Mint",        icon: "⬟"  },
  { href: "/leaderboard", label: "Leaderboard", icon: "▦"  },
  { href: "/profile",     label: "Profile",     icon: "◉"  },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[--border] bg-[--bg-primary]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/swap" className="flex items-center gap-2 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Agex logo"
            width={40}
            height={40}
            style={{ objectFit: "contain", mixBlendMode: "multiply" }}
          />
          <span className="text-lg font-black tracking-tight" style={{ color: "#2C2018" }}>Agex</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  active
                    ? "border border-[#C9693A]/30 bg-[#C9693A]/10 text-[#C9693A]"
                    : "border border-transparent text-[--text-secondary] hover:text-[--text-primary]"
                }`}
              >
                <span className="text-xs">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Wallet — custom styled to match warm theme */}
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            if (!mounted) return null;
            if (!account || !chain) {
              return (
                <button
                  onClick={openConnectModal}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white transition-all hover:brightness-110"
                  style={{ background: "#C9693A" }}
                >
                  Connect Wallet
                </button>
              );
            }
            return (
              <div className="flex items-center gap-2">
                {/* Chain button */}
                <button
                  onClick={openChainModal}
                  className="flex items-center gap-1.5 rounded-xl border border-[--border] px-2.5 py-1.5 text-xs font-semibold transition-all hover:border-[#C9693A]/40"
                  style={{ background: "#EDE6DC", color: "#5A4A3A" }}
                >
                  {chain.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={chain.iconUrl}
                      alt={chain.name}
                      className="h-4 w-4 rounded-full"
                      style={{ filter: "grayscale(0.3)" }}
                    />
                  )}
                  <span className="hidden sm:inline">{chain.name}</span>
                </button>

                {/* Account button */}
                <button
                  onClick={openAccountModal}
                  className="flex items-center gap-2 rounded-xl border border-[--border] px-3 py-1.5 text-sm font-semibold transition-all hover:border-[#C9693A]/40"
                  style={{ background: "#EDE6DC", color: "#2C2018" }}
                >
                  {account.displayBalance && (
                    <span className="text-xs font-bold" style={{ color: "#C9693A" }}>
                      {account.displayBalance}
                    </span>
                  )}
                  <span className="font-mono text-xs" style={{ color: "#5A4A3A" }}>
                    {account.displayName}
                  </span>
                </button>
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
