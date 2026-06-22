// Token list for Agex swap — Base mainnet only.
// Addresses: verified from CoinGecko Base token list (tokens.coingecko.com/base/all.json)
// Logos:     from CoinGecko token list logoURI field (thumb size, with query strings)

export interface Token {
  address:  string;
  symbol:   string;
  name:     string;
  decimals: number;
  logoURI:  string;
  chainId:  number;
}

export const NATIVE_ETH   = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

export const BASE_TOKENS: Token[] = [
  // ── Native ETH ────────────────────────────────────────────────────────────
  {
    address:  NATIVE_ETH,
    symbol:   "ETH",
    name:     "Ethereum",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png?1595348880",
    chainId:  8453,
  },

  // ── Stablecoins ───────────────────────────────────────────────────────────
  {
    address:  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol:   "USDC",
    name:     "USD Coin",
    decimals: 6,
    logoURI:  "https://assets.coingecko.com/coins/images/6319/thumb/usdc.png?1696506694",
    chainId:  8453,
  },
  {
    address:  "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
    symbol:   "USDbC",
    name:     "USD Base Coin",
    decimals: 6,
    logoURI:  "https://assets.coingecko.com/coins/images/6319/thumb/usdc.png?1696506694",
    chainId:  8453,
  },
  {
    address:  "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    symbol:   "DAI",
    name:     "Dai Stablecoin",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/9956/thumb/Badge_Dai.png?1696509996",
    chainId:  8453,
  },
  {
    address:  "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    symbol:   "USDT",
    name:     "Tether USD",
    decimals: 6,
    logoURI:  "https://assets.coingecko.com/coins/images/325/thumb/Tether.png?1696501661",
    chainId:  8453,
  },
  {
    address:  "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
    symbol:   "USDe",
    name:     "Ethena USDe",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/33613/thumb/usde.png?1716355685",
    chainId:  8453,
  },
  {
    address:  "0x820C137fa70C8691f0e44Dc420a5e53c168921Dc",
    symbol:   "USDS",
    name:     "USDS Stablecoin",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/39926/thumb/usds.webp?1726666683",
    chainId:  8453,
  },
  {
    address:  "0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376",
    symbol:   "USD+",
    name:     "USD+",
    decimals: 6,
    logoURI:  "https://assets.coingecko.com/coins/images/29200/thumb/USD_plus_red.png?1696528149",
    chainId:  8453,
  },
  {
    address:  "0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93",
    symbol:   "crvUSD",
    name:     "Curve.Fi USD",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/30118/thumb/crvusd.jpg?1746670973",
    chainId:  8453,
  },

  // ── Wrapped / Bridged BTC ─────────────────────────────────────────────────
  {
    address:  "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    symbol:   "cbBTC",
    name:     "Coinbase Wrapped BTC",
    decimals: 8,
    logoURI:  "https://assets.coingecko.com/coins/images/40143/thumb/cbbtc.webp?1726136727",
    chainId:  8453,
  },
  {
    address:  "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
    symbol:   "WBTC",
    name:     "Wrapped Bitcoin",
    decimals: 8,
    logoURI:  "https://assets.coingecko.com/coins/images/7598/thumb/WBTCLOGO.png?1764496367",
    chainId:  8453,
  },
  {
    address:  "0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b",
    symbol:   "tBTC",
    name:     "tBTC v2",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/11224/thumb/0x18084fba666a33d37592fa2633fd49a74dd93a88.png?1696511155",
    chainId:  8453,
  },

  // ── ETH variants ──────────────────────────────────────────────────────────
  {
    address:  "0x4200000000000000000000000000000000000006",
    symbol:   "WETH",
    name:     "Wrapped Ether",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1696503332",
    chainId:  8453,
  },
  {
    address:  "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
    symbol:   "cbETH",
    name:     "Coinbase Wrapped Staked ETH",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/27008/thumb/cbeth.png?1709186989",
    chainId:  8453,
  },
  {
    address:  "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452",
    symbol:   "wstETH",
    name:     "Wrapped stETH",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/53103/thumb/superbride-bridged-wsteth-base.png?1735227990",
    chainId:  8453,
  },
  {
    address:  "0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A",
    symbol:   "weETH",
    name:     "Wrapped eETH",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/33033/thumb/weETH.png?1701438396",
    chainId:  8453,
  },
  {
    address:  "0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c",
    symbol:   "rETH",
    name:     "Rocket Pool ETH",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/20764/thumb/reth.png?1696520159",
    chainId:  8453,
  },

  // ── Base ecosystem ────────────────────────────────────────────────────────
  {
    address:  "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    symbol:   "AERO",
    name:     "Aerodrome Finance",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/31745/thumb/token.png?1696530564",
    chainId:  8453,
  },
  {
    address:  "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b",
    symbol:   "VIRTUAL",
    name:     "Virtual Protocol",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/34057/thumb/LOGOMARK.png?1708356054",
    chainId:  8453,
  },
  {
    address:  "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
    symbol:   "EURC",
    name:     "EURC",
    decimals: 6,
    logoURI:  "https://assets.coingecko.com/coins/images/26045/thumb/EURC.png?1769615705",
    chainId:  8453,
  },

  // ── DeFi / Infrastructure ─────────────────────────────────────────────────
  {
    address:  "0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196",
    symbol:   "LINK",
    name:     "Chainlink",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/877/thumb/Chainlink_Logo_500.png?1760023405",
    chainId:  8453,
  },
  {
    address:  "0xA99F6e6785Da0F5d6fB42495Fe424BCE029Eeb3E",
    symbol:   "PENDLE",
    name:     "Pendle",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/15069/thumb/Pendle_Logo_Normal-03.png?1696514728",
    chainId:  8453,
  },
  {
    address:  "0x22e6966B799c4D5B13BE962E1D117b56327FDa66",
    symbol:   "SNX",
    name:     "Synthetix",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/3406/thumb/SNX.png?1696504103",
    chainId:  8453,
  },
  {
    address:  "0xE3B53AF74a4BF62Ae5511055290838050bf764Df",
    symbol:   "STG",
    name:     "Stargate Finance",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/24413/thumb/STG_LOGO.png?1696523595",
    chainId:  8453,
  },
  {
    address:  "0xA88594D404727625A9437C3f886C7643872296AE",
    symbol:   "WELL",
    name:     "Moonwell",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/26133/thumb/WELL.png?1696525221",
    chainId:  8453,
  },
  {
    address:  "0x1C7a460413dD4e964f96D8dFC56E7223cE88CD85",
    symbol:   "SEAM",
    name:     "Seamless Protocol",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/33480/thumb/Seamless_Logo_Black_Transparent.png?1702019657",
    chainId:  8453,
  },
  {
    address:  "0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842",
    symbol:   "MORPHO",
    name:     "Morpho",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/29837/thumb/Morpho-token-icon.png?1726771230",
    chainId:  8453,
  },
  {
    address:  "0x58538e6A46E07434d7E7375Bc268D3cb839C0133",
    symbol:   "ENA",
    name:     "ENA",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/36530/thumb/ethena.png?1711701436",
    chainId:  8453,
  },
  {
    address:  "0x9EaF8C1E34F05a589EDa6BAfdF391Cf6Ad3CB239",
    symbol:   "YFI",
    name:     "yearn.finance",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/11849/thumb/yearn.jpg?1696511720",
    chainId:  8453,
  },
  {
    address:  "0x1111111111166b7FE7bd91427724B487980aFc69",
    symbol:   "ZORA",
    name:     "Zora",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/54693/thumb/zora.jpg?1741094751",
    chainId:  8453,
  },

  // ── Base memecoins ────────────────────────────────────────────────────────
  {
    address:  "0x532f27101965dd16442E59d40670FaF5eBB142E4",
    symbol:   "BRETT",
    name:     "Brett",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/35529/thumb/1000050750.png?1709031995",
    chainId:  8453,
  },
  {
    address:  "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4",
    symbol:   "TOSHI",
    name:     "Toshi",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/31126/thumb/Toshi_Logo_-_Circular.png?1721677476",
    chainId:  8453,
  },
  {
    address:  "0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe",
    symbol:   "HIGHER",
    name:     "Higher",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/36084/thumb/200x200logo.png?1710427814",
    chainId:  8453,
  },
  {
    address:  "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
    symbol:   "DEGEN",
    name:     "Degen",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/34515/thumb/android-chrome-512x512.png?1705488476",
    chainId:  8453,
  },
  {
    address:  "0x6921B130D297cc43754afba22e5EAc0FBf8Db75b",
    symbol:   "DOGINME",
    name:     "doginme",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/35123/thumb/doginme-logo1-transparent200.png?1710856784",
    chainId:  8453,
  },
  {
    address:  "0x2Da56AcB9Ea78330f947bD57C54119Debda7AF71",
    symbol:   "MOG",
    name:     "Mog Coin",
    decimals: 18,
    logoURI:  "https://assets.coingecko.com/coins/images/31059/thumb/MOG_LOGO_200x200.png?1696529893",
    chainId:  8453,
  },
];
