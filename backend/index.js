const express = require('express');
const cors    = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

// Windows SSL sertifika sorununu çöz
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const config           = require('./config');
const { getUniswapQuote }   = require('./uniswap');
const { getAerodromeQuote } = require('./aerodrome');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Base ağı provider (tek instance, tüm route'lar paylaşır)
const provider = new ethers.JsonRpcProvider(config.RPC_URL);

// ─────────────────────────────────────────────
// GET /health  →  API sağlık kontrolü
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Base Aggregator API çalışıyor' });
});

// ─────────────────────────────────────────────
// GET /api/quote
//
// Query parametreleri:
//   amountIn  → Kaç WETH (örnek: "1" veya "0.5")
//
// Sabit çift: WETH → USDC (Base mainnet)
//
// Örnek istek:
//   http://localhost:3001/api/quote?amountIn=1
// ─────────────────────────────────────────────
app.get('/api/quote', async (req, res) => {
  try {
    const { amountIn } = req.query;

    // Validasyon
    if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
      return res.status(400).json({
        error: 'Geçersiz amountIn. Örnek: ?amountIn=1',
      });
    }

    // WETH 18 ondalık → wei
    const amountInWei = ethers.parseUnits(amountIn, config.DECIMALS.WETH).toString();

    // Uniswap ve Aerodrome fiyatlarını paralel çek
    const [uniswapQuote, aerodromeQuote] = await Promise.all([
      getUniswapQuote(provider, amountInWei),
      getAerodromeQuote(provider, amountInWei),
    ]);

    // En iyi rotayı belirle
    let bestDex   = null;
    let bestPrice = 0;

    if (uniswapQuote && uniswapQuote.amountOutFormatted > bestPrice) {
      bestPrice = uniswapQuote.amountOutFormatted;
      bestDex   = 'uniswap';
    }
    if (aerodromeQuote && aerodromeQuote.amountOutFormatted > bestPrice) {
      bestPrice = aerodromeQuote.amountOutFormatted;
      bestDex   = 'aerodrome';
    }

    // Fiyat farkı yüzdesi
    let savingsPercent = null;
    if (uniswapQuote && aerodromeQuote) {
      const diff = Math.abs(
        uniswapQuote.amountOutFormatted - aerodromeQuote.amountOutFormatted
      );
      const lower = Math.min(
        uniswapQuote.amountOutFormatted,
        aerodromeQuote.amountOutFormatted
      );
      savingsPercent = lower > 0 ? ((diff / lower) * 100).toFixed(4) : null;
    }

    res.json({
      tokenIn:  { symbol: 'WETH', address: config.TOKENS.WETH, decimals: 18 },
      tokenOut: { symbol: 'USDC', address: config.TOKENS.USDC, decimals: 6  },
      amountIn: {
        raw:       amountInWei,
        formatted: amountIn,
      },
      quotes: {
        uniswap:   uniswapQuote
          ? {
              amountOut:          uniswapQuote.amountOut,
              amountOutFormatted: uniswapQuote.amountOutFormatted.toFixed(6),
              fee:                uniswapQuote.fee,
              feePercent:         uniswapQuote.feePercent,
            }
          : null,
        aerodrome: aerodromeQuote
          ? {
              amountOut:          aerodromeQuote.amountOut,
              amountOutFormatted: aerodromeQuote.amountOutFormatted.toFixed(6),
              poolType:           aerodromeQuote.poolType,
            }
          : null,
      },
      bestRoute: bestDex
        ? {
            dex:                bestDex,
            amountOutFormatted: bestPrice.toFixed(6),
            savingsPercent:     savingsPercent,
          }
        : null,
    });

  } catch (err) {
    console.error('Quote hatası:', err);
    res.status(500).json({ error: 'Fiyat alınamadı', detail: err.message });
  }
});

// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Base Aggregator API → http://localhost:${PORT}`);
  console.log(`   /health       → Sağlık kontrolü`);
  console.log(`   /api/quote?amountIn=1  → 1 WETH karşılığı USDC fiyatı`);
});
