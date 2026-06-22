/**
 * On-chain data client — server-side only.
 *
 * Sources:
 *  - Blockscout (base.blockscout.com) : recent tx list, ETH balance
 *  - Alchemy RPC                      : total tx count (accurate), first tx date, gas fees
 *
 * Alchemy is used because Blockscout counters return 0 for many wallets
 * that are not fully indexed. BaseScan V1 is deprecated; V2 is paid.
 */

import { formatUnits } from "viem";

// ── Blockscout ───────────────────────────────────────────────────────────────

const BS_URL = "https://base.blockscout.com/api/v2";

async function bsGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs  = new URLSearchParams(params).toString();
  const url = `${BS_URL}${path}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Blockscout HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export interface BlockscoutTx {
  hash:         string;
  from:         { hash: string };
  to:           { hash: string } | null;
  timestamp:    string;   // ISO-8601
  status:       "ok" | "error";
  value:        string;   // wei (ETH transferred)
  method:       string | null;
  block_number: number;
  gas_used:     string | null;   // gas actually consumed
  gas_price:    string | null;   // wei per gas unit
}

async function fetchAllPages<T>(
  path:        string,
  firstParams: Record<string, string> = {},
  maxPages    = 3,
): Promise<T[]> {
  const results: T[] = [];
  let params: Record<string, string> | null = firstParams;
  let page = 0;

  while (params !== null && page < maxPages) {
    const data = await bsGet<{ items: T[]; next_page_params: Record<string, string> | null }>(
      path, params,
    );
    results.push(...data.items);
    params = data.next_page_params
      ? Object.fromEntries(Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)]))
      : null;
    page++;
    if (params) await new Promise(r => setTimeout(r, 80));
  }
  return results;
}

/** Recent transactions (newest-first, max 150) — for lastTx, uniqueAddresses */
export async function fetchTxList(address: string): Promise<BlockscoutTx[]> {
  return fetchAllPages<BlockscoutTx>(`/addresses/${address}/transactions`, {}, 3);
}

/** ETH balance + basic address info */
export async function fetchAddressInfo(address: string): Promise<{
  coin_balance: string | null;
  hash:         string;
}> {
  return bsGet<{ coin_balance: string | null; hash: string }>(`/addresses/${address}`);
}

// ── Alchemy RPC ──────────────────────────────────────────────────────────────

const ALCHEMY_URL = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY ?? ""}`;

async function alchemyRpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(ALCHEMY_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache:   "no-store",
  });
  if (!res.ok) throw new Error(`Alchemy HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`Alchemy RPC error: ${json.error.message}`);
  return json.result as T;
}

interface AlchemyTransfer {
  blockNum:  string;
  hash:      string;
  from:      string;
  to:        string | null;
  metadata?: { blockTimestamp?: string };
}

interface AlchemyTransfersResult {
  transfers: AlchemyTransfer[];
  pageKey?:  string;
}

/**
 * Fetch all asset transfers for an address (sent + received) using Alchemy.
 * Returns transfers sorted ascending (oldest first) when order="asc".
 * maxPages safety cap prevents infinite loops on very active wallets.
 */
async function fetchAllTransfers(
  address: string,
  direction: "from" | "to",
  maxPages = 5,
): Promise<AlchemyTransfer[]> {
  const CATEGORIES = ["external"];
  const results: AlchemyTransfer[] = [];
  let pageKey: string | undefined;
  let page = 0;

  while (page < maxPages) {
    const params: Record<string, unknown> = {
      fromBlock:        "0x0",
      toBlock:          "latest",
      category:         CATEGORIES,
      maxCount:         "0x3e8", // 1000 per page — gets all txs in one shot for most wallets
      order:            "asc",
      withMetadata:     true,
      excludeZeroValue: false,
    };
    if (direction === "from") params.fromAddress = address;
    else                       params.toAddress   = address;
    if (pageKey) params.pageKey = pageKey;

    const res = await alchemyRpc<AlchemyTransfersResult>(
      "alchemy_getAssetTransfers", [params],
    );
    results.push(...res.transfers);
    if (!res.pageKey) break;
    pageKey = res.pageKey;
    page++;
    // No artificial delay — Alchemy free tier handles burst fine
  }
  return results;
}

/**
 * Fetch ALL unique tx hashes sent by an address across all transfer categories.
 * Uses multiple category groups to catch every tx type:
 *   - external: plain ETH sends
 *   - erc20/erc721/erc1155: token transfers (swaps, NFT mints, etc.)
 * Internal transfers share the same parent tx hash, so deduplication is key.
 */
async function fetchAllSentTxHashes(address: string): Promise<string[]> {
  const ALL_CATEGORIES = [
    ["external", "erc20", "erc721", "erc1155"],
  ];

  const hashSet = new Set<string>();

  for (const category of ALL_CATEGORIES) {
    let pageKey: string | undefined;
    let page = 0;
    while (page < 10) {
      const params: Record<string, unknown> = {
        fromBlock:        "0x0",
        toBlock:          "latest",
        fromAddress:      address,
        category,
        maxCount:         "0x3e8",
        order:            "asc",
        withMetadata:     false,
        excludeZeroValue: false,
      };
      if (pageKey) params.pageKey = pageKey;

      const res = await alchemyRpc<AlchemyTransfersResult>(
        "alchemy_getAssetTransfers", [params],
      );
      for (const t of res.transfers) {
        if (t.hash) hashSet.add(t.hash);
      }
      if (!res.pageKey) break;
      pageKey = res.pageKey;
      page++;
    }
  }

  return [...hashSet];
}

/**
 * Batch fetch tx receipts using Alchemy JSON-RPC batch endpoint.
 * Sends all receipt requests in one HTTP call per batch of 100.
 * Returns gasUsed + effectiveGasPrice for each.
 */
async function batchGetReceipts(
  hashes: string[],
): Promise<Array<{ gasUsed: string; effectiveGasPrice: string }>> {
  const BATCH_SIZE = 100;
  const results: Array<{ gasUsed: string; effectiveGasPrice: string }> = [];

  for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
    const batch = hashes.slice(i, i + BATCH_SIZE).map((hash, idx) => ({
      jsonrpc: "2.0",
      id:      i + idx,
      method:  "eth_getTransactionReceipt",
      params:  [hash],
    }));

    const res = await fetch(ALCHEMY_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(batch),
      cache:   "no-store",
    });

    if (!res.ok) continue;
    const json: Array<{ result: { gasUsed: string; effectiveGasPrice: string } | null }> =
      await res.json();

    for (const item of json) {
      if (item?.result?.gasUsed && item?.result?.effectiveGasPrice) {
        results.push(item.result);
      }
    }
  }

  return results;
}

export interface WalletChainStats {
  totalTxs:        number;
  firstTxDate:     string;
  lastTxDate:      string;
  activeDays:      number;
  uniqueAddresses: number;
  gasFees:         string;   // total ETH spent on gas (formatted, e.g. "0.0042")
  baseVolumeUsd:   number;   // total USD value of ETH sent on Base
}

/**
 * Get accurate stats via Alchemy.
 *
 * Gas fee calculation:
 *   - Fetch ALL unique tx hashes via alchemy_getAssetTransfers (all categories)
 *   - Batch fetch receipts via JSON-RPC batch (100 per HTTP call)
 *   - gasUsed × effectiveGasPrice = actual gas cost per tx
 *   - Covers ALL tx types: swaps, NFT mints, contract calls, ETH transfers
 */
export async function fetchChainStats(address: string): Promise<WalletChainStats> {
  try {
    const lower = address.toLowerCase();

    // Step 1: parallel fetch — nonce + all sent transfers (timestamps, active days, gas hashes)
    const [nonceHex, allSentTransfers, allTxHashes] = await Promise.all([
      alchemyRpc<string>("eth_getTransactionCount", [lower, "latest"]),
      fetchAllTransfers(lower, "from", 5),
      fetchAllSentTxHashes(lower),
    ]);

    const sentTxs = parseInt(nonceHex, 16);

    // Active days + unique addresses from Alchemy external transfers
    const daySet  = new Set<string>();
    const addrSet = new Set<string>();
    for (const t of allSentTransfers) {
      const ts = t.metadata?.blockTimestamp;
      if (ts) daySet.add(ts.slice(0, 10));
      if (t.to && t.to.toLowerCase() !== lower) addrSet.add(t.to.toLowerCase());
    }
    const activeDays      = daySet.size;
    const uniqueAddresses = addrSet.size;

    // First/last tx dates from sent transfers
    const sentFirst  = allSentTransfers[0]?.metadata?.blockTimestamp ?? "";
    const lastSent   = allSentTransfers[allSentTransfers.length - 1]?.metadata?.blockTimestamp ?? "";
    const firstTxDate = sentFirst;
    const lastTxDate  = lastSent;

    // Step 2: batch fetch all receipts for gas calculation
    const receipts = await batchGetReceipts(allTxHashes);

    let totalGasWei = BigInt(0);
    for (const r of receipts) {
      totalGasWei += BigInt(r.gasUsed) * BigInt(r.effectiveGasPrice);
    }

    const gasEth  = parseFloat(formatUnits(totalGasWei, 18));
    const gasFees = gasEth === 0
      ? "0"
      : gasEth < 0.0001
        ? gasEth.toFixed(6)
        : gasEth.toFixed(4);

    // ETH price for USD volume calculation
    let ethPriceUsd = 0;
    try {
      const priceRes = await fetch(
        `https://api.g.alchemy.com/prices/v1/${process.env.ALCHEMY_API_KEY}/tokens/by-symbol?symbols=ETH`,
        { cache: "no-store" }
      );
      if (priceRes.ok) {
        const priceJson = await priceRes.json();
        ethPriceUsd = parseFloat(priceJson?.data?.[0]?.prices?.[0]?.value ?? "0");
      }
    } catch { /* fallback */ }

    // Base volume: sum ETH value from external transfers
    let totalEthSent = 0;
    for (const t of allSentTransfers) {
      if (t.value && typeof (t as unknown as { value: number }).value === "number") {
        totalEthSent += (t as unknown as { value: number }).value;
      }
    }
    const baseVolumeUsd = ethPriceUsd > 0
      ? Math.round(totalEthSent * ethPriceUsd * 100) / 100
      : 0;

    return { totalTxs: sentTxs, firstTxDate, activeDays, uniqueAddresses, lastTxDate, gasFees, baseVolumeUsd };
  } catch (err) {
    console.error("[fetchChainStats] ERROR:", err);
    return { totalTxs: 0, firstTxDate: "", lastTxDate: "", activeDays: 0, uniqueAddresses: 0, gasFees: "0", baseVolumeUsd: 0 };
  }
}
