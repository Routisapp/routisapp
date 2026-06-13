export interface Token {
  address:  string;
  symbol:   string;
  name:     string;
  decimals: number;
  logoURI:  string;
  chainId:  number;
}

export const BASE_TOKENS: Token[] = [
  {
    address:  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    symbol:   "ETH",
    name:     "Ethereum",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    chainId:  8453,
  },
  {
    address:  "0x4200000000000000000000000000000000000006",
    symbol:   "WETH",
    name:     "Wrapped Ether",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/2518/small/weth.png",
    chainId:  8453,
  },
  {
    address:  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol:   "USDC",
    name:     "USD Coin",
    decimals: 6,
    logoURI:  "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
    chainId:  8453,
  },
  {
    address:  "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    symbol:   "DAI",
    name:     "Dai Stablecoin",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png",
    chainId:  8453,
  },
  {
    address:  "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
    symbol:   "USDbC",
    name:     "USD Base Coin",
    decimals: 6,
    logoURI:  "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
    chainId:  8453,
  },
  {
    address:  "0x940181a94A35A4569E4529a3CDfB74e38FD98631",
    symbol:   "AERO",
    name:     "Aerodrome Finance",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/31745/small/token.png",
    chainId:  8453,
  },
  {
    address:  "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    symbol:   "cbBTC",
    name:     "Coinbase Wrapped BTC",
    decimals: 8,
    logoURI:  "https://assets.coingecko.com/coins/images/40143/small/cbbtc.webp",
    chainId:  8453,
  },
  {
    address:  "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
    symbol:   "cbETH",
    name:     "Coinbase Wrapped Staked ETH",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/27008/small/cbeth.png",
    chainId:  8453,
  },
];

export const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
