/**
 * resolveTokenLogo
 *
 * Returns a logo URL for a Base-chain token address.
 * Uses TrustWallet assets CDN — free, no API key, no rate limit.
 * Falls back to empty string → TokenIcon renders letter avatar.
 *
 * Note: TrustWallet doesn't cover every token. For common Base tokens
 * (USDC, WETH, AERO, etc.) the CoinGecko URLs are already embedded in
 * constants/tokens.ts so this function is only called for custom tokens.
 */

// Module-level cache — logo URLs never change within a session
const logoCache = new Map<string, string>();

export async function resolveTokenLogo(address: string): Promise<string> {
  const checksummed = address; // caller passes getAddress(search) already checksummed

  if (logoCache.has(checksummed)) return logoCache.get(checksummed)!;

  // TrustWallet assets CDN for Base chain
  const url = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/${checksummed}/logo.png`;

  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) {
      logoCache.set(checksummed, url);
      return url;
    }
  } catch { /* fall through */ }

  // Nothing found → letter avatar
  logoCache.set(checksummed, "");
  return "";
}
