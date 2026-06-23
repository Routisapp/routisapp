"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTheme } from "@/lib/theme";

// Tabler Icons SVG paths (outline, 24×24 viewBox, stroke-based)
const IconSwap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/>
  </svg>
);
const IconDiamond = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
);
const IconMedal = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/leaderboard.png" alt="leaderboard" width={16} height={16} style={{ display: "block", objectFit: "contain" }} />
);
const IconBarChart = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/wallet stat.jpg" alt="wallet stats" width={16} height={16} style={{ display: "block", objectFit: "contain" }} />
);
const IconUserCircle = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/profile.jpg" alt="profile" width={16} height={16} style={{ display: "block", objectFit: "contain", borderRadius: "50%" }} />
);
const IconAgent = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <rect x="3" y="7" width="18" height="13" rx="2"/>
    <path d="M8 11h.01M12 11h.01M16 11h.01"/>
    <path d="M12 7V4"/><circle cx="12" cy="3" r="1"/>
  </svg>
);

const NAV = [
  { href: "/swap",         label: "Swap",         Icon: IconSwap       },
  { href: "/agent",        label: "AI Agent",     Icon: IconAgent      },
  { href: "/wallet-stats", label: "Base Wallet Stats", Icon: IconBarChart   },
  { href: "/leaderboard",  label: "Leaderboard",  Icon: IconMedal      },
  { href: "/mint",         label: "Reward",       Icon: IconDiamond    },
  { href: "/profile",      label: "Profile",      Icon: IconUserCircle },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[--border] bg-[--bg-input] text-[--text-secondary] transition-all hover:border-[#C9693A]/40 hover:text-[--text-primary]"
    >
      {theme === "dark" ? (
        /* Sun icon */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1"  x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1"  y1="12" x2="3"  y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[--border] bg-[--bg-primary]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link href="/swap" className="flex items-center gap-2 no-underline shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Routis logo"
            width={36}
            height={36}
            style={{ objectFit: "contain" }}
            className="dark:brightness-90"
          />
          <span className="text-lg font-black tracking-tight text-[--text-primary]">Routis</span>
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  active
                    ? "border border-[#C9693A]/30 bg-[#C9693A]/10 text-[#C9693A]"
                    : "border border-transparent text-[--text-secondary] hover:text-[--text-primary]"
                }`}
              >
                <span style={{ position: "relative", top: href === "/wallet-stats" ? "0px" : href === "/profile" || href === "/swap" || href === "/mint" ? "1px" : "-1px" }}><Icon /></span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: theme toggle + wallet */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              if (!mounted) return null;
              if (!account || !chain) {
                return (
                  <>
                    {/* Mobile: icon only */}
                    <button
                      onClick={openConnectModal}
                      className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl text-white transition-all hover:brightness-110"
                      style={{ background: "#C9693A" }}
                      aria-label="Connect Wallet"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                        <path d="M16 11v2"/>
                        <path d="M2 11h20"/>
                      </svg>
                    </button>
                    {/* Desktop: full text */}
                    <button
                      onClick={openConnectModal}
                      className="hidden md:flex rounded-xl px-4 py-2 text-sm font-bold text-white transition-all hover:brightness-110"
                      style={{ background: "#C9693A" }}
                    >
                      Connect Wallet
                    </button>
                  </>
                );
              }
              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-2 rounded-xl border border-[--border] bg-[--bg-input] px-3 py-1.5 text-sm font-semibold text-[--text-primary] transition-all hover:border-[#C9693A]/40"
                  >
                    <span className="font-mono text-xs text-[--text-secondary]">{account.displayName}</span>
                  </button>
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
}
