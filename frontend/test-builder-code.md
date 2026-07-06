# Builder Code Test Adımları

## Web Sitesi Attribution Testi

### 1. Geliştirme Ortamında Test

```bash
# Development server'ı başlat
cd frontend
npm run dev
```

### 2. Tarayıcıda Aç

```
http://localhost:3000
```

### 3. Test Transaction Yap

1. Wallet'ı bağla (MetaMask, Rabby, vs.)
2. Küçük bir swap yap (örn: 0.001 ETH → USDC)
3. Transaction'ı onayla
4. Transaction hash'i kopyala

### 4. Builder Code Doğrulama

#### A. Basescan ile:
1. https://basescan.org/tx/[YOUR_TX_HASH] aç
2. "Input Data" sekmesine git
3. Calldata'nın sonunda `8021` tekrarı ve `bc_92yf9czs` olmalı

#### B. Builder Code Validator ile:
1. https://builder-code-checker.vercel.app/ aç
2. Transaction hash'i yapıştır
3. "Check Attribution" tıkla
4. Sonuç: ✅ `bc_92yf9czs` görünmeli

### 5. Base Dashboard Kontrolü

```
https://base.dev/
→ Routis App dashboard
→ "Other" tab
→ 5-10 dakika bekle (indexing)
→ Transaction count +1 olmalı
```

## Beklenen Sonuçlar

### ✅ Başarılı Test:
- Basescan'de builder code görünüyor
- Validator tool doğruluyor
- 10 dakika sonra Base dashboard "Other"da +1

### ❌ Başarısız Test:
- Calldata'da builder code yok
- Validator tool hata veriyor
- Dashboard'da değişiklik yok

## Troubleshooting

### Eğer builder code eklenmiyorsa:

1. Console'u kontrol et:
```javascript
console.log('wagmiConfig:', wagmiConfig);
console.log('dataSuffix:', wagmiConfig.dataSuffix);
```

2. Transaction object'i kontrol et:
```javascript
// useSwapExecute.ts içinde
console.log('Transaction params:', txParams);
```

3. Viem version check:
```bash
npm list viem
# >= 2.45.0 olmalı
```

## Production Test

### Production'da (routis.app) test etmek için:

1. https://www.routis.app aç
2. Wallet bağla
3. Real swap yap
4. Yukarıdaki doğrulama adımlarını tekrarla

**Önemli:** Production'da test yaparken real funds kullanılır!
