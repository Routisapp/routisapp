const { ethers } = require('ethers');
const config = require('./config');
const { AERODROME_ROUTER_ABI } = require('./abis');

/**
 * Aerodrome'dan WETH → USDC için fiyat teklifi alır.
 * Hem volatile hem stable havuzu dener, en iyisini döndürür.
 *
 * @param {ethers.Provider} provider
 * @param {string} amountInWei  - WETH miktarı (wei cinsinden, string)
 * @returns {object|null}
 */
async function getAerodromeQuote(provider, amountInWei) {
  const router = new ethers.Contract(
    config.AERODROME.ROUTER,
    AERODROME_ROUTER_ABI,
    provider
  );

  const poolTypes = [
    { stable: false, label: 'volatile' },
    { stable: true,  label: 'stable'   },
  ];

  let bestResult = null;

  for (const pool of poolTypes) {
    try {
      const routes = [
        {
          from:    config.TOKENS.WETH,
          to:      config.TOKENS.USDC,
          stable:  pool.stable,
          factory: config.AERODROME.FACTORY,
        },
      ];

      const amounts = await router.getAmountsOut(amountInWei, routes);

      // amounts[0] = amountIn, amounts[1] = amountOut
      const amountOut = amounts[amounts.length - 1];
      const amountOutFormatted = Number(ethers.formatUnits(amountOut, config.DECIMALS.USDC));

      if (amountOutFormatted > 0 && (!bestResult || amountOutFormatted > bestResult.amountOutFormatted)) {
        bestResult = {
          amountOut:          amountOut.toString(),
          amountOutFormatted: amountOutFormatted,
          poolType:           pool.label,
        };
      }
    } catch (err) {
      console.log(`Aerodrome ${pool.label} havuzu bulunamadı: ${err.message}`);
    }
  }

  return bestResult;
}

module.exports = { getAerodromeQuote };
