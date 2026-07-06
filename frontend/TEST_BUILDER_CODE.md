# 🧪 Builder Code Test - DETAYLI ADIMLAR

## ⚠️ KRİTİK SORUN TESPİT EDİLDİ

**Viem versiyonu eski olduğu için `ox` paketi yanlış versiyondu!**

✅ **Düzeltildi:** 
- `viem@2.21.54` → `viem@2.54.6` (güncel)
- `ox@0.1.2` → `ox@0.14.30` (güncel, Attribution.toDataSuffix destekli)

---

## 🔍 Test Adımları

### 1. Server Çalıştır (Zaten çalışıyor)

```bash
http://localhost:3000
```

### 2. Tarayıcıda Aç ve Console'u Kontrol Et

**Chrome/Edge:**
- F12 tuşuna bas
- "Console" sekmesine git

**Görmeniz gereken:**
```
════════════════════════════════════════
🔧 BUILDER CODE CONFIG
════════════════════════════════════════
Builder Code: bc_92yf9czs
Data Suffix: 0x...  (hex string)
Suffix Type: string
Suffix Length: [bir sayı, örn: 34]
════════════════════════════════════════
```

### ✅ Eğer bu log'u görüyorsanız:
**Builder code config başarıyla yüklendi!**

### ❌ Eğer bu log'u GÖRMÜYORSANIZ:
**Sorun devam ediyor, wagmi-config yüklenmiyor**

---

## 3. Test Transaction Yap

### A. Minimal Swap:
1. Wallet bağla (MetaMask)
2. Network: Base Mainnet olduğundan emin ol
3. Swap yap: **0.0001 ETH → USDC** (çok küçük tutar)

### B. Transaction Hash'i Kopyala
Transaction onaylandıktan sonra hash'i kopyala.

### C. Basescan'de Kontrol Et

```
https://basescan.org/tx/[YOUR_TX_HASH]
```

1. "Click to see more" tıkla
2. "Input Data" sekmesine git
3. **Raw data görünümüne geç** (Decoded yerine)
4. Calldata'nın **SON KISIMDA** şunları ara:

**Aranacak pattern:**
```
...8021bc_92yf9czs8021...
```

veya hex encode edilmiş:
```
...8021626339323966396373733830...
```

---

## 4. Builder Code Validator Tool

```
https://builder-code-checker.vercel.app/
```

1. Transaction Type: "Transaction" seç
2. TX hash'i yapıştır
3. "Check Attribution" tıkla

### ✅ Başarılı Sonuç:
```
✓ Builder Code Found: bc_92yf9czs
✓ ERC-8021 Format Valid
✓ Attribution: Routis App
```

### ❌ Başarısız Sonuç:
```
✗ No builder code found
✗ Transaction has no ERC-8021 suffix
```

---

## 5. Base Dashboard Kontrolü

**10 dakika bekleyin** (indexing delay)

```
https://base.dev/
→ Login
→ Routis App dashboard
→ "Other" tab
```

### Beklenen:
```
Before:
Other: 0 transactions

After (10 dakika sonra):
Other: 1 transaction ✅
```

---

## 🐛 Troubleshooting

### Problem 1: Console'da log yok

**Çözüm:**
```bash
# Hard refresh
Ctrl + Shift + R (Chrome/Edge)
Cmd + Shift + R (Mac)
```

Hala yoksa:
```bash
# Cache temizle
F12 → Application → Clear storage → Clear site data
```

### Problem 2: "Attribution not found" import hatası

**Kontrol:**
```bash
cd frontend
npm list ox

# Beklenen: ox@0.14.29 veya üstü
```

**Düzelt:**
```bash
npm install ox@latest
npm install viem@latest
```

### Problem 3: Basescan'de builder code yok

**Olası nedenler:**

#### A. wagmiConfig kullanılmıyor
```typescript
// providers.tsx kontrol et
<WagmiProvider config={wagmiConfig}>  // ✅ Doğru
</WagmiProvider>

// ❌ Yanlış:
<WagmiProvider config={createConfig({...})}>
</WagmiProvider>
```

#### B. Hook doğru import edilmemiş
```typescript
// ✅ Doğru
import { useWriteContract } from "wagmi";

// ❌ Yanlış
import { useWriteContract } from "viem";
```

#### C. dataSuffix override edilmiş
```typescript
// Transaction call'da dataSuffix override edilmemeli
await writeContractAsync({
  address,
  abi,
  functionName,
  args,
  // ❌ dataSuffix: undefined  // Bunu YAPMA!
});
```

### Problem 4: Viem version conflict

**Kontrol:**
```bash
npm list viem | grep viem

# Tüm viem'ler 2.45.0+ olmalı
```

**Düzelt:**
```bash
npm dedupe
npm install
```

---

## 📊 Sonuç Raporu

Test tamamlandığında şunu doldurun:

```
═══════════════════════════════════════════
🧪 BUILDER CODE TEST SONUÇLARI
═══════════════════════════════════════════

Environment: Development (localhost:3000)
Wallet: [MetaMask / Rabby / Coinbase]
Network: Base Mainnet (8453)

─── Console Check ─────────────────────────
Builder Code Log: [✓ / ✗]
Data Suffix Value: [0x... / Yok]

─── Transaction ───────────────────────────
TX Hash: 0x...
From: 0x...
To: [Router address]
Status: [Success / Failed]

─── Basescan Check ────────────────────────
Input Data Contains:
  - 8021 marker: [✓ / ✗]
  - bc_92yf9czs: [✓ / ✗]
  - ERC-8021 format: [✓ / ✗]

─── Validator Tool ────────────────────────
Builder Code Detected: [✓ / ✗]
Code Value: [bc_92yf9czs / None]
Attribution Valid: [✓ / ✗]

─── Base Dashboard (10min later) ──────────
Other Category:
  - Transactions: [0 → 1 / 0 → 0]
  - Users: [0 → 1 / 0 → 0]

═══════════════════════════════════════════
SONUÇ: [✓ BAŞARILI / ✗ BAŞARISIZ]
═══════════════════════════════════════════
```

---

## 🎯 Aksiyon Planı

### Hemen Yap:
1. ✅ http://localhost:3000 aç
2. ✅ Console'da builder code log'unu kontrol et
3. ✅ Test swap yap (0.0001 ETH)
4. ✅ Basescan'de calldata kontrol et
5. ✅ Validator tool ile test et

### 10 Dakika Sonra:
6. ✅ Base dashboard kontrol et
7. ✅ Sonuç raporunu doldur
8. ✅ Sonuçları paylaş

---

## 💡 Beklenen Sonuç

### ✅ Eğer Düzeldi:
```
Console: Builder code log görünüyor ✓
Basescan: 8021bc_92yf9czs var ✓
Validator: Attribution found ✓
Base Dashboard: +1 transaction ✓

→ Sorun çözüldü! 🎉
→ Artık tüm tx'ler kaydedilecek
```

### ❌ Eğer Hala Sorun Varsa:
```
Console: Log yok veya hata ✗
→ wagmi-config.ts yüklenmiyor
→ Import hatası var
→ ox/viem version conflict

Basescan: Builder code yok ✗
→ dataSuffix eklenmedi
→ wagmiConfig kullanılmıyor
→ Hook'lar doğru import edilmemiş
```

Sonuçları buraya yapıştır, devam edelim! 🔍
