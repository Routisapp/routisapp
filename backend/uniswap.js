const { ethers } = require('ethers');
const config = require('./config');
const { UNISWAP_QUOTER_ABI } = require('./abis');

/**
 * Uniswap V3'ten WETH → USDC için fiyat teklifi alır.
 * Birden fazla fee kademesini dener, en iyi sonucu döndürür.
 *
 * @param {ethers.Provider} provider
 * @param {string} amountInWei  - WETH miktarı (wei cinsinden, string)
 * @returns {object|null}
 */
async function getUniswapQuote(provider, amountInWei) {
  const quoter = new ethers.Contract(
    config.UNISWAP.QUOTER,
    UNISWAP_QUOTER_ABI,
    provider
  );

  const fees = [
    config.UNISWAP.POOL_FEE_LOW,    // 500
    config.UNISWAP.POOL_FEE_MEDIUM, // 3000
    config.UNISWAP.POOL_FEE_HIGH,   // 10000
  ];

  let bestResult = null;

  for (const fee of fees) {
    try {
      const result = await quoter.quoteExactInputSingle.staticCall({
        tokenIn:           config.TOKENS.WETH,
        tokenOut:          config.TOKENS.USDC,
        amountIn:          amountInWei,
        fee:               fee,
        sqrtPriceLimitX96: 0n,
      });

      const amountOut = result[0]; // uint256

      // USDC 6 ondalık
      const amountOutFormatted = Number(ethers.formatUnits(amountOut, config.DECIMALS.USDC));

      if (!bestResult || amountOutFormatted > bestResult.amountOutFormatted) {
        bestResult = {
          amountOut:          amountOut.toString(),
          amountOutFormatted: amountOutFormatted,
          fee:                fee,
          feePercent:         (fee / 10000).toFixed(2) + '%',
        };
      }
    } catch (err) {
      // Bu fee kademesinde havuz yoksa atla
      console.log(`Uniswap fee=${fee} havuzu bulunamadı: ${err.message}`);
    }
  }

  return bestResult;
}

module.exports = { getUniswapQuote };
