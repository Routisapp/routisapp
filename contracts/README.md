# Aggregator Kontratı

Base ağı DEX Aggregator — Uniswap V3 ve Aerodrome üzerinden swap yapar.

## Kontrat Adresleri (Base mainnet)

| Kontrat           | Adres |
|-------------------|-------|
| Uniswap Router    | 0x2626664c2603336E57B271c5C0b26F421741e481 |
| Aerodrome Router  | 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43 |
| Aerodrome Factory | 0x420DD381b31aEf6683db6B902084cB0FFECe40Da |

## Platform Ücreti
- %0.05 (5 BPS)
- tokenIn üzerinden kesilir
- Sadece owner `withdrawFees()` ile çekebilir

## Güvenlik
- `ReentrancyGuard` — tekrar giriş saldırılarına karşı
- `amountOutMinimum` — slippage koruması
- `onlyOwner` — sadece sahip ücret çekebilir
- `transferFrom` ile token alınır (kontrat bakiyesi tutulmaz)

## Deploy (Foundry gerekli)

### 1. Foundry kur
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. .env dosyasını hazırla
```bash
cp .env.example .env
# .env içine PRIVATE_KEY ve BASESCAN_API_KEY gir
```

### 3. Deploy et ve Basescan'de doğrula
```bash
forge script script/Deploy.s.sol \
  --rpc-url base \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

### 4. Test et
```bash
forge test
```
