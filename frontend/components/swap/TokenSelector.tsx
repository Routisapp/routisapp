"use client";

import { useState } from "react";
import { BASE_TOKENS, type Token } from "@/constants/tokens";

interface Props {
  selected:      Token | null;
  onSelect:      (token: Token) => void;
  exclude?:      string;
  excludeMany?:  string[];
  label:         string;
}

export function TokenSelector({ selected, onSelect, exclude, excludeMany, label }: Props) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");

  const excluded = new Set([
    ...(exclude ? [exclude] : []),
    ...(excludeMany ?? []),
  ]);

  const filtered = BASE_TOKENS.filter(
    (t) =>
      !excluded.has(t.address) &&
      (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-[--bg-input] px-3 py-2 hover:bg-[--border] transition-colors"
      >
        {selected ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.logoURI}
              alt={selected.symbol}
              className="h-6 w-6 rounded-full"
              onError={(e) => { (e.target as HTMLImageElement).src = "/icons/token-placeholder.svg"; }}
            />
            <span className="text-sm font-bold text-[--text-primary]">{selected.symbol}</span>
          </>
        ) : (
          <span className="text-sm font-semibold text-[--text-secondary]">Select {label}</span>
        )}
        <span className="text-[--text-secondary]">▾</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-[--border] bg-[--bg-card] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Select Token</h3>
              <button onClick={() => setOpen(false)} className="text-[--text-secondary] hover:text-white">✕</button>
            </div>

            <input
              type="text"
              placeholder="Search by name or symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3 w-full rounded-xl bg-[--bg-input] px-3 py-2 text-sm text-[--text-primary] outline-none placeholder:text-[--text-secondary] border border-[--border] focus:border-[--accent-blue]"
              autoFocus
            />

            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.map((token) => (
                <button
                  key={token.address}
                  onClick={() => { onSelect(token); setOpen(false); setSearch(""); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[--bg-input] transition-colors text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={token.logoURI}
                    alt={token.symbol}
                    className="h-8 w-8 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/icons/token-placeholder.svg"; }}
                  />
                  <div>
                    <div className="text-sm font-semibold text-[--text-primary]">{token.symbol}</div>
                    <div className="text-xs text-[--text-secondary]">{token.name}</div>
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-[--text-secondary]">No tokens found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
