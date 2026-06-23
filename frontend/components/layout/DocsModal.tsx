"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

// ── Table of Contents entries ─────────────────────────────────
const TOC = [
  { id: "getting-started",              label: "Getting Started" },
  { id: "swap",                         label: "Swap" },
  { id: "multi-swap",                   label: "Multi Swap" },
  { id: "ai-agent-x402",               label: "AI Agent (x402)" },
  { id: "wallet-stats",                 label: "Wallet Stats" },
  { id: "leaderboard",                  label: "Leaderboard" },
  { id: "routis-score--reward",         label: "Routis Score & Reward" },
  { id: "nft-badges",                   label: "NFT Badges" },
  { id: "profile--portfolio",           label: "Profile — Portfolio" },
  { id: "profile--transaction-history", label: "Profile — Transaction History" },
  { id: "profile--referral-program",    label: "Profile — Referral Program" },
  { id: "architecture-overview",        label: "Architecture Overview" },
  { id: "x402-protocol-integration",    label: "x402 Protocol Integration" },
  { id: "routing-algorithm",            label: "Routing Algorithm" },
  { id: "scoring-formulas",             label: "Scoring Formulas" },
  { id: "faq",                          label: "FAQ" },
  { id: "security",                     label: "Security" },
];

const DOCS_CONTENT = `# Routis Documentation

Routis is a DEX aggregator protocol running on the Base network. For a single swap, it scans dozens of liquidity pools (PancakeSwap, Uniswap, SushiSwap, Aerodrome) and finds the best route based on a balance of price, gas, and slippage.

Three things set it apart from other aggregators:

🤖 **AI-powered flow** — Users can give swap instructions in natural language ("convert 0.005 ETH to USDC"), and the transaction is executed via the x402 payment protocol.

🎮 **Gamification layer** — Every swap generates a Routis Score, and these points turn into NFT badges across the Bronze → Silver → Gold → Diamond tiers.

🔗 **On-chain reputation layer** — The Wallet Stats module processes BaseScan data to generate a reputation score between 0-100 for any wallet.

> ⚠️ Routis currently only operates on Base Mainnet. All transactions are irreversible — check the price impact, slippage, and fees on the Swap Preview screen before confirming a swap.

---

## Getting Started

Network: Base Mainnet (an OP Stack-based Ethereum L2), native token ETH, supported stablecoin USDC.

When determining a route, Routis compares Uniswap V3, PancakeSwap, SushiSwap, and Aerodrome. Pool depth, live price, and gas cost are recalculated with every swap request.

🔌 **Connecting a wallet:** Tap the wallet button in the top right → choose a wallet supported by MetaMask/Coinbase Wallet/WalletConnect → approve the signature request → make sure the network is set to Base Mainnet. Routis never asks for a private key or seed phrase; connecting only grants permission to read your address and sign transactions.

🌗 The moon/sun icon in the top menu toggles between Light/Dark theme.

Tabs: **Swap**, **AI Agent**, **Wallet Stats**, **Leaderboard**, **Reward**, **Profile**.

---

## Swap

Routis's core function: converting one token into another by selecting the best route across all liquidity sources.

The **You Pay** panel has the balance, amount input, token selector, and 25%/50%/75%/MAX quick buttons. The **You Receive** panel shows the destination token's balance, estimated amount, and token selector. The ↑↓ button between the two panels swaps the source/destination tokens.

📊 **Slippage:** The pool price can move in the time between when a transaction is sent on-chain and when it's included in a block. Slippage tolerance sets the acceptable upper limit for this movement. Low slippage increases the risk of the transaction reverting, while high slippage increases the risk of MEV/sandwich attacks.

🔀 The route distribution on the right panel (e.g. PancakeSwap 48.4%, Uniswap 40.3%, Aerodrome 8.1%, SushiSwap 3.2%) shows that when a single pool's liquidity is insufficient, the transaction is automatically split across multiple pools (split routing). The ↻ icon manually recalculates the route.

---

## Multi Swap

An expanded version of standard Swap: converts up to 3 different source tokens into a single destination token.

Use cases: 🧹 cleaning up small "dust" tokens, ⚖️ rebalancing a portfolio, 🚪 exiting multiple positions at once.

A separate route is calculated for each source token, and they all merge into a single destination token.

> ⚠️ Since Multi Swap may require a separate on-chain call (including approval) for each source token, the total gas cost can be higher than a single Swap.

---

## AI Agent (x402)

The Routis AI Agent is an autonomous assistant that lets users describe swaps in natural language and pays the transaction fee via the x402 protocol.

💡 **What is x402?** An open standard built on HTTP's unused 402 "Payment Required" status code, enabling instant stablecoin payments. When the client (here, the AI Agent) requests a resource, the server returns a 402 code along with the payment terms; once payment is completed on-chain, the request is fulfilled.

**Usage steps:**

1. Type your instruction in natural language into the box at the bottom of the page (e.g. "convert 0.005 ETH to USDC").
2. The Agent processes the request and returns a **Swap Ready** card: amount being sent, estimated amount to be received, selected route, DEX fee, price impact, slippage.
3. The **Swap Preview** screen additionally shows the AI Agent fee (0.2 USDC). You can back out with "Cancel," or trigger the x402 payment flow and execute the transaction with "Confirm Swap."

> ⚠️ This 0.2 USDC fee is charged separately on every confirmed transaction, on top of the DEX pool fee.

🎁 In the Reward system, the "Swap with AI Agent" task awards **+250 points** for every transaction confirmed via x402 (2.5x a standard Swap).

---

## Wallet Stats

An analytics module that works with BaseScan data to generate an on-chain reputation score (Wallet Score) for any Base address. You can look up any address, not just your own wallet.

Core data: address, wallet age, ETH balance.

**Score card** — a single composite score from 0-100, the weighted sum of five sub-metrics:

| Sub-Metric | Weight |
|---|---|
| 💳 Transactions | 25% |
| 🕰️ Wallet age | 20% |
| 💰 Volume | 25% |
| 📜 Contracts (interaction diversity) | 20% |
| ⛽ Gas fees | 10% |

Other cards: total transaction count, Base volume (USD), gas fees, last transaction time, number of active days, number of unique addresses interacted with.

📈 **Your wallet rank** shows the analyzed address's global rank among all addresses Routis has indexed.

> ⚠️ Don't confuse the Wallet Stats score with the Routis Score on the Leaderboard: Wallet Stats measures behavior across the entire Base network, while the Leaderboard measures only swap activity within the Routis platform.

---

## Leaderboard

A ranking table based solely on swap activity within the Routis platform — it doesn't use global on-chain data.

**Platform-wide:** total volume, total swap count, total trader count.

**Personal:** your own volume, your own swap count, your own Routis Score.

Ranking table columns: rank number, abbreviated address + badge tag, score, volume, swap count.

Tags like 🥇 **Gold Trader**, 🥉 **Bronze Trader**, and **Unranked Trader** show the reward tier a user has reached.

> 💡 Ranking is based on **score**, not volume — a user with less volume can rank higher thanks to completed tasks.

---

## Routis Score & Reward

The gamification layer that scores in-platform activity and converts it into NFT badges.

**Tiers:**

| Tier | Points |
|---|---|
| 🥉 Bronze | 1,000 pts |
| 🥈 Silver | 2,500 pts |
| 🥇 Gold | 5,000 pts |
| 💎 Diamond | 10,000 pts |

Tiers are earned cumulatively and can't be skipped; reaching Silver also preserves the Bronze badge.

**Tasks and points:**

| Task | Points |
|---|---|
| 🔄 1 Swap | +100 |
| 🔁 1 Multi Swap | +150 |
| 🤖 Swap with AI Agent | +250 |
| 🔥 7 consecutive days of activity | +500 |

AI Agent transactions award 2.5x the points of a standard Swap. The 7-day streak task is the highest-scoring task and is aimed directly at user retention.

---

## NFT Badges

Users who reach a reward tier can mint NFT badges, which appear in the "NFTs Owned" section of the Profile page.

- **Colored/highlighted badge** → tier reached and minted
- **Faded/gray badge** → that tier's point threshold hasn't been crossed yet

**Minting flow:** once the point threshold is crossed, the badge card moves from "Locked" to "Owned ✓" → the user confirms the mint transaction (requires gas) → the badge is sent to the wallet as an NFT and becomes visible on the Profile page.

> 💡 Badges are also displayed as a profile tag on the Leaderboard (e.g. "Gold Trader") — serving both a collectible and a social-status function.

---

## Profile — Portfolio

Shows the connected wallet's current asset distribution on Base.

At the top, the full wallet address and current reward tier (e.g. 🥉 Bronze) are shown. Tabs: **Portfolio**, **History**, **Referral**.

**Total balance card:** total USD value and the change over the last 24 hours.

The token list shows for each token: icon/name, USD value, unit price, distribution bar, token amount, and percentage of the portfolio. When there are multiple tokens, the list is sorted from highest to lowest USD value.

---

## Profile — Transaction History

The **History** tab lists all past transactions made through Routis.

| Field | Description |
|---|---|
| **Date / Time** | Timestamp of the transaction |
| **Transaction type** | Swap / Multi Swap / AI Agent |
| **You paid** | Token and amount sent |
| **You received** | Token and amount received |
| **Route** | The DEX used |
| **Tx hash** | On-chain record, linking to BaseScan |
| **Status** | Success / Failed / Pending |

---

## Profile — Referral Program

A tiered system where users earn extra points by bringing in new traders through their own invite link.

The referral link follows the format \`https://routis.app/ref/{address}\`. Two counters are shown: number of friends invited and points earned.

**Referral tiers:**

| Tier | Friends | Bonus per Swap |
|---|---|---|
| 🟠 Bronze | 1–5 | +25 pts |
| ⚪ Silver | 6–20 | +50 pts |
| 🟡 Gold | 21+ | +100 pts |

> 💡 The referrer earns points from **every swap** their invitees make — not just a one-time bonus. The per-swap bonus also increases as the tier goes up (4x from Bronze to Gold).

---

## Architecture Overview

Routis's conceptual system architecture consists of the following components:

| Component | Responsibility |
|---|---|
| **Aggregation Engine** | Pulls real-time price/liquidity from all DEXs and calculates the best (or split) route |
| **AI Agent / NLP Parser** | Converts natural-language swap requests into structured transaction parameters |
| **x402 Payment Middleware** | Manages the 402 payment cycle for AI Agent transactions and collects the agent fee |
| **Scoring & Reward Engine** | Converts completed transactions into Routis Score, tracking tier thresholds and NFT mint eligibility |
| **Wallet Analytics Engine** | Processes BaseScan data to calculate the 0-100 Wallet Score |
| **Routis Database** | Stores the Leaderboard, referral relationships, and user point history |

**Core principles:**

- Price data is always live (no static cache is used)
- On-chain data is the single source of truth (Wallet Score is verified from BaseScan)
- In-platform data (Routis Score) is kept separate from network-wide data (Wallet Score)

---

## x402 Protocol Integration

x402 is an open payment standard built on the 402 "Payment Required" code defined in the HTTP/1.1 spec but unused in practice. It lets the client complete a service request via a stablecoin transfer — without needing an API key, subscription, or account. This makes it especially well suited to autonomous AI agents.

**Its role in Routis, step by step:**

1. After processing the instruction and determining the best route, the AI Agent sends an "execute" request to Routis's transaction server.
2. Before processing the transaction, the server returns \`402 Payment Required\` with the payment amount, recipient address, and validity period.
3. When the user taps **Confirm Swap**, their wallet is asked to sign for the x402 payment amount.
4. Once the payment is verified on-chain, the server sends the actual swap calldata to the chain.
5. Once the transaction completes, both the swap result and the agent fee confirmation are shown in the interface.

> ⚠️ The user always gives final approval on the Swap Preview screen — the agent never triggers a payment or swap without user approval.

---

## Routing Algorithm

**Route selection criteria:** output amount (maximize), price impact (minimize), gas cost.

🔀 **Split routing:** Since a single pool's depth is limited, routing a large transaction through just one DEX significantly increases price impact. Routis therefore splits the transaction proportionally across multiple pools — keeping price impact low in each pool to achieve a better average price.

**Route recalculation triggers:** user changes the amount, source/destination token changes, ↻ icon is tapped manually, or a background refresh interval elapses.

**Price Impact vs. Slippage:**

- **Price Impact** — deterministic measure of how much your transaction moves the pool price (depends on size and pool depth).
- **Slippage** — user-defined tolerance against price changes caused by other transactions between submission and block inclusion.

---

## Scoring Formulas

> ⚠️ The formulas below have been reverse-engineered from the numerical data shown in the interface.

**Wallet Score:** Five sub-metrics (Transactions, Wallet Age, Volume, Contracts, Gas Fees) normalized to 0-10, multiplied by their weights (25%, 20%, 25%, 20%, 10%), summed, then multiplied by 10 to produce a 0-100 score.

**Routis Score:** The sum of fixed point values — +100 per Swap, +150 per Multi Swap, +250 per AI Agent swap, +500 per 7-day streak, plus referral bonuses. Routis Score is open-ended (not capped at 100), which is why values like \`7.03K\` appear on the Leaderboard.

The two systems operate independently: Wallet Score feeds the global ranking in Wallet Stats; Routis Score feeds the platform ranking on the Leaderboard.

---

## FAQ

**Which network does it run on?** Only Base (an OP Stack-based Ethereum L2).

**Are there fees?** For standard Swap/Multi Swap, only the DEX pool fee + gas. AI Agent transactions additionally include a fixed **0.2 USDC** Agent fee paid via x402.

**What's the difference between Swap and Multi Swap?** Swap is single source → single destination. Multi Swap routes up to 3 source tokens into a single destination.

**How do I give instructions to the AI Agent?** Type in natural language into the box at the bottom of the page (e.g. "convert 0.005 ETH to USDC").

**Is the x402 fee charged on every transaction?** Yes, separately for every confirmed transaction.

**Can the Agent execute a transaction without user approval?** No — route discovery is autonomous, but the final swap and payment always require a wallet signature.

**Are Wallet Score and Routis Score the same thing?** No. Wallet Score (0-100) measures on-chain reputation across the entire Base network. Routis Score measures only in-platform Routis activity and is open-ended.

**Can I analyze someone else's wallet?** Yes, any Base address can be looked up in Wallet Stats.

**Can tiers be skipped?** No — tiers are sequential and cumulative; Bronze must be crossed before Silver.

---

## Security

> 🔒 Routis never asks for a private key or seed phrase. Any site/person that asks for this is definitely a scam.

- Always connect your wallet via the official browser extension.
- Before signing, check which contract/function the signature is being requested for.
- For token approvals, prefer approving a specific amount over "unlimited approval" when possible.
- Verify that price impact isn't unexpectedly high and adjust slippage tolerance for market volatility.
- The AI Agent only suggests a route; fund movement only happens once explicit approval is given on the Swap Preview screen.
- Always verify the official domain to guard against phishing clones.

🔗 **Website** — [routis.app](https://routis.app)
🔗 **X (Twitter)** — [x.com/RoutisApp](https://x.com/RoutisApp)
`;

interface DocsModalProps {
  onClose: () => void;
}

export function DocsModal({ onClose }: DocsModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  function scrollTo(id: string) {
    const el = contentRef.current?.querySelector(`#${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex w-full md:w-[90vw] md:max-w-5xl"
        style={{
          height: "90vh",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}
        >
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9693A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span className="text-sm font-bold text-[--text-primary]">Routis Documentation</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[--text-secondary] transition-all hover:bg-[--bg-input] hover:text-[--text-primary]"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex w-full h-full pt-[53px]">

          {/* Sidebar TOC */}
          <aside
            className="hidden md:flex flex-col gap-0.5 overflow-y-auto p-3 shrink-0"
            style={{ width: 220, borderRight: "1px solid var(--border)", scrollbarWidth: "thin" }}
          >
            {TOC.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[--text-secondary] hover:bg-[--bg-input] hover:text-[--text-primary] transition-all"
              >
                {item.label}
              </button>
            ))}
          </aside>

          {/* Main content */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto px-6 py-5"
            style={{ scrollbarWidth: "thin" }}
          >
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-[--text-primary] mb-6 mt-2">{children}</h1>
                ),
                h2: ({ children, ...props }) => {
                  const text = String(children).toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-")
                    .replace(/-+/g, "-");
                  return (
                    <h2
                      id={text}
                      className="text-lg font-bold text-[--text-primary] mt-8 mb-3 pb-2"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      {...props}
                    >
                      {children}
                    </h2>
                  );
                },
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold text-[--text-primary] mt-5 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-[--text-secondary] leading-relaxed mb-3">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-[--text-primary]">{children}</strong>
                ),
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#C9693A] hover:underline">
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="my-3 pl-3 py-0.5 text-sm text-[--text-secondary] italic"
                    style={{ borderLeft: "3px solid #C9693A" }}
                  >
                    {children}
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <pre className="rounded-lg p-3 my-3 overflow-x-auto text-xs" style={{ background: "var(--bg-input)" }}>
                        <code className="text-[--text-primary]">{children}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="rounded px-1.5 py-0.5 text-xs font-mono text-[#C9693A]" style={{ background: "var(--bg-input)" }}>
                      {children}
                    </code>
                  );
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="w-full text-sm border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead style={{ borderBottom: "1px solid var(--border)" }}>{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[--text-secondary]">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 text-sm text-[--text-secondary]" style={{ borderBottom: "1px solid var(--border)" }}>
                    {children}
                  </td>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-[--bg-input] transition-colors">{children}</tr>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-[--text-secondary]">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-[--text-secondary]">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                hr: () => <hr className="my-6" style={{ borderColor: "var(--border)" }} />,
              }}
            >
              {DOCS_CONTENT}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
