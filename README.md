# traceability-ids

トレーサビリティIDを抽出し、類似度に基づいてクラスタリングするツール

## 概要

Markdownファイル内に存在するトレーサビリティIDを自動抽出し、文字列の類似度に基づいてクラスタリングを行います。Pure TypeScriptで実装され、複数のクラスタリングアルゴリズムと距離計算手法を切り替え可能です。

## 特徴

- **複数のクラスタリングアルゴリズム対応**
  - 階層的クラスタリング (Hierarchical Clustering)
  - K-Means クラスタリング
  - DBSCAN (Density-Based Spatial Clustering)

- **多様な距離計算手法**
  - レーベンシュタイン距離 (Levenshtein Distance)
  - ジャロ・ウィンクラー距離 (Jaro-Winkler Distance)
  - コサイン類似度 (Cosine Similarity)
  - 構造的類似度 (Structural Distance)

- **複数の出力フォーマット**
  - JSON形式
  - Markdown形式
  - CSV形式

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

詳細は [docs/id.md](docs/id.md) を参照してください。

## 使用方法

### 基本的な使用

```bash
deno run --allow-read --allow-write src/cli.ts <input-dir> <output-file>
```

### オプション指定

```bash
deno run --allow-read --allow-write src/cli.ts ./data ./output/clusters.json \
  --algorithm hierarchical \
  --distance levenshtein \
  --threshold 0.7 \
  --format json
```

### オプション一覧

| オプション | 説明 | デフォルト値 | 選択肢 |
|----------|------|------------|--------|
| `--algorithm` | クラスタリングアルゴリズム | `hierarchical` | `hierarchical`, `kmeans`, `dbscan` |
| `--distance` | 距離計算手法 | `levenshtein` | `levenshtein`, `jaro-winkler`, `cosine`, `structural` |
| `--format` | 出力形式 | `json` | `json`, `markdown`, `csv` |
| `--threshold` | 階層的クラスタリングの閾値 | `0.5` | 数値 |
| `--k` | K-Meansのクラスタ数 | 自動推定 | 数値 |
| `--epsilon` | DBSCANの近傍半径 | `0.3` | 数値 |
| `--min-points` | DBSCANの最小ポイント数 | `2` | 数値 |

## プロジェクト構造

```
.
├── README.md           # このファイル
├── CLAUDE.md           # プロジェクト指示書
├── data/               # サンプルデータ
├── docs/               # ドキュメント
│   ├── id.md           # トレーサビリティID定義
│   ├── requirements.md # 要件定義
│   └── architecture.md # アーキテクチャ設計
└── src/                # ソースコード（実装予定）
    ├── core/           # コア機能
    ├── distance/       # 距離計算
    ├── clustering/     # クラスタリング
    ├── cli.ts          # CLIエントリポイント
    └── mod.ts          # ライブラリエントリポイント
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

現在、設計フェーズが完了しています。実装はこれから開始します。

- [x] 要件定義
- [x] アーキテクチャ設計
- [x] インターフェース設計
- [ ] コア機能実装
- [ ] 距離計算実装
- [ ] クラスタリング実装
- [ ] CLI実装
- [ ] テスト作成
- [ ] JSR公開

## ライセンス

TBD

## 貢献

TBD