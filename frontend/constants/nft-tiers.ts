export const NFT_TIERS = [
  {
    id:            0,
    name:          "Bronze",
    requiredScore: 500,
    color:         "#CD7F32",
    benefits:      ["0.1% fee discount", "Exclusive profile badge"],
  },
  {
    id:            1,
    name:          "Silver",
    requiredScore: 1000,
    color:         "#C0C0C0",
    benefits:      ["0.2% fee discount", "Hidden tokens"],
  },
  {
    id:            2,
    name:          "Gold",
    requiredScore: 1500,
    color:         "#FFD700",
    benefits:      ["0.3% fee discount", "VIP support", "Early access"],
  },
  {
    id:            3,
    name:          "Diamond",
    requiredScore: 2000,
    color:         "#7B5EA7",
    benefits:      ["0.5% fee discount", "Governance vote", "Exclusive API access"],
  },
] as const;

export type NftTierId = 0 | 1 | 2 | 3;

export const POINTS = {
  SWAP:         50,
  NFT_MINT:     100,
  STREAK_7_DAY: 200,
  VOLUME_1000:  150,
} as const;

export const TRADER_NFT_ADDRESS = "0x4Cc46F9C45D41cE7446cA6D069a93beb99f5ba2D" as `0x${string}`;
