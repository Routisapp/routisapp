# Routis AI Agent — Implementation Prompt

## Proje Bağlamı

Bu proje **Routis** adlı bir DEX aggregator'dır. Base mainnet'te çalışır.
Frontend Next.js (app router) ile yazılmıştır. Wagmi v2 + viem + RainbowKit ile cüzdan bağlantısı mevcuttur.

### Mevcut Swap Altyapısı (Dokunma)
- `lib/onchainQuote.ts` → `getOnchainQuotes()` fonksiyonu: Uniswap V3, PancakeSwap V3, Aerodrome, SushiSwap'tan quote çeker
- `hooks/useSwapExecute.ts` → `execute()` fonksiyonu: swap işlemini blockchain'e gönderir
- `hooks/useTokenApproval.ts` → ERC-20 approve işlemi
- `constants/tokens.ts` → `BASE_TOKENS` listesi (ETH, USDC, USDT, cbBTC, DAI, WETH)
- `constants/dex-registry.ts` → `SUPPORTED_DEXES`, `DEX_BY_ID` — DEX adresleri ve bilgileri

### Mevcut Token Adresleri (Base Mainnet)
```
ETH/WETH: 0x4200000000000000000000000000000000000006
USDC:     0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
USDT:     0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2
cbBTC:    0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf
DAI:      0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb
```

### Mevcut DEX Router Adresleri (Base Mainnet)
```
Uniswap V3:    0x2626664c2603336E57B271c5C0b26F421741e481
PancakeSwap V3:0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86
Aerodrome:     0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43
SushiSwap:     0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891
```

---

## Görev

Mevcut Routis projesine **AI Agent** özelliği ekle.
Kullanıcı doğal dilde swap talebi yazar (örn: "10 USDC to ETH"),
AI Agent en iyi rotayı bulur, Swap Preview card'ı chat içinde gösterir (inline, modal değil),
kullanıcı onayladığında mevcut `useSwapExecute` hook'u tetiklenir.

**x402 ödeme notu:** x402 entegrasyonu şu an opsiyonel/devre dışı bırakılabilir.
`ANTHROPIC_API_KEY` yoksa veya boşsa endpoint graceful hata dönsün.
x402 entegrasyonu için gerekli paketler: `x402-next`, `x402-fetch`

---

## Referans UI

### Renk Paleti (Agent sayfasına özel — diğer sayfalara karışmasın)
```
Arka plan:        #0d0d12
Kart/kutu:        #13131f
Border:           rgba(255,255,255,0.08)
Mor vurgu:        #7c3aed
Yeşil (alınan):   #4ade80
Gri metin:        rgba(255,255,255,0.45)
Kullanıcı balonu: #5b21b6
Agent balonu:     #13131f
```

### Boş Durum (Empty State)
```
Ortada robot SVG ikonu (basit, outline)
Başlık: "Routis AI Agent" — bold, beyaz
Alt başlık: "Ask me to find the best swap route on Base network." — gri
İki örnek pill buton:
  [ Swap 5 USDC to ETH ]   [ Swap 0.005 ETH to USDC ]
```

### Aktif Sohbet
```
Kullanıcı: sağda, #5b21b6 arka planlı balon
Agent:     solda, #13131f arka planlı balon
           → Swap özeti metin
           → Hemen altında SwapPreviewCard (inline)
```

### SwapPreviewCard (Inline, Chat İçinde)
```
┌─────────────────────────────────────────────────────┐
│  Swap Preview                                       │
├──────────────────────┬──────────────────────────────┤
│   You pay            │   You receive                │
│   5 USDC             │   ≈0.002905 ETH  (#4ade80)  │
├──────────────────────┴──────────────────────────────┤
│ Best route                           Uniswap V3     │
│ Fee                                       0.05%     │
│ Price impact                              0.05%     │
│ Slippage                                   0.5%     │
│ Platform fee                           0.1 USDC     │
└─────────────────────────────────────────────────────┘
[ Cancel ]                    [ Confirm Swap → ]  (#7c3aed)
```
> Price impact %3+ ise kırmızı ⚠️ uyarı göster

### Input Bar (Sabit Alt)
```
┌──────────────────────────────────────┬────────────┐
│  Ask about swaps on Base...          │  ▶ Send   │
└──────────────────────────────────────┴────────────┘
ⓘ A fee of 0.1 USDC will be charged for each approved transaction.
```

---

## Dosya Yapısı

```
frontend/
├── app/
│   ├── api/
│   │   └── agent/
│   │       └── route.ts          ← YENİ
│   └── agent/
│       └── page.tsx              ← YENİ
├── components/
│   └── agent/
│       ├── AgentChat.tsx         ← YENİ
│       ├── SwapPreviewCard.tsx   ← YENİ
│       └── MessageBubble.tsx     ← YENİ
├── lib/
│   └── x402.ts                   ← YENİ: x402 middleware yardımcısı (opsiyonel)
└── types/
    └── agent.ts                  ← YENİ: SwapPreview, AgentMessage tipleri
```

---

## Backend API (`app/api/agent/route.ts`)

### POST /api/agent
```typescript
// Request body:
{
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  userAddress?: string;
}

// Response:
{
  content: string;        // Claude'un metin yanıtı
  swapPreview?: SwapPreview; // Parse edilmişse
}
```

### Genel Akış
```
1. ANTHROPIC_API_KEY kontrolü — yoksa 503 döndür
2. Son 10 mesajı al (context tasarrufu)
3. Claude API çağrısı (Tool Use etkin)
4. Claude get_swap_quote tool'u isterse:
   → getOnchainQuotes() çağır (mevcut lib kullan)
   → Sonucu Claude'a geri ver
   → Tool loop: stop_reason === "tool_use" olduğu sürece devam et, max 3 iterasyon
5. Claude'un yanıtını parse et:
   → SWAP_PREVIEW_START...END bloğunu bul, JSON parse et (try/catch)
   → Başarısızsa swapPreview: undefined, sadece text döndür
6. Response döndür
```

### Tool Tanımları
```typescript
const tools = [
  {
    name: "get_swap_quote",
    description: `Routis aggregator'dan en iyi swap rotasını çeker.
    Uniswap V3, PancakeSwap V3, SushiSwap ve Aerodrome karşılaştırılır.
    En yüksek amountOut değerini veren rota seçilir.`,
    input_schema: {
      type: "object",
      properties: {
        fromToken: { type: "string", description: "Kaynak token sembolü (ETH, USDC, USDT, cbBTC, DAI)" },
        toToken:   { type: "string", description: "Hedef token sembolü" },
        amountIn:  { type: "string", description: "Miktar, sadece sayı (örn: '10', '0.5')" }
      },
      required: ["fromToken", "toToken", "amountIn"]
    }
  },
  {
    name: "get_token_price",
    description: "Token'ın anlık USD fiyatını döner. Kullanıcı 'ETH kaç dolar?' gibi sorular sorarsa çağır.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Token sembolü (ETH, USDC, USDT, cbBTC, DAI)" }
      },
      required: ["symbol"]
    }
  }
];
```

### get_token_price Tool Execution
```typescript
// Alchemy Price API kullan (ALCHEMY_API_KEY mevcut projede zaten var)
async function executeGetTokenPrice(symbol: string): Promise<{ price: string; symbol: string }> {
  try {
    const res = await fetch(
      `https://api.g.alchemy.com/prices/v1/${process.env.ALCHEMY_API_KEY}/tokens/by-symbol?symbols=${symbol.toUpperCase()}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { price: "unavailable", symbol };
    const json = await res.json();
    const price = json?.data?.[0]?.prices?.[0]?.value ?? "unavailable";
    return { price: price !== "unavailable" ? `$${parseFloat(price).toFixed(2)}` : "unavailable", symbol };
  } catch {
    return { price: "unavailable", symbol };
  }
}
```

### Tool Execution — getOnchainQuotes Entegrasyonu
```typescript
// Mevcut onchainQuote.ts'deki getOnchainQuotes() fonksiyonunu kullan
// API route server-side olduğu için viemClient kullan (lib/viemClient.ts mevcut)
import { publicClient } from "@/lib/viemClient";
import { getOnchainQuotes } from "@/lib/onchainQuote";
import { BASE_TOKENS } from "@/constants/tokens";

async function executeGetSwapQuote(fromToken: string, toToken: string, amountIn: string) {
  const tokenIn  = BASE_TOKENS.find(t => t.symbol.toUpperCase() === fromToken.toUpperCase());
  const tokenOut = BASE_TOKENS.find(t => t.symbol.toUpperCase() === toToken.toUpperCase());
  if (!tokenIn || !tokenOut) throw new Error(`Desteklenmeyen token: ${fromToken} veya ${toToken}`);

  const { parseUnits } = await import("viem");
  const amountInWei = parseUnits(amountIn, tokenIn.decimals);

  const quotes = await getOnchainQuotes(publicClient, {
    tokenIn:    tokenIn.address  as `0x${string}`,
    tokenOut:   tokenOut.address as `0x${string}`,
    amountIn:   amountInWei,
    decimalsIn:  tokenIn.decimals,
    decimalsOut: tokenOut.decimals,
  });

  if (!quotes.length) throw new Error("Bu çift için rota bulunamadı.");

  const best = quotes[0];
  return {
    bestDex:    best.dexName,
    amountOut:  best.amountOutFormatted,
    priceImpact: best.priceImpact.toFixed(2) + "%",
    fee:        best.fee ? (best.fee / 10000).toFixed(2) + "%" : "0.3%",
    allRoutes:  quotes.map(q => ({
      dex:       q.dexName,
      amountOut: q.amountOutFormatted,
      fee:       q.fee ? (q.fee / 10000).toFixed(2) + "%" : "0.3%",
    })),
  };
}
```

### Claude System Prompt
```
Sen Routis AI Agent'sın. Base ağında çalışan bir DEX aggregator'ın akıllı asistanısın.
Routis; Uniswap V3, PancakeSwap V3, SushiSwap ve Aerodrome'dan eş zamanlı fiyat alır
ve kullanıcıya en iyi swap rotasını sunar.

## Temel Kurallar
- SADECE Base mainnet'teki token swap'larına yardım et
- Swap talebi geldiğinde her zaman önce get_swap_quote tool'unu çağır
- Kullanıcı onayı olmadan hiçbir işlem gerçekleştirme
- Price impact %3'ü geçiyorsa kırmızı ⚠️ uyarı ver
- Bilinmeyen veya şüpheli token'ları reddet
- Kullanıcı Türkçe yazıyorsa Türkçe, İngilizce yazıyorsa İngilizce yanıt ver
- Kısa ve net yanıtlar ver (1-2 cümle özet)

## Desteklenen Tokenlar (Base Mainnet)
ETH, WETH, USDC, USDT, cbBTC, DAI

## Swap Talebi Akışı
1. get_swap_quote tool'unu çağır
2. Kısa özet yaz
3. Aşağıdaki SWAP_PREVIEW bloğunu ekle (ZORUNLU)

## SWAP_PREVIEW Format
SWAP_PREVIEW_START
{
  "fromToken": "SEMBOL",
  "toToken": "SEMBOL",
  "amountIn": "MIKTAR",
  "amountOut": "MIKTAR",
  "bestDex": "DEX ADI",
  "allRoutes": [
    {"dex": "Uniswap V3", "amountOut": "X", "fee": "0.05%"},
    {"dex": "PancakeSwap V3", "amountOut": "X", "fee": "0.25%"},
    {"dex": "Aerodrome", "amountOut": "X", "fee": "0.3%"},
    {"dex": "SushiSwap", "amountOut": "X", "fee": "0.3%"}
  ],
  "fee": "0.05%",
  "priceImpact": "0.05%",
  "slippage": "0.5%"
}
SWAP_PREVIEW_END

## Yasak
- Base dışı ağlar
- Finansal tavsiye veya fiyat tahmini
- Swap dışı konular
```

---

## Frontend Bileşenleri

### Types (`types/agent.ts`)
```typescript
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
  role:         "user" | "assistant";
  content:      string;
  swapPreview?: SwapPreview;
  id:           string; // crypto.randomUUID()
}
```

### AgentChat.tsx
```typescript
// State
const [messages, setMessages] = useState<AgentMessage[]>([])
const [input, setInput]       = useState("")
const [loading, setLoading]   = useState(false)

// Önemli: x402-fetch YOK — normal fetch kullan
// x402 opsiyonel, şimdilik devre dışı

// sendMessage:
// 1. User mesajını ekle
// 2. POST /api/agent — { messages, userAddress }
// 3. Yanıtı parse et → swapPreview varsa mesaja ekle
// 4. Loading sırasında "..." animasyonu göster

// onConfirmSwap(preview):
// → BASE_TOKENS'tan tokenIn/tokenOut bul
// → useSwapExecute hook'undan execute() çağır
// → Cüzdan bağlı değilse "Connect Wallet" uyarısı göster

// Scroll: useEffect ile messages değişince alta scroll
```

### SwapPreviewCard.tsx
```typescript
interface Props {
  preview:   SwapPreview;
  onConfirm: () => void;
  onCancel:  () => void;
  isPending: boolean; // swap işlemi devam ediyor mu
}

// UI:
// - "You pay" / "You receive" yan yana
// - bestDex, fee, priceImpact, slippage satırları
// - Platform fee: 0.1 USDC (gri, küçük)
// - priceImpact > 3 ise kırmızı ⚠️ uyarı
// - Cancel + Confirm Swap butonları
```

### MessageBubble.tsx
```typescript
// user   → sağda, #5b21b6 arka plan
// assistant → solda, #13131f arka plan
// swapPreview varsa altında SwapPreviewCard render et
```

---

## Navigasyon Güncellemesi

`components/layout/Header.tsx` ve `components/layout/MobileNav.tsx` dosyalarına Agent sekmesi ekle:

```typescript
// Header.tsx NAV array'ine ekle:
{ href: "/agent", label: "Agent", Icon: IconAgent }

// IconAgent — basit robot/AI SVG ikonu, #7c3aed rengi (mor)
// Aktif durumda: border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#7c3aed]
// (Diğer nav itemlar #C9693A kullanır, Agent #7c3aed kullanır — ayırt etmek için)
```

---

## Environment Variables

`.env.local`'e eklenecekler:
```bash
# Anthropic — Agent için zorunlu
ANTHROPIC_API_KEY=sk-ant-...   # Boşsa /api/agent 503 döner

# x402 — Şimdilik opsiyonel, boş bırakılabilir
ROUTIS_TREASURY_ADDRESS=       # Protokol ücreti cüzdanı
X402_FACILITATOR_URL=https://www.x402.org/facilitator

# NOT: Aşağıdaki değişkenler zaten .env.local'de mevcut, tekrar ekleme
# ALCHEMY_API_KEY — get_token_price tool'unda kullanılır (zaten var)
# NEXT_PUBLIC_BASE_RPC_URL — zaten var
```

---

## npm Paketleri

```bash
npm install @anthropic-ai/sdk
# x402 şimdilik opsiyonel:
# npm install x402-next x402-fetch
```

---

## Önemli Notlar

1. **Mevcut swap altyapısına dokunma** — `lib/onchainQuote.ts`, `hooks/useSwapExecute.ts`,
   `hooks/useTokenApproval.ts` dosyaları değişmez. Agent sadece bunları çağırır.

2. **publicClient** — API route server-side çalışır. `lib/viemClient.ts` dosyasındaki
   `publicClient`'ı kullan (zaten mevcut).

3. **Ücret sırası** — 0.1 USDC ücreti swap ONAYLANDIĞINDA alınır, sorgu sırasında değil.
   x402 şimdilik devre dışı — `onConfirm` direkt swap'ı tetikler.

4. **SWAP_PREVIEW parse** — `SWAP_PREVIEW_START` ve `SWAP_PREVIEW_END` arasındaki JSON'u
   try/catch ile parse et. Başarısız olursa `swapPreview: undefined`, sadece metin göster.

5. **Tool loop** — `stop_reason === "tool_use"` olduğu sürece tool çalıştır ve Claude'a
   geri gönder. Maksimum 3 iterasyon, sonra kes.

6. **Cüzdan kontrolü** — Agent sayfasında cüzdan bağlı değilse "Connect Wallet" butonu
   göster. Swap onayı için cüzdan zorunlu; quote sorgusu için gerekmez.

7. **CSS izolasyonu** — Agent sayfasının koyu renk paleti (#0d0d12 vb.) global CSS'i
   etkilememelidir. `app/agent/page.tsx`'de wrapper div'e `style={{ background: "#0d0d12" }}`
   ver veya Tailwind `bg-[#0d0d12]` kullan.

8. **Mevcut tema** — Projenin geri kalanı açık/bej tema kullanır (`--bg-primary`, `--bg-card`
   CSS değişkenleri). Agent sayfası kendi inline stillerini kullanmalı, bu değişkenlere
   dayanmamalı.

9. **Mesaj history** — Her API çağrısında son 10 mesajı gönder.

10. **Loading animasyonu** — API yanıtı beklenirken agent tarafına `•••` veya `...`
    animasyonlu bir bubble ekle.

## lib/x402.ts (Opsiyonel — Şimdilik Stub)

```typescript
// x402 entegrasyonu aktif edildiğinde doldurulacak
// Şu an sadece tip tanımları ve placeholder

export const X402_CONFIG = {
  price:         "0.10",
  asset:         "USDC",
  assetAddress:  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  network:       "base",
  facilitatorUrl: process.env.X402_FACILITATOR_URL ?? "https://www.x402.org/facilitator",
  payTo:          process.env.ROUTIS_TREASURY_ADDRESS ?? "",
};

// x402 aktif mi? ROUTIS_TREASURY_ADDRESS set edilmişse aktif
export const isX402Enabled = (): boolean => {
  return !!process.env.ROUTIS_TREASURY_ADDRESS;
};
```

> **Not:** x402 aktif olduğunda:
> - `npm install x402-next x402-fetch` paketi kurulur
> - API route'da `withPaymentRequired` wrapper kullanılır
> - Frontend'de `wrapFetchWithPayment(fetch, walletClient)` ile sarmalanır
> - Ödeme swap onayında tetiklenir, sorgu sırasında değil

---
 ve Decimal Bilgileri

```typescript
// BASE_TOKENS'tan alınır (constants/tokens.ts)
ETH:   { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18 }
WETH:  { address: "0x4200000000000000000000000000000000000006", decimals: 18 }
USDC:  { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6  }
USDT:  { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", decimals: 6  }
cbBTC: { address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8  }
DAI:   { address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18 }
```
