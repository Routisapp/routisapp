export type DexKey = "UNISWAP_V3" | "AERODROME" | "SUSHISWAP" | "PANCAKESWAP_V3";

export interface SwapQuote {
  dex:             DexKey;
  dexName:         string;
  amountOut:       bigint;
  amountOutFormatted: string;
  priceImpact:     number;   // percentage e.g. 0.12
  estimatedGas:    bigint;
  estimatedGasUsd: number;
  routePath:       string[];
  fee:             number;   // basis points e.g. 500 = 0.05%
}

export interface SwapParams {
  tokenIn:   string;
  tokenOut:  string;
  amountIn:  bigint;
  decimalsIn: number;
  decimalsOut: number;
  fee?:      number;
}

export interface SwapExecuteParams {
  quote:       SwapQuote;
  tokenIn:     string;
  tokenOut:    string;
  amountIn:    bigint;
  slippage:    number;   // percentage e.g. 0.5
  recipient:   string;
  decimalsIn:  number;
  decimalsOut: number;
}

export type SwapStatus = "idle" | "approving" | "swapping" | "success" | "error";
