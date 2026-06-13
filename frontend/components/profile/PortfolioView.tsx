"use client";

import { useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { useTokenPrices } from "@/hooks/useTokenPrice";
import { BASE_TOKENS, NATIVE_ETH } from "@/constants/tokens";
import { formatUsd } from "@/lib/utils";

interface Props {
  address: string;
}

// Top 8 tokens (BASE_TOKENS already has exactly 8)
const PORTFOLIO_TOKENS = BASE_TOKENS.slice(0, 8);

// ─── Single ERC-20 balance row (hooks must be at component level) ─────────────
function TokenRow({
  address,
  token,
  price,
  total,
}: {
  address: string;
  token: (typeof PORTFOLIO_TOKENS)[number];
  price: number;
  total: number;
}) {
  const isNative = token.address === NATIVE_ETH;

  const native = useBalance({
    address: address as `0x${string}`,
    query: { enabled: isNative, refetchInterval: 15_000 },
  });

  const erc20 = useReadContract({
    address: token.address as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !isNative, refetchInterval: 15_000 },
  });

  const rawBalance: bigint = isNative
    ? (native.data?.value ?? 0n)
    : ((erc20.data as bigint | undefined) ?? 0n);

  const amount = Number(rawBalance) / 10 ** token.decimals;
  const usdValue = amount * price;
  const pct = total > 0 ? (usdValue / total) * 100 : 0;

  if (amount <= 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[--border] last:border-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={token.logoURI}
        alt={token.symbol}
        className="h-8 w-8 rounded-full flex-shrink-0"
        style={{ filter: "none" }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className="text-sm font-semibold text-[--text-primary]">{token.symbol}</span>
            <span className="ml-1.5 text-[10px] text-[--text-secondary]">{token.name}</span>
          </div>
          <span className="text-sm font-bold text-[--text-primary]">{formatUsd(usdValue)}</span>
        </div>
        {/* Portfolio bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[--border] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(pct, 100)}%`, background: "#C9693A" }}
            />
          </div>
          <span className="text-[10px] text-[--text-secondary] shrink-0 w-10 text-right">
            {pct.toFixed(1)}%
          </span>
        </div>
        <div className="text-[10px] text-[--text-secondary] mt-0.5">
          {amount.toFixed(4)} {token.symbol}
        </div>
      </div>
    </div>
  );
}

// ─── Main PortfolioView ───────────────────────────────────────────────────────
export function PortfolioView({ address }: Props) {
  const { data: prices = {} } = useTokenPrices(
    PORTFOLIO_TOKENS.map((t) => t.address),
  );

  // Compute totals client-side using a separate component that reads all balances
  return (
    <PortfolioInner address={address} prices={prices} />
  );
}

// ─── Inner: needs prices in scope to compute totals ───────────────────────────
function PortfolioInner({
  address,
  prices,
}: {
  address: string;
  prices: Record<string, number>;
}) {
  // We need to pre-read all balances to compute the total for percentage bars.
  // Use individual balance hooks per token via a helper list.
  const nativeBalance = useBalance({
    address: address as `0x${string}`,
    query: { enabled: true, refetchInterval: 15_000 },
  });

  const erc20Results = PORTFOLIO_TOKENS.filter(
    (t) => t.address !== NATIVE_ETH,
  ).map((token) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({
      address: token.address as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
      query: { refetchInterval: 15_000 },
    }),
  );

  // Build amounts map
  const amountMap: Record<string, number> = {};
  PORTFOLIO_TOKENS.forEach((token, idx) => {
    const isNative = token.address === NATIVE_ETH;
    let raw: bigint;
    if (isNative) {
      raw = nativeBalance.data?.value ?? 0n;
    } else {
      // Find index among non-native tokens
      const nonNativeIdx = PORTFOLIO_TOKENS.filter(
        (t) => t.address !== NATIVE_ETH,
      ).findIndex((t) => t.address === token.address);
      raw = (erc20Results[nonNativeIdx]?.data as bigint | undefined) ?? 0n;
    }
    amountMap[token.address] = Number(raw) / 10 ** token.decimals;
  });

  // Compute USD values
  const usdMap: Record<string, number> = {};
  PORTFOLIO_TOKENS.forEach((token) => {
    const price = prices[token.address.toLowerCase()] ?? 0;
    usdMap[token.address] = amountMap[token.address] * price;
  });

  // Total portfolio value
  const total = Object.values(usdMap).reduce((s, v) => s + v, 0);

  // Filter tokens with balance > 0 and sort by USD desc
  const visibleTokens = PORTFOLIO_TOKENS.filter(
    (t) => amountMap[t.address] > 0,
  ).sort((a, b) => usdMap[b.address] - usdMap[a.address]);

  // 24h change placeholder (static design element as per spec)
  const change24h = total > 0 ? total * 0.015 : 0; // placeholder: 1.5% up
  const changePositive = change24h >= 0;

  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-card] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[--border]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[--text-secondary] mb-1">
              Total Balance
            </p>
            <p className="text-2xl font-black text-[--text-primary]">
              {formatUsd(total)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[--text-secondary] mb-1">24h Change</p>
            <p
              className="text-sm font-bold"
              style={{ color: changePositive ? "#C9693A" : "#C9522A" }}
            >
              {changePositive ? "+" : ""}
              {formatUsd(change24h)} (24h)
            </p>
          </div>
        </div>
      </div>

      {/* Token list */}
      {visibleTokens.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-[--text-secondary]">
          No tokens with balance found
        </p>
      ) : (
        <div>
          {visibleTokens.map((token) => {
            const price = prices[token.address.toLowerCase()] ?? 0;
            const pct =
              total > 0 ? (usdMap[token.address] / total) * 100 : 0;
            const amount = amountMap[token.address];
            const usdValue = usdMap[token.address];

            return (
              <div
                key={token.address}
                className="flex items-center gap-3 px-4 py-3 border-b border-[--border] last:border-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={token.logoURI}
                  alt={token.symbol}
                  className="h-8 w-8 rounded-full flex-shrink-0"
                  style={{ filter: "none" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-[--text-primary]">
                        {token.symbol}
                      </span>
                      <span className="ml-1.5 text-[10px] text-[--text-secondary] hidden sm:inline">
                        {token.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-sm font-bold text-[--text-primary] block">
                        {formatUsd(usdValue)}
                      </span>
                      {price > 0 && (
                        <span className="text-[10px] text-[--text-secondary]">
                          @{formatUsd(price)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Portfolio share bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[--border] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: "#C9693A",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[--text-secondary] shrink-0 w-10 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[--text-secondary] mt-0.5">
                    {amount.toFixed(4)} {token.symbol}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
