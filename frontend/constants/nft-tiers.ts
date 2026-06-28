export const NFT_TIERS = [
  {
    id:            0,
    name:          "Bronze",
    requiredScore: 1000,
    color:         "#CD7F32",
    benefits:      ["0.1% fee discount", "Exclusive profile badge"],
  },
  {
    id:            1,
    name:          "Silver",
    requiredScore: 2500,
    color:         "#C0C0C0",
    benefits:      ["0.2% fee discount", "Hidden tokens"],
  },
  {
    id:            2,
    name:          "Gold",
    requiredScore: 5000,
    color:         "#FFD700",
    benefits:      ["0.3% fee discount", "VIP support", "Early access"],
  },
  {
    id:            3,
    name:          "Diamond",
    requiredScore: 10000,
    color:         "#7B5EA7",
    benefits:      ["0.5% fee discount", "Governance vote", "Exclusive API access"],
  },
] as const;

export type NftTierId = 0 | 1 | 2 | 3;

export const POINTS = {
  SWAP:         100,  // 1 swap yap
  MULTI_SWAP:   150,  // 1 Multi Swap yap
  AI_AGENT:     250,  // AI Agent ile swap yap
  NFT_MINT:     100,  // NFT mint
  STREAK_7_DAY: 500,  // 7 gün üst üste işlem
} as const;
