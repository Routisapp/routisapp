# 🔍 Transaction'da Builder Code Kontrolü

## Yöntem 1: Basescan (En Kolay)

### Adımlar:
1. Transaction hash'inizi alın
2. Basescan'e gidin:
```
https://basescan.org/tx/[YOUR_TX_HASH]
```

3. **"Click to see More"** butonuna tıklayın

4. **"Input Data"** sekmesine gidin

5. **Decode yerine "View Input As: Original"** seçin (sağ üstte dropdown)

### Ne Arayacaksınız:

#### ✅ Builder Code VARSA:
Calldata'nın **en sonunda** şunu göreceksiniz:

```
...8021bc_92yf9czs8021
```

veya Hex formatında:

```
...80216263393279663963737a733830
```

#### ❌ Builder Code YOKSA:
Calldata normal şekilde bitecek, sonda 8021 pattern'i olmayacak.

### Örnek:

**Builder Code OLAN transaction:**
```
Input Data:
0x38ed173900000000000000000000...
...
...00000000000000000000000000000
80216263393279663963737a733830  ← BURASI!
```

**Builder Code OLMAYAN transaction:**
```
Input Data:
0x38ed173900000000000000000000...
...
...00000000000000000000000000000  ← Sonda 8021 yok
```

---

## Yöntem 2: Builder Code Validator Tool (En Güvenilir)

### Online Tool:
```
https://builder-code-checker.vercel.app/
```

### Kullanım:
1. **Transaction Type:** "Transaction" seç
2. **Enter Transaction Hash:** TX hash'inizi yapıştırın
3. **Network:** Base Mainnet seçili olduğundan emin olun
4. **"Check Attribution"** butonuna tıklayın

### Sonuçlar:

#### ✅ Builder Code Bulundu:
```
✓ Builder Code Found
Code: bc_92yf9czs
Format: ERC-8021
Valid: Yes
```

#### ❌ Builder Code Bulunamadı:
```
✗ No builder code found
This transaction has no ERC-8021 attribution
```

---

## Yöntem 3: Manuel Hex Decode (İleri Seviye)

### Adımlar:

1. **Basescan'den Raw Input Data'yı kopyalayın**

2. **Online Hex Decoder kullanın:**
```
https://www.rapidtables.com/convert/number/hex-to-ascii.html
```

3. **Calldata'nın son 100 karakterini decode edin**

4. **"bc_92yf9czs" stringini arayın**

### Hex → ASCII Çevirme:

Builder code'unuzun hex karşılığı:
```
Hex: 6263393279663963737a73
ASCII: bc_92yf9czs
```

8021 marker'ın hex karşılığı:
```
Hex: 3830 3231
ASCII: 8021
```

### Tam Pattern (Hex):
```
38 30 32 31  ← "8021"
62 63 39 32 79 66 39 63 73 7a 73  ← "bc_92yf9czs"
38 30 32 31  ← "8021"
```

---

## Yöntem 4: Custom Script (Developers)

### Node.js Script:

```javascript
// check-builder-code.js
const { createPublicClient, http } = require('viem');
const { base } = require('viem/chains');

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

async function checkBuilderCode(txHash) {
  const tx = await client.getTransaction({ hash: txHash });
  const data = tx.input;
  
  // ERC-8021 pattern: 8021 at start and end of suffix
  const marker = '8021';
  const builderCode = 'bc_92yf9czs';
  
  // Convert to ASCII for easier searching
  const dataStr = Buffer.from(data.slice(2), 'hex').toString('utf8');
  
  if (dataStr.includes(marker) && dataStr.includes(builderCode)) {
    console.log('✅ Builder Code FOUND!');
    console.log('Code:', builderCode);
    console.log('Position:', dataStr.indexOf(builderCode));
    return true;
  } else {
    console.log('❌ Builder Code NOT FOUND');
    return false;
  }
}

// Kullanım:
checkBuilderCode('0xYOUR_TX_HASH_HERE');
```

### Çalıştırma:
```bash
node check-builder-code.js
```

---

## Yöntem 5: Python Script

```python
# check_builder_code.py
import requests

def check_builder_code(tx_hash):
    # Base RPC endpoint
    url = "https://mainnet.base.org"
    
    # Get transaction
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_getTransactionByHash",
        "params": [tx_hash],
        "id": 1
    }
    
    response = requests.post(url, json=payload)
    tx = response.json()['result']
    
    # Get input data
    input_data = tx['input']
    
    # Convert hex to bytes
    data_bytes = bytes.fromhex(input_data[2:])
    
    # Check for ERC-8021 pattern
    marker = b'8021'
    builder_code = b'bc_92yf9czs'
    
    if marker in data_bytes and builder_code in data_bytes:
        print("✅ Builder Code FOUND!")
        print(f"Code: {builder_code.decode('utf-8')}")
        print(f"Position: {data_bytes.find(builder_code)}")
        return True
    else:
        print("❌ Builder Code NOT FOUND")
        return False

# Kullanım:
check_builder_code("0xYOUR_TX_HASH_HERE")
```

---

## 📊 Karşılaştırma Tablosu

| Yöntem | Kolay | Hızlı | Güvenilir | Detaylı |
|--------|-------|-------|-----------|---------|
| Basescan | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Validator Tool | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Hex Decoder | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Node.js Script | ⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Python Script | ⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Önerilen Yöntem

### Hızlı Kontrol İçin:
**Builder Code Validator Tool** kullanın
```
https://builder-code-checker.vercel.app/
```
- En hızlı
- En güvenilir
- Otomatik parse eder
- Kullanımı kolay

### Manuel Kontrol İçin:
**Basescan** kullanın
- Transaction'ı zaten görüyorsunuz
- Input data hemen orada
- Extra tool gerekmez

### Toplu Kontrol İçin:
**Script** yazın (Node.js veya Python)
- Birden fazla TX kontrol edebilirsiniz
- Otomatik raporlama
- CI/CD'ye entegre edilebilir

---

## 🧪 Test Transaction'ları

Şu TX'leri kontrol ederek test edin:

### ✅ Builder Code OLAN (örnek):
```
# Başka bir projenin TX'i (test için)
0x... (builder code içeren bir TX)
```

### ❌ Builder Code OLMAYAN (örnek):
```
# Eski bir TX (builder code öncesi)
0x... (builder code içermeyen bir TX)
```

---

## 📝 Checklist

Test etmek için:

- [ ] Basescan'de input data kontrol ettim
- [ ] Validator tool ile doğruladım
- [ ] Hex decode ile manuel kontrol ettim
- [ ] Sonuçlar tutarlı

Builder Code bulundu mu?
- [ ] ✅ Evet, her yöntemde görünüyor
- [ ] ❌ Hayır, hiçbir yöntemde yok
- [ ] ⚠️ Kısmen (bazı TX'lerde var, bazılarında yok)

---

## 🆘 Sorun Giderme

### "8021 görüyorum ama bc_92yf9czs görmüyorum"
→ Başka bir builder code kullanılmış olabilir
→ Hex decode doğru yapılmamış olabilir

### "Calldata'nın ortasında 8021 var ama sonda yok"
→ Bu builder code değil, rastgele data
→ ERC-8021 suffix **en sonda** olmalı

### "Input data çok kısa, hiçbir şey yok"
→ Simple transfer olabilir (ETH transfer)
→ Builder code sadece contract call'larda olur

---

## 💡 Pro Tip

Kendi transaction'larınızı takip etmek için basit bir dashboard yapın:

```typescript
// components/admin/TxMonitor.tsx
export function TxMonitor() {
  const [txHash, setTxHash] = useState("");
  const [result, setResult] = useState(null);
  
  async function check() {
    const response = await fetch(
      `https://builder-code-checker.vercel.app/api/check?tx=${txHash}`
    );
    const data = await response.json();
    setResult(data);
  }
  
  return (
    <div>
      <input value={txHash} onChange={e => setTxHash(e.target.value)} />
      <button onClick={check}>Check</button>
      {result && (
        <div>
          {result.found ? "✅" : "❌"} 
          {result.code}
        </div>
      )}
    </div>
  );
}
```
