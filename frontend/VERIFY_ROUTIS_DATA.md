# 🔍 Routis Gerçek Veri Doğrulama

## Supabase Console'dan Kontrol

### 1. Supabase Dashboard'a Git
```
https://supabase.com/dashboard/project/cpohwzeotqmrvkxephev
```

### 2. SQL Editor'ı Aç

### 3. Toplam İstatistikleri Çek

#### Query 1: Total Volume
```sql
SELECT 
  SUM(volume_usd) as total_volume_usd,
  COUNT(*) as total_swaps,
  COUNT(DISTINCT user_address) as unique_users
FROM swap_records;
```

#### Query 2: User Scores Summary
```sql
SELECT 
  SUM(volume_usd) as total_volume,
  SUM(swap_count) as total_swaps,
  COUNT(*) as total_users,
  COUNT(CASE WHEN score > 0 THEN 1 END) as active_traders
FROM user_scores;
```

#### Query 3: Recent Transactions
```sql
SELECT 
  created_at,
  user_address,
  dex,
  volume_usd,
  tx_hash
FROM swap_records
ORDER BY created_at DESC
LIMIT 50;
```

#### Query 4: Per-User Breakdown (Top 10)
```sql
SELECT 
  address,
  score,
  swap_count,
  volume_usd,
  consecutive_days
FROM user_scores
ORDER BY score DESC
LIMIT 10;
```

---

## Frontend'den Kontrol

### Component Ekle: AdminStats.tsx

```typescript
// components/admin/AdminStats.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function AdminStats() {
  const { data: swapRecords } = useQuery({
    queryKey: ["admin-swap-records"],
    queryFn: async () => {
      const { data } = await supabase
        .from("swap_records")
        .select("volume_usd");
      return data ?? [];
    },
  });

  const { data: userScores } = useQuery({
    queryKey: ["admin-user-scores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_scores")
        .select("*");
      return data ?? [];
    },
  });

  const totalVolumeFromRecords = swapRecords?.reduce(
    (sum, r) => sum + (r.volume_usd ?? 0), 0
  ) ?? 0;

  const totalVolumeFromScores = userScores?.reduce(
    (sum, s) => sum + (s.volume_usd ?? 0), 0
  ) ?? 0;

  const totalSwapsFromScores = userScores?.reduce(
    (sum, s) => sum + (s.swap_count ?? 0), 0
  ) ?? 0;

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h2 className="text-xl font-bold mb-4">Admin: Real Routis Stats</h2>
      
      <div className="space-y-2">
        <div>
          <strong>Total Volume (from swap_records):</strong>
          <span className="ml-2">${totalVolumeFromRecords.toFixed(2)}</span>
        </div>
        
        <div>
          <strong>Total Volume (from user_scores):</strong>
          <span className="ml-2">${totalVolumeFromScores.toFixed(2)}</span>
        </div>
        
        <div>
          <strong>Total Swaps (from user_scores):</strong>
          <span className="ml-2">{totalSwapsFromScores}</span>
        </div>
        
        <div>
          <strong>Total Users:</strong>
          <span className="ml-2">{userScores?.length ?? 0}</span>
        </div>
        
        <div>
          <strong>Active Traders (score > 0):</strong>
          <span className="ml-2">
            {userScores?.filter(s => s.score > 0).length ?? 0}
          </span>
        </div>
      </div>
      
      <div className="mt-4 p-2 bg-yellow-100 rounded">
        <strong>⚠️ Compare with Base Dashboard:</strong>
        <ul className="list-disc ml-6 mt-2">
          <li>Base: $58.1K | Routis: ${totalVolumeFromScores.toFixed(1)}K</li>
          <li>Base: 1.0K swaps | Routis: {totalSwapsFromScores} swaps</li>
          <li>Base: 70 traders | Routis: {userScores?.filter(s => s.score > 0).length} traders</li>
        </ul>
      </div>
    </div>
  );
}
```

### Kullanım:
```typescript
// app/admin/page.tsx (veya test sayfası)
import { AdminStats } from "@/components/admin/AdminStats";

export default function AdminPage() {
  return <AdminStats />;
}
```

---

## API Endpoint ile Kontrol

### /api/admin/stats Route Ekle

```typescript
// app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Query 1: swap_records totals
    const { data: records } = await supabase
      .from("swap_records")
      .select("volume_usd, tx_hash");

    // Query 2: user_scores totals
    const { data: scores } = await supabase
      .from("user_scores")
      .select("*");

    const stats = {
      swap_records: {
        total_volume: records?.reduce((s, r) => s + (r.volume_usd ?? 0), 0) ?? 0,
        total_count: records?.length ?? 0,
        unique_txs: new Set(records?.map(r => r.tx_hash)).size,
      },
      user_scores: {
        total_volume: scores?.reduce((s, r) => s + (r.volume_usd ?? 0), 0) ?? 0,
        total_swaps: scores?.reduce((s, r) => s + (r.swap_count ?? 0), 0) ?? 0,
        total_users: scores?.length ?? 0,
        active_traders: scores?.filter(s => s.score > 0).length ?? 0,
      },
      base_dashboard_comparison: {
        base_volume: 58100,  // $58.1K
        base_swaps: 1000,     // 1.0K
        base_traders: 70,
        
        routis_volume: scores?.reduce((s, r) => s + (r.volume_usd ?? 0), 0) ?? 0,
        routis_swaps: scores?.reduce((s, r) => s + (r.swap_count ?? 0), 0) ?? 0,
        routis_traders: scores?.filter(s => s.score > 0).length ?? 0,
        
        volume_diff_percent: null as number | null,
        swaps_diff_percent: null as number | null,
        traders_diff_percent: null as number | null,
      },
    };

    const rv = stats.user_scores.total_volume;
    const rs = stats.user_scores.total_swaps;
    const rt = stats.user_scores.active_traders;

    stats.base_dashboard_comparison.volume_diff_percent = 
      ((rv - 58100) / 58100) * 100;
    stats.base_dashboard_comparison.swaps_diff_percent = 
      ((rs - 1000) / 1000) * 100;
    stats.base_dashboard_comparison.traders_diff_percent = 
      ((rt - 70) / 70) * 100;

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

### Test:
```bash
curl http://localhost:3000/api/admin/stats | jq
```

---

## Beklenen Sonuçlar

### Eğer Routis < Base (Normal):
```
Routis Volume: $15K
Base Volume: $58.1K

Neden? 
- Base tüm tx'leri sayar (approval, wrap, vs.)
- Routis sadece başarılı swap'ları sayar
- Bazı tx'lar Supabase'e kaydedilmemiş olabilir
```

### Eğer Routis ≈ Base (İyi):
```
Routis Volume: $55K
Base Volume: $58.1K

Durum: ✅ İyi
- Küçük farklar normal (timing, failed tx'ler)
```

### Eğer Routis >> Base (Problem):
```
Routis Volume: $100K
Base Volume: $58.1K

Durum: ❌ Sorun var
- Duplicate kayıtlar olabilir
- Volume hesaplama hatası
- Test verisi temizlenmemiş
```

---

## Aksiyon Adımları

1. ✅ Supabase SQL query'leri çalıştır
2. ✅ AdminStats component'i ekle ve test et
3. ✅ /api/admin/stats endpoint'i ekle
4. ✅ Sonuçları Base Dashboard ile karşılaştır
5. ✅ Farkları analiz et ve rapor et
