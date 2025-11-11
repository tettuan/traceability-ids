# traceability-ids

トレーサビリティIDを抽出し、類似度に基づいてクラスタリングするツール

## 概要

Markdownファイル内に存在するトレーサビリティIDを自動抽出し、文字列の類似度に基づいてクラスタリングを行います。Pure TypeScriptで実装され、複数のクラスタリングアルゴリズムと距離計算手法を切り替え可能です。

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

## ライブラリとしての使用

```typescript
import { scanFiles } from "./core/scanner.ts";
import { extractIds } from "./core/extractor.ts";
import { LevenshteinDistance } from "./distance/levenshtein.ts";
import { HierarchicalClustering } from "./clustering/hierarchical.ts";
import { createDistanceMatrix } from "./distance/calculator.ts";

// ファイルをスキャンしてIDを抽出
const files = await scanFiles("./data");
const ids = await extractIds(files);

// クラスタリングを実行
const calculator = new LevenshteinDistance();
const matrix = createDistanceMatrix(ids.map(id => id.fullId), calculator);
const algorithm = new HierarchicalClustering(0.5);
const clusters = algorithm.cluster(ids, matrix);
```

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
