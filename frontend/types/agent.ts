export interface SwapPreview {
  fromToken:   string;
  toToken:     string;
  amountIn:    string;
  amountOut:   string;
  bestDex:     string;
  allRoutes:   Array<{ dex: string; amountOut: string; fee: string }>;
  fee:         string;
  priceImpact: string;
  slippage:    string;
}

export interface AgentMessage {
  id:           string;
  role:         "user" | "assistant";
  content:      string;
  swapPreview?: SwapPreview;
  swapStatus?:  "confirmed" | "rejected" | "cancelled";
}
