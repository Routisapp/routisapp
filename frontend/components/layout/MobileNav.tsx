"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/swap",        label: "Swap",   icon: "⇄" },
  { href: "/mint",        label: "Mint",   icon: "⬟" },
  { href: "/leaderboard", label: "Board",  icon: "▦" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[--border] bg-[--bg-primary] md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                active ? "text-[--accent-blue]" : "text-[--text-secondary]"
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
