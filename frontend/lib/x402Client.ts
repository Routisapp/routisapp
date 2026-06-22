"use client";

/**
 * x402 Browser Client — @x402/next withX402 server ile tam uyumlu.
 * EIP-3009 TransferWithAuthorization imzalar, PAYMENT-SIGNATURE header ile retry yapar.
 */

import type { WalletClient, PublicClient } from "viem";
import { toHex } from "viem";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

interface PaymentRequirements {
  scheme:             string;
  network:            string;
  amount?:            string;
  maxAmountRequired?: string;
  payTo:              string;
  maxTimeoutSeconds:  number;
  asset?:             string;
  extra?:             Record<string, unknown>;
  [key: string]:      unknown;
}

interface PaymentRequired {
  x402Version: number;
  accepts:     PaymentRequirements[];
  error?:      string;
}

const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from",        type: "address" },
    { name: "to",          type: "address" },
    { name: "value",       type: "uint256" },
    { name: "validAfter",  type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce",       type: "bytes32" },
  ],
} as const;

async function signEIP3009(
  walletClient: WalletClient,
  req: PaymentRequirements,
): Promise<{ signature: `0x${string}`; authorization: Record<string, string> }> {
  const from        = walletClient.account!.address;
  const to          = req.payTo as `0x${string}`;
  const rawAmount   = req.amount ?? req.maxAmountRequired ?? "0";
  const value       = BigInt(rawAmount);
  const validAfter  = "0";
  const validBefore = (BigInt(Math.floor(Date.now() / 1000)) + BigInt(req.maxTimeoutSeconds ?? 300)).toString();
  const nonce       = toHex(crypto.getRandomValues(new Uint8Array(32))) as `0x${string}`;
  const chainId     = await walletClient.getChainId();
  const tokenName   = (req.extra?.name    as string | undefined) ?? "USD Coin";
  const tokenVersion= (req.extra?.version as string | undefined) ?? "2";
  const asset       = (req.asset ?? USDC_ADDRESS) as `0x${string}`;

  const signature = await walletClient.signTypedData({
    account: walletClient.account!,
    domain:  { name: tokenName, version: tokenVersion, chainId, verifyingContract: asset },
    types:       EIP3009_TYPES,
    primaryType: "TransferWithAuthorization",
    message: {
      from, to, value,
      validAfter:  BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce,
    },
  });

  return {
    signature,
    authorization: { from, to, value: value.toString(), validAfter, validBefore, nonce },
  };
}

function safeBase64Decode(str: string): string {
  return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
}

export async function x402Fetch(
  url: string,
  options: RequestInit,
  walletClient: WalletClient,
  _publicClient: PublicClient,
): Promise<Response> {
  // 1. İlk istek
  const res = await fetch(url, options);
  if (res.status !== 402) return res;

  // 2. PAYMENT-REQUIRED header'ını parse et
  const paymentRequiredHeader = res.headers.get("PAYMENT-REQUIRED");
  if (!paymentRequiredHeader) {
    throw new Error("x402: PAYMENT-REQUIRED header bulunamadı");
  }

  let paymentRequired: PaymentRequired;
  try {
    paymentRequired = JSON.parse(safeBase64Decode(paymentRequiredHeader));
  } catch {
    throw new Error("x402: PAYMENT-REQUIRED header decode edilemedi");
  }

  const req = paymentRequired.accepts?.[0];
  if (!req) throw new Error("x402: payment requirements alınamadı");

  const x402Version = paymentRequired.x402Version ?? 2;

  // 3. EIP-3009 imzala
  const { signature, authorization } = await signEIP3009(walletClient, req);

  // 4. Payment payload
  const paymentPayload = {
    x402Version,
    accepted: {
      scheme:            req.scheme,
      network:           req.network,
      amount:            req.amount ?? req.maxAmountRequired ?? "0",
      asset:             req.asset ?? USDC_ADDRESS,
      payTo:             req.payTo,
      maxTimeoutSeconds: req.maxTimeoutSeconds ?? 300,
      extra:             req.extra ?? {},
    },
    payload: { signature, authorization },
  };

  const paymentSignatureHeader = btoa(JSON.stringify(paymentPayload));

  // 5. Retry
  const retryRes = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> ?? {}),
      "PAYMENT-SIGNATURE": paymentSignatureHeader,
      "x402-version":      String(x402Version),
    },
  });

  // 402 gelirse anlamlı hata fırlat
  if (retryRes.status === 402) {
    const hdr = retryRes.headers.get("PAYMENT-REQUIRED") ?? retryRes.headers.get("payment-required") ?? "";
    let invalidReason = "Fee payment failed";
    if (hdr) {
      try {
        const decoded = JSON.parse(safeBase64Decode(hdr));
        invalidReason = decoded?.error ?? decoded?.invalidReason ?? decoded?.invalidMessage ?? invalidReason;
      } catch { /* ignore */ }
    }
    throw new Error(`x402: ${invalidReason}`);
  }

  return retryRes;
}
