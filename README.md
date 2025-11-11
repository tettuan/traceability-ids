# traceability-ids

A tool for extracting and clustering traceability IDs from markdown files based on similarity.

トレーサビリティIDを抽出し、類似度に基づいてクラスタリングするツール

[![JSR](https://jsr.io/badges/@scope/traceability-ids)](https://jsr.io/@scope/traceability-ids)
[![JSR Score](https://jsr.io/badges/@scope/traceability-ids/score)](https://jsr.io/@scope/traceability-ids)

---

## Overview / 概要

**English:** This library automatically extracts traceability IDs from Markdown files and clusters them based on string similarity. Implemented in pure TypeScript with support for multiple clustering algorithms and distance calculation methods. Works with Deno and is designed for JSR publication.

**Japanese:** Markdownファイル内に存在するトレーサビリティIDを自動抽出し、文字列の類似度に基づいてクラスタリングを行います。Pure TypeScriptで実装され、複数のクラスタリングアルゴリズムと距離計算手法を切り替え可能です。

## プロジェクトの目的

ファイル内のトレーサビリティIDは `grep` で簡単に見つけることができますが、**類似したIDの所在を知る**ことは困難です。

このツールは、抽出したIDを類似度でクラスタリングし、**類似度順に並べたユニークなID一覧**を出力します。これにより：

- 類似したIDがどのファイルに存在するかを推測できる
- クラスタリングされた順序でIDを確認することで、関連するIDの発見が容易になる
- ファイルの所在は `grep` で検索できるため、ID一覧のみをシンプルに出力
- 同じIDが複数ファイルに現れる場合も、ユニーク化されて1回だけ表示される

## 特徴

- **複数のクラスタリングアルゴリズム対応**
  - ✅ 階層的クラスタリング (Hierarchical Clustering)
  - ✅ K-Means クラスタリング
  - ✅ DBSCAN (Density-Based Spatial Clustering)

- **多様な距離計算手法**
  - ✅ レーベンシュタイン距離 (Levenshtein Distance)
  - ✅ ジャロ・ウィンクラー距離 (Jaro-Winkler Distance)
  - ✅ コサイン類似度 (Cosine Similarity)
  - ✅ 構造的類似度 (Structural Distance)

- **複数の出力フォーマット**
  - **Simple形式（デフォルト）** - ユニークなID一覧のみ（1行1ID）
  - **Simple-Clustered形式** - クラスタごとに区切られたID一覧
  - JSON形式 - 完全な構造化データ
  - Markdown形式 - 人間が読みやすい形式
  - CSV形式 - スプレッドシート対応

- **Pure TypeScript実装**
  - 外部ライブラリ依存なし
  - Deno環境で動作
  - JSR公開を想定した設計

## トレーサビリティID書式

```
{level}:{scope}:{semantic}-{hash}#{version}
```

### 構成要素

- `{level}`: コロンの前の文字列
- `{scope}`: 最初のコロンと2番目のコロンの間の文字列
- `{semantic}`: 2番目のコロン後からハイフンまでの文字列
- `{hash}`: ハイフン後からハッシュ記号までの文字列
- `{version}`: ハッシュ記号後の文字列

### 例

```
req:projA:auth-timeout-3kd92z#20250903a
```

## 使用方法

### 基本的な使用（推奨）

```bash
# シンプルなID一覧を出力（デフォルト）
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt

# 出力例：
# req:apikey:hierarchy-9a2f4d#20251111a
# req:apikey:vendor-mgmt-3b7e5c#20251111a
# req:dashboard:login-display-a1b2c3#20251111
# ...
```

### クラスタ区切り付きID一覧

```bash
# クラスタごとに区切られたID一覧
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt \
  --format simple-clustered

# 出力例：
# # Cluster 1 (15 unique IDs)
# req:apikey:hierarchy-9a2f4d#20251111a
# req:apikey:vendor-mgmt-3b7e5c#20251111a
# ...
#
# # Cluster 2 (8 unique IDs)
# req:dashboard:login-display-a1b2c3#20251111
# ...
```

### 詳細なデータ出力

```bash
# JSON形式（完全なデータ）
deno run --allow-read --allow-write src/cli.ts ./data ./output/clusters.json \
  --format json

# Markdown形式（人間が読みやすい）
deno run --allow-read --allow-write src/cli.ts ./data ./output/clusters.md \
  --format markdown
```

### オプション一覧

| オプション | 説明 | デフォルト値 | 利用可能な値 |
|----------|------|------------|--------|
| `--algorithm` | クラスタリングアルゴリズム | `hierarchical` | `hierarchical`, `kmeans`, `dbscan` |
| `--distance` | 距離計算手法 | `levenshtein` | `levenshtein`, `jaro-winkler`, `cosine`, `structural` |
| `--format` | 出力形式 | `simple` | `simple`, `simple-clustered`, `json`, `markdown`, `csv` |
| `--threshold` | 階層的クラスタリングの閾値 | `10` | 数値 (編集距離) |
| `--k` | K-Meansのクラスタ数 | `0` | 数値 (0=自動推定) |
| `--epsilon` | DBSCANの近傍半径 | `0.3` | 数値 |
| `--min-points` | DBSCANの最小ポイント数 | `2` | 数値 |

### 使用例

```bash
# 基本的な使用 - シンプルなID一覧（推奨）
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt

# クラスタ区切り付きID一覧
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt --format simple-clustered

# K-Meansで10クラスタに分類
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt --algorithm kmeans --k 10

# 構造的類似度を使用
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt --distance structural

# 完全なデータをJSON形式で
deno run --allow-read --allow-write src/cli.ts ./data ./output/clusters.json --format json

# 人間が読みやすいMarkdown形式
deno run --allow-read --allow-write src/cli.ts ./data ./output/clusters.md --format markdown
```

## 距離計算手法の選び方

目的に応じて適切な距離計算手法を選択できます:

### 構造的距離 (structural) - 推奨

**同じscopeのIDをまとめたい場合に最適**

```bash
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt \
  --distance structural --threshold 0.3
```

- IDの構造 `{level}:{scope}:{semantic}-{hash}#{version}` を認識
- 各要素に重みを設定 (scope: 0.3, semantic: 0.3)
- `req:apikey:xxx` と `req:dashboard:xxx` を明確に区別
- **メリット**: scopeごとに綺麗にグルーピングされる
- **デメリット**: ID書式に依存

### レーベンシュタイン距離 (levenshtein) - デフォルト

**文字列の編集距離で比較**

```bash
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt
```

- 文字列全体を1文字ずつ比較
- IDの構造は考慮しない
- **メリット**: シンプルで汎用的
- **デメリット**: 階層的クラスタリングと組み合わせると、同じscopeのIDが分断されることがある（チェーン効果）

### ジャロ・ウィンクラー距離 (jaro-winkler)

**前方一致を重視**

```bash
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt \
  --distance jaro-winkler
```

- 文字列の前方部分（level, scope）の一致を重視
- **メリット**: 前方が同じIDをまとめやすい
- **デメリット**: semantic部分の違いが軽視される

### コサイン類似度 (cosine)

**N-gramベースの類似度**

```bash
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt \
  --distance cosine
```

- 文字列をN-gram（デフォルト2文字）に分解してベクトル化
- **メリット**: 部分文字列の共通性を評価
- **デメリット**: 完全一致より部分一致を重視

### 推奨される組み合わせ

| 目的 | 距離計算 | アルゴリズム | オプション |
|------|----------|--------------|-----------|
| scopeごとにグルーピング | `structural` | `hierarchical` | `--threshold 0.3` |
| 汎用的なクラスタリング | `levenshtein` | `hierarchical` | `--threshold 10` |
| クラスタ数を指定したい | 任意 | `kmeans` | `--k 5` |
| ノイズ除去したい | 任意 | `dbscan` | `--epsilon 0.3 --min-points 2` |

## プロジェクト構造

```
.
├── README.md                # このファイル
├── CLAUDE.md                # プロジェクト指示書
├── deno.json                # Deno設定ファイル
├── data/                    # サンプルデータ
├── docs/                    # ドキュメント
│   ├── requirements.md      # 要件定義
│   └── architecture.md      # アーキテクチャ設計
├── tmp/                     # 出力ディレクトリ（gitignore）
└── src/                     # ソースコード
    ├── core/                # コア機能
    │   ├── types.ts         # 型定義
    │   ├── scanner.ts       # ファイルスキャナ
    │   └── extractor.ts     # ID抽出器
    ├── distance/            # 距離計算
    │   ├── calculator.ts    # インターフェース
    │   └── levenshtein.ts   # レーベンシュタイン距離
    ├── clustering/          # クラスタリング
    │   ├── algorithm.ts     # インターフェース
    │   └── hierarchical.ts  # 階層的クラスタリング
    ├── formatter/           # 出力フォーマッター
    │   └── formatter.ts     # JSON/Markdown/CSV
    ├── cli.ts               # CLIエントリポイント
    └── mod.ts               # ライブラリエントリポイント
```

## 技術スタック

- **ランタイム**: Deno (最新版)
- **言語**: Pure TypeScript
- **依存関係**: なし（標準ライブラリのみ）

## ドキュメント

- [要件定義](docs/requirements.md) - プロジェクトの要件と機能仕様
- [アーキテクチャ設計](docs/architecture.md) - 詳細な設計とインターフェース定義
- [トレーサビリティID定義](docs/id.md) - ID書式の詳細仕様

## Library Usage / ライブラリとしての使用

### Installation / インストール

```bash
# Using JSR (recommended)
deno add @scope/traceability-ids

# Or import directly
import { ... } from "jsr:@scope/traceability-ids";
```

### Quick Start / クイックスタート

```typescript
import {
  scanFiles,
  extractIds,
  LevenshteinDistance,
  HierarchicalClustering,
  createDistanceMatrix,
  formatAsSimple,
} from "@scope/traceability-ids";

// 1. Scan markdown files / ファイルをスキャン
const files = await scanFiles("./docs");

// 2. Extract traceability IDs / IDを抽出
const ids = await extractIds(files);

// 3. Create distance matrix / 距離行列を作成
const calculator = new LevenshteinDistance();
const matrix = createDistanceMatrix(ids.map(id => id.fullId), calculator);

// 4. Cluster IDs / クラスタリングを実行
const algorithm = new HierarchicalClustering(10);
const clusters = algorithm.cluster(ids, matrix);

// 5. Format results / 結果をフォーマット
const result = {
  clusters,
  algorithm: algorithm.name,
  distanceCalculator: calculator.name,
};
const output = formatAsSimple(result);
console.log(output);
```

### Advanced Examples / 応用例

#### Scope-based Grouping / スコープ別グルーピング

```typescript
import {
  scanFiles,
  extractIds,
  StructuralDistance,
  HierarchicalClustering,
  createDistanceMatrix,
} from "@scope/traceability-ids";

const files = await scanFiles("./docs");
const ids = await extractIds(files);

// Use structural distance to group by scope
// 構造的距離でスコープ別にグルーピング
const calculator = new StructuralDistance();
const matrix = createDistanceMatrix(ids.map(id => id.fullId), calculator);

const algorithm = new HierarchicalClustering(0.3);
const clusters = algorithm.cluster(ids, matrix);

// Group results by scope
clusters.forEach((cluster, idx) => {
  console.log(`Cluster ${idx + 1}:`);
  cluster.items.forEach(item => {
    console.log(`  ${item.scope} - ${item.semantic}`);
  });
});
```

#### Similarity Search / 類似度検索

```typescript
import {
  scanFiles,
  extractIds,
  searchSimilar,
  StructuralDistance,
  formatSearchResult,
} from "@scope/traceability-ids";

const files = await scanFiles("./docs");
const ids = await extractIds(files);

// Find IDs similar to "security"
// "security"に類似したIDを検索
const calculator = new StructuralDistance();
const results = searchSimilar("security", ids, calculator, { top: 10 });

// Display results with distances
// 距離付きで結果を表示
const output = formatSearchResult(results, "simple", true);
console.log(output);

// Or get structured data
// または構造化データを取得
results.items.forEach(item => {
  console.log(`${item.id.fullId} - Distance: ${item.distance.toFixed(3)}`);
});
```

#### Keyword Filtering / キーワードフィルタリング

```typescript
import {
  scanFiles,
  extractIds,
  searchByKeyword,
} from "@scope/traceability-ids";

const files = await scanFiles("./docs");
const ids = await extractIds(files);

// Find all IDs containing "security"
// "security"を含む全IDを検索
const matches = searchByKeyword("security", ids);

console.log(`Found ${matches.length} IDs containing "security":`);
matches.forEach(id => {
  console.log(`  ${id.fullId} (${id.filePath}:${id.lineNumber})`);
});
```

#### Custom Distance Calculator / カスタム距離計算器

```typescript
import type { DistanceCalculator } from "@scope/traceability-ids";

class CustomDistance implements DistanceCalculator {
  readonly name = "custom";

  calculate(a: string, b: string): number {
    // Your custom distance logic here
    // カスタム距離計算ロジック
    return Math.abs(a.length - b.length);
  }
}

// Use with clustering
const calculator = new CustomDistance();
// ... rest of clustering code
```

### API Reference / API リファレンス

For complete API documentation, see the [JSR documentation](https://jsr.io/@scope/traceability-ids).

完全なAPIドキュメントは[JSRドキュメント](https://jsr.io/@scope/traceability-ids)を参照してください。

## 開発状況

v1.0の実装が完了しました！

- [x] 要件定義
- [x] アーキテクチャ設計
- [x] インターフェース設計
- [x] コア機能実装 (スキャナ、抽出器)
- [x] 距離計算実装
  - [x] レーベンシュタイン距離
  - [x] ジャロ・ウィンクラー距離
  - [x] コサイン類似度
  - [x] 構造的類似度
- [x] クラスタリング実装
  - [x] 階層的クラスタリング
  - [x] K-Means
  - [x] DBSCAN
- [x] CLI実装
- [x] 出力フォーマット (JSON/Markdown/CSV)
- [x] ユニットテスト (70テスト全てパス)
- [x] CI設定
- [ ] JSR公開

## ライセンス

TBD

## 貢献

TBD
