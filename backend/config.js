// Base ağı yapılandırması
module.exports = {
  RPC_URL: process.env.BASE_RPC_URL || 'https://mainnet.base.org',

  // Token adresleri (Base mainnet)
  TOKENS: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },

  // Token ondalık basamakları
  DECIMALS: {
    WETH: 18,
    USDC: 6,
  },

  // Uniswap V3 (Base mainnet)
  UNISWAP: {
    QUOTER: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',   // QuoterV2 (resmi adres)
    POOL_FEE_LOW:    500,    // %0.05
    POOL_FEE_MEDIUM: 3000,   // %0.30
    POOL_FEE_HIGH:   10000,  // %1.00
  },

  // Aerodrome (Base mainnet)
  AERODROME: {
    ROUTER:  '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
    FACTORY: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
  },
};
