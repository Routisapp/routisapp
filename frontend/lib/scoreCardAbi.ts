export const SCORE_CARD_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "totalScore", type: "uint256" },
      { name: "txScore",    type: "uint256" },
      { name: "ageScore",   type: "uint256" },
      { name: "volScore",   type: "uint256" },
      { name: "conScore",   type: "uint256" },
      { name: "feeScore",   type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs:  [],
    outputs: [],
  },
] as const;

// Deploy sonrası bu adresi güncelle
export const SCORE_CARD_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;
