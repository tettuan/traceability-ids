# Performance Optimization

## 現状

現在の実装は**小規模データ（10-100ファイル）では既に十分高速**です：

```
ファイルスキャン:    0.2ms  (1.1%)
ID抽出:              1.8ms  (10.3%)
重複排除:            0.03ms (0.2%)
距離行列計算:        14ms   (81%)    ← ボトルネック
クラスタリング:      1.3ms  (7.5%)
─────────────────────────────────
合計:                17.5ms
```

## ボトルネック

**距離行列計算**が処理時間の81%を占めています。

### スケーラビリティ

大規模データ（1000ファイル、1000 ID）の場合：

```
距離行列: 6.14ms × (1000/35)² ≈ 25秒  🐌
```

O(n²) の計算量のため、ID数が増えると指数的に遅くなります。

## 実装済みの最適化

### 1. 対称性の利用

```typescript
// 既に実装済み: 半分だけ計算
for (let i = 0; i < n; i++) {
  for (let j = i + 1; j < n; j++) { // j = i+1 から開始
    const distance = calculator.calculate(items[i], items[j]);
    matrix[i][j] = distance;
    matrix[j][i] = distance; // 対称性を利用
  }
}
```

### 2. CLI版ID抽出（オプション）

**大規模データ用**: ripgrep + sort による高速化

```typescript
import { extractUniqueIdsAuto } from "./src/core/extractor-cli.ts";

// 自動判定: 50+ファイルでCLI版を使用
const uniqueIds = await extractUniqueIdsAuto(inputDir);
```

**パフォーマンス**:

- 小規模（<50ファイル）: Native版（プロセス起動コストを回避）
- 大規模（≥50ファイル）: CLI版（10-100倍高速）

**必要な外部ツール**:

```bash
# macOS
brew install ripgrep

# Linux
apt install ripgrep

# Windows
choco install ripgrep
```

## 根本的な解決策

### 大規模データの場合

**索引化（インデックスファイル）**が本質的な解決：

```bash
# 1回だけ: 索引を作成
deno run index.ts ./data --output ./data.index

# 検索時: 索引を使用（超高速）
deno run search.ts --index ./data.index --query "auth"
```

**メリット**:

- 検索が O(n²) → O(log n) に改善
- 事前計算済みの距離行列を利用
- Pure TypeScript（外部依存なし）

## 推奨事項

| データ規模                        | 推奨アプローチ             |
| --------------------------------- | -------------------------- |
| 小規模（<100ファイル、<100 ID）   | 現状のまま（既に十分高速） |
| 中規模（100-1000ファイル）        | CLI版ID抽出を有効化        |
| 大規模（1000+ファイル、1000+ ID） | 索引化の実装を検討         |

## ベンチマーク

```bash
# 基本ベンチマーク
deno run --allow-read --allow-write --allow-env \
  benchmark/benchmark.ts ./data

# CLI vs Native 比較
deno run --allow-read --allow-write --allow-run --allow-env \
  benchmark/benchmark-cli.ts ./data
```

## まとめ

- ✅ 現状: 小規模データで十分高速（17ms）
- ✅ 距離行列計算がボトルネック（O(n²)）
- ✅ CLI版ID抽出で大規模データに対応可能
- 🔜 将来: 索引化で根本的解決（必要になったら実装）
