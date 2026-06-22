"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance, useReadContracts, usePublicClient } from "wagmi";
import { erc20Abi, formatUnits, getAddress } from "viem";
import { BASE_TOKENS, NATIVE_ETH, type Token } from "@/constants/tokens";
import { resolveTokenLogo } from "@/lib/tokenLogo";

// ── Minimal ERC-20 ABI for on-chain token lookup ──────────────────────────────
const ERC20_READ_ABI = [
  { name: "symbol",   inputs: [], outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { name: "name",     inputs: [], outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { name: "decimals", inputs: [], outputs: [{ type: "uint8"  }], stateMutability: "view", type: "function" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
const isEvmAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

// ── Token icon with letter fallback ──────────────────────────────────────────
function TokenIcon({ token, size = 8 }: { token: Token; size?: number }) {
  const [srcFailed, setSrcFailed] = useState(false);
  // Reset when the token changes
  const [lastAddress, setLastAddress] = useState(token.address);
  if (token.address !== lastAddress) {
    setLastAddress(token.address);
    setSrcFailed(false);
  }

  const px  = size * 4; // Tailwind h-8 = 32px

  if (srcFailed || !token.logoURI) {
    const hue = token.symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    return (
      <span
        style={{
          width: px, height: px, borderRadius: "50%", flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: `hsl(${hue}, 55%, 88%)`,
          color: `hsl(${hue}, 55%, 30%)`,
          fontSize: px * 0.35, fontWeight: 700,
          userSelect: "none",
        }}
      >
        {token.symbol.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={token.logoURI}
      alt={token.symbol}
      width={px}
      height={px}
      style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      onError={() => setSrcFailed(true)}
    />
  );
}

// ── Token row ─────────────────────────────────────────────────────────────────
function TokenRow({
  token, balance, onClick,
}: {
  token:   Token;
  balance: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[--bg-input] transition-colors text-left"
    >
      <TokenIcon token={token} size={8} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[--text-primary]">{token.symbol}</div>
        <div className="text-xs text-[--text-secondary] truncate">{token.name}</div>
      </div>
      {balance !== null && balance !== "0.0000" && (
        <span className="text-xs font-semibold text-[--text-secondary] shrink-0">{balance}</span>
      )}
    </button>
  );
}

// ── Main TokenSelector ────────────────────────────────────────────────────────
interface Props {
  selected:     Token | null;
  onSelect:     (token: Token) => void;
  exclude?:     string;
  excludeMany?: string[];
  label:        string;
}

export function TokenSelector({ selected, onSelect, exclude, excludeMany, label }: Props) {
  const [open, setOpen] = useState(false);

  const excluded = new Set([
    ...(exclude ? [exclude] : []),
    ...(excludeMany ?? []),
  ]);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-[--bg-input] px-3 py-2 hover:bg-[--border] transition-colors"
      >
        {selected ? (
          <>
            <TokenIcon token={selected} size={6} />
            <span className="text-sm font-bold text-[--text-primary]">{selected.symbol}</span>
          </>
        ) : (
          <span className="text-sm font-semibold text-[--text-secondary]">Select {label}</span>
        )}
        <span className="text-[--text-secondary]">▾</span>
      </button>

      {/* Modal */}
      {open && (
        <ModalWithBalances
          baseTokens={BASE_TOKENS.filter((t) => !excluded.has(t.address))}
          onSelect={(t) => { onSelect(t); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── Modal — reads balances, handles custom-token lookup, and sorts ────────────
function ModalWithBalances({
  baseTokens, onSelect, onClose,
}: {
  baseTokens: Token[];
  onSelect:   (t: Token) => void;
  onClose:    () => void;
}) {
  const { address }  = useAccount();
  const publicClient = usePublicClient();

  const [search, setSearch] = useState("");

  // ── Custom-token state ──────────────────────────────────────────────────────
  const [customToken,         setCustomToken]         = useState<Token | null>(null);
  const [isLoadingCustomToken, setIsLoadingCustomToken] = useState(false);

  // ── Derive the visible token list ──────────────────────────────────────────
  const q = search.toLowerCase().trim();

  let visibleTokens: Token[];

  if (isEvmAddress(search)) {
    // Address paste: exact match in base list (case-insensitive), else use customToken
    const existing = baseTokens.find(
      (t) => t.address.toLowerCase() === search.toLowerCase(),
    );
    visibleTokens = existing ? [existing] : customToken ? [customToken] : [];
  } else {
    visibleTokens = q
      ? baseTokens.filter(
          (t) =>
            t.symbol.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q),
        )
      : baseTokens;
  }

  // ── On-chain fetch when address not found in base list ─────────────────────
  useEffect(() => {
    // Reset whenever search changes
    setCustomToken(null);

    if (!isEvmAddress(search)) return;

    // Already in base list — no fetch needed
    const existing = baseTokens.find(
      (t) => t.address.toLowerCase() === search.toLowerCase(),
    );
    if (existing) return;

    if (!publicClient) return;

    let cancelled = false;

    const fetchToken = async () => {
      setIsLoadingCustomToken(true);
      try {
        const checksummed = getAddress(search);

        // On-chain metadata + logo resolution run in parallel
        const [symbol, name, decimals, logoURI] = await Promise.all([
          publicClient.readContract({
            address:      checksummed,
            abi:          ERC20_READ_ABI,
            functionName: "symbol",
          }) as Promise<string>,
          publicClient.readContract({
            address:      checksummed,
            abi:          ERC20_READ_ABI,
            functionName: "name",
          }) as Promise<string>,
          publicClient.readContract({
            address:      checksummed,
            abi:          ERC20_READ_ABI,
            functionName: "decimals",
          }) as Promise<number>,
          resolveTokenLogo(checksummed),
        ]);

        if (!cancelled) {
          setCustomToken({
            address:  checksummed,
            symbol:   String(symbol),
            name:     String(name),
            decimals: Number(decimals),
            logoURI,   // "" → letter avatar via TokenIcon fallback chain
            chainId:  8453,
          });
        }
      } catch {
        if (!cancelled) setCustomToken(null);
      } finally {
        if (!cancelled) setIsLoadingCustomToken(false);
      }
    };

    fetchToken();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── Balance fetching ────────────────────────────────────────────────────────
  const erc20s = visibleTokens.filter((t) => t.address !== NATIVE_ETH);

  const { data: ethBal } = useBalance({
    address,
    query: { enabled: !!address },
  });

  const { data: erc20Data } = useReadContracts({
    contracts: erc20s.map((t) => ({
      address:      t.address as `0x${string}`,
      abi:          erc20Abi,
      functionName: "balanceOf" as const,
      args:         [address ?? "0x0000000000000000000000000000000000000000"] as [`0x${string}`],
    })),
    query: { enabled: !!address && erc20s.length > 0 },
  });

  // Build balance map
  const balanceMap: Record<string, string> = {};
  if (address) {
    visibleTokens.forEach((token) => {
      if (token.address === NATIVE_ETH) {
        const raw = ethBal?.value ?? 0n;
        const fmt = parseFloat(formatUnits(raw, 18));
        if (fmt > 0) balanceMap[token.address] = fmt.toFixed(4);
      } else {
        const idx = erc20s.findIndex((e) => e.address === token.address);
        if (idx >= 0 && erc20Data?.[idx]?.status === "success") {
          const raw = (erc20Data[idx].result as bigint | undefined) ?? 0n;
          const fmt = parseFloat(formatUnits(raw, token.decimals));
          if (fmt > 0) balanceMap[token.address] = fmt.toFixed(4);
        }
      }
    });
  }

  // Sort: tokens with balance first (desc), then rest
  const sorted = [...visibleTokens].sort((a, b) => {
    const ba = parseFloat(balanceMap[a.address] ?? "0");
    const bb = parseFloat(balanceMap[b.address] ?? "0");
    return bb - ba;
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  const showEmpty = !isLoadingCustomToken && sorted.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[--border] bg-[--bg-card] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[--text-primary]">Select Token</h3>
          <button onClick={onClose} className="text-[--text-secondary] hover:text-[--text-primary]">✕</button>
        </div>

        <input
          type="text"
          placeholder="Search by name, symbol or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 w-full rounded-xl bg-[--bg-input] px-3 py-2 text-sm text-[--text-primary] outline-none placeholder:text-[--text-secondary] border border-[--border] focus:border-[--accent-blue]"
          autoFocus
        />

        <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
          {/* Loading spinner while fetching custom token */}
          {isLoadingCustomToken && (
            <div className="flex items-center justify-center gap-2 py-6">
              <svg
                className="h-4 w-4 animate-spin text-[--accent-blue]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm text-[--text-secondary]">Looking up token…</span>
            </div>
          )}

          {/* Token list */}
          {!isLoadingCustomToken && sorted.map((token) => (
            <TokenRow
              key={token.address}
              token={token}
              balance={balanceMap[token.address] ?? null}
              onClick={() => onSelect(token)}
            />
          ))}

          {/* Empty state */}
          {showEmpty && (
            <p className="py-6 text-center text-sm text-[--text-secondary]">No tokens found</p>
          )}
        </div>
      </div>
    </div>
  );
}
