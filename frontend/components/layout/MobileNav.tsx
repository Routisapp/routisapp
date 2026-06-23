"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const IconSwap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/>
  </svg>
);
const IconDiamond = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
);
const IconMedal = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/leaderboard.png" alt="leaderboard" width={18} height={18} style={{ display: "block", objectFit: "contain" }} />
);
const IconBarChart = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/wallet stat.jpg" alt="wallet stats" width={18} height={18} style={{ display: "block", objectFit: "contain" }} />
);
const IconUserCircle = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/profile.jpg" alt="profile" width={18} height={18} style={{ display: "block", objectFit: "contain", borderRadius: "50%" }} />
);
const IconAgent = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2"/>
    <path d="M8 11h.01M12 11h.01M16 11h.01"/>
    <path d="M12 7V4"/><circle cx="12" cy="3" r="1"/>
  </svg>
);

const NAV = [
  { href: "/swap",         label: "Swap",   Icon: IconSwap       },
  { href: "/agent",        label: "Agent",  Icon: IconAgent      },
  { href: "/wallet-stats", label: "Stats",  Icon: IconBarChart   },
  { href: "/leaderboard",  label: "Board",  Icon: IconMedal      },
  { href: "/mint",         label: "Reward", Icon: IconDiamond    },
  { href: "/profile",      label: "Profile",Icon: IconUserCircle },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[--border] bg-[--bg-primary] md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex h-16 items-center justify-around px-2">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[10px] font-semibold transition-all ${
                active ? "text-[--accent-blue]" : "text-[--text-secondary]"
              }`}
            >
              <span style={{ position: "relative", top: "-1px" }}><Icon /></span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
