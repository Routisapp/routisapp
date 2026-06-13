// Uniswap V3 QuoterV2 ABI (sadece ihtiyaç duyulan fonksiyon)
const UNISWAP_QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn',           type: 'address' },
          { internalType: 'address', name: 'tokenOut',          type: 'address' },
          { internalType: 'uint256', name: 'amountIn',          type: 'uint256' },
          { internalType: 'uint24',  name: 'fee',               type: 'uint24'  },
          { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        internalType: 'struct IQuoterV2.QuoteExactInputSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { internalType: 'uint256', name: 'amountOut',                type: 'uint256' },
      { internalType: 'uint160', name: 'sqrtPriceX96After',        type: 'uint160' },
      { internalType: 'uint32',  name: 'initializedTicksCrossed',  type: 'uint32'  },
      { internalType: 'uint256', name: 'gasEstimate',              type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// Aerodrome Router ABI (getAmountsOut)
const AERODROME_ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      {
        components: [
          { internalType: 'address', name: 'from',   type: 'address' },
          { internalType: 'address', name: 'to',     type: 'address' },
          { internalType: 'bool',    name: 'stable', type: 'bool'    },
          { internalType: 'address', name: 'factory',type: 'address' },
        ],
        internalType: 'struct IRouter.Route[]',
        name: 'routes',
        type: 'tuple[]',
      },
    ],
    name: 'getAmountsOut',
    outputs: [
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

module.exports = { UNISWAP_QUOTER_ABI, AERODROME_ROUTER_ABI };
