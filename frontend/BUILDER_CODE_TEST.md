# 🧪 Builder Code Web Test

## Test 1: Development Environment

### Adım 1: Server Başlat
```bash
cd frontend
npm run dev
```

### Adım 2: Tarayıcıda Aç
```
http://localhost:3000
```

### Adım 3: Console Log Ekle

`lib/wagmi-config.ts` dosyasına ekle:

```typescript
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["bc_92yf9czs"],
});

// 🧪 TEST LOG
if (typeof window !== 'undefined') {
  console.log('🔧 Builder Code Config:');
  console.log('  Code:', 'bc_92yf9czs');
  console.log('  Suffix:', DATA_SUFFIX);
}

export const wagmiConfig = createConfig({
  // ...
  dataSuffix: DATA_SUFFIX,
  // ...
});
```

### Adım 4: Test Transaction

1. ✅ Wallet bağla (MetaMask)
2. ✅ 0.001 ETH → USDC swap yap
3. ✅ Transaction hash'i kopyala
4. ✅ Console'da builder code log'unu gör

### Adım 5: Basescan Doğrulama

```
https://basescan.org/tx/[YOUR_TX_HASH]
```

1. "Click to see more" tıkla
2. "Input Data" sekmesine git
3. Calldata'nın **sonunda** şunları ara:
   - `8021` tekrarı (ERC-8021 marker)
   - `bc_92yf9czs` (builder code)

**Beklenen Format:**
```
...8021bc_92yf9czs8021...
```

### Adım 6: Builder Code Validator

```
https://builder-code-checker.vercel.app/
```

1. Transaction Type: "Transaction" seç
2. TX hash yapıştır
3. "Check Attribution" tıkla

**Beklenen Sonuç:**
```
✅ Builder Code Found: bc_92yf9czs
✅ ERC-8021 Format: Valid
```

---

## Test 2: Production Environment

### ⚠️ Dikkat: Real funds kullanılır!

### Adım 1: Production'da Aç
```
https://www.routis.app
```

### Adım 2: Wallet Bağla
- MetaMask veya tercih ettiğiniz wallet

### Adım 3: Minimal Swap
- 0.0001 ETH → USDC (çok küçük tutar)

### Adım 4: TX Hash Doğrula
- Basescan kontrolü (yukarıdaki gibi)
- Validator tool kontrolü

### Adım 5: Base Dashboard Bekle

```
https://base.dev/
→ Routis App
→ "Other" tab seç
→ 5-10 dakika bekle (indexing delay)
```

**Beklenen:**
```
Before:
Other: 0 users, 0 transactions

After (10 dakika sonra):
Other: 1 user, 1 transaction ✅
```

---

## ✅ Başarı Kriterleri

### Development Test:
- [ ] Console'da builder code log görünüyor
- [ ] Basescan'de calldata sonunda `8021bc_92yf9czs8021`
- [ ] Validator tool ✅ veriyor

### Production Test:
- [ ] Basescan doğrulaması başarılı
- [ ] Validator tool başarılı
- [ ] 10 dakika sonra Base dashboard "Other"da +1

---

## ❌ Troubleshooting

### Eğer builder code YOKSA:

#### 1. Version Check
```bash
npm list viem
# Sonuç: >= 2.45.0 olmalı
```

#### 2. Config Check
```typescript
// wagmi-config.ts'de şunları kontrol et:
import { Attribution } from "ox/erc8021";  // ✅ Import var mı?
dataSuffix: DATA_SUFFIX,  // ✅ Config'de var mı?
```

#### 3. Provider Check
```typescript
// providers.tsx
<WagmiProvider config={wagmiConfig}>  // ✅ wagmiConfig kullanılıyor mu?
```

#### 4. Network Check
- Wallet'ın **Base Mainnet**'e bağlı olduğundan emin ol
- Chain ID: 8453

---

## 📊 Sonuç Raporu Formatı

Test tamamlandığında şunu paylaş:

```
🧪 Builder Code Test Sonuçları

Environment: [Development / Production]
Wallet: [MetaMask / Rabby / etc.]
Network: Base Mainnet (8453)

Transaction:
- Hash: 0x...
- From: 0x...
- Contract: [Router address]

Basescan Check:
- [✅/❌] Calldata'da 8021 marker
- [✅/❌] Builder code bc_92yf9czs

Validator Tool:
- [✅/❌] Attribution confirmed

Base Dashboard (10min later):
- Other category: [0/1] transaction
```
