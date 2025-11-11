# アーキテクチャ設計

## 概要

Pure TypeScript で実装し、アルゴリズムを切り替え可能な設計とする。

## モジュール構成

```
src/
├── core/
│   ├── types.ts              # 共通型定義
│   ├── extractor.ts          # ID抽出
│   └── scanner.ts            # ファイルスキャン
├── distance/
│   ├── calculator.ts         # 距離計算インターフェース
│   ├── levenshtein.ts        # レーベンシュタイン距離
│   ├── jaro_winkler.ts       # ジャロ・ウィンクラー距離
│   ├── cosine.ts             # コサイン類似度
│   └── structural.ts         # 構造的類似度
├── clustering/
│   ├── algorithm.ts          # クラスタリングインターフェース
│   ├── hierarchical.ts       # 階層的クラスタリング
│   ├── kmeans.ts             # K-Means
│   └── dbscan.ts             # DBSCAN
├── search/                   # 類似度検索（新機能）
│   └── similarity.ts         # 類似度検索実装
├── formatter/
│   ├── formatter.ts          # 出力フォーマッター
│   └── simple.ts             # シンプル形式
├── cli.ts                    # CLIエントリポイント
└── mod.ts                    # ライブラリエントリポイント
```

## CLI 引数定義

### 基本使用法

```bash
# クラスタリングモード（デフォルト）
deno run --allow-read --allow-write src/cli.ts <input-dir> <output-file> [options]

# 類似度検索モード（新機能）
deno run --allow-read --allow-write src/cli.ts <input-dir> <output-file> --mode search --query <query-string> [options]
```

### 必須引数

1. **`<input-dir>`** - 調査対象の最上位ディレクトリ
   - 指定されたディレクトリ配下の *.md ファイルを再帰的にスキャン
   - 相対パスまたは絶対パス

2. **`<output-file>`** - 出力先ファイルパス
   - クラスタリング結果または検索結果を出力するファイル
   - 形式: JSON, Markdown, CSV など（オプションで指定）

### オプション引数（共通）

- **`--mode <mode>`** - 実行モード（デフォルト: cluster）
  - `cluster` - クラスタリングモード
  - `search` - 類似度検索モード（新機能）

- **`--distance <name>`** - 距離計算手法（デフォルト: levenshtein）
  - `levenshtein` - レーベンシュタイン距離
  - `jaro-winkler` - ジャロ・ウィンクラー距離
  - `cosine` - コサイン類似度
  - `structural` - 構造的類似度

- **`--format <format>`** - 出力形式（デフォルト: simple）
  - `simple` - シンプルなID一覧
  - `simple-clustered` - クラスタ区切り付きID一覧
  - `json` - JSON形式
  - `markdown` - Markdown形式
  - `csv` - CSV形式

### オプション引数（クラスタリングモード）

- **`--algorithm <name>`** - クラスタリングアルゴリズム（デフォルト: hierarchical）
  - `hierarchical` - 階層的クラスタリング
  - `kmeans` - K-Means
  - `dbscan` - DBSCAN

- **`--threshold <number>`** - 階層的クラスタリングの閾値（デフォルト: 10）

- **`--k <number>`** - K-Meansのクラスタ数（デフォルト: 0 = 自動推定）

- **`--epsilon <number>`** - DBSCANの近傍半径（デフォルト: 0.3）

- **`--min-points <number>`** - DBSCANの最小ポイント数（デフォルト: 2）

### オプション引数（類似度検索モード）

- **`--query <string>`** - 検索クエリ（必須）
  - 完全なID文字列（例: `req:apikey:security-4f7b2e#20251111a`）
  - キーワード（例: `security`）
  - semantic部分（例: `encryption`）

- **`--top <number>`** - 上位N件のみ出力（デフォルト: 全件）

- **`--show-distance`** - 距離スコアを併せて出力（デフォルト: false）

### 使用例

#### クラスタリングモード

```bash
# 基本的な使用（デフォルトモード）
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt

# アルゴリズムと距離計算手法を指定
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt \
  --algorithm hierarchical \
  --distance structural \
  --threshold 0.3

# K-Meansを使用
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt \
  --algorithm kmeans \
  --k 5

# クラスタ区切り付きで出力
deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt \
  --format simple-clustered
```

#### 類似度検索モード（新機能）

```bash
# キーワード検索 - "security" に関連するID
deno run --allow-read --allow-write src/cli.ts ./data ./output/similar.txt \
  --mode search \
  --query "security" \
  --distance structural \
  --top 10

# 完全なIDから類似検索
deno run --allow-read --allow-write src/cli.ts ./data ./output/similar.txt \
  --mode search \
  --query "req:apikey:encryption-6d3a9c#20251111a" \
  --top 20

# 距離スコア付きで全件出力
deno run --allow-read --allow-write src/cli.ts ./data ./output/similar.txt \
  --mode search \
  --query "security" \
  --show-distance

# JSON形式で詳細データ
deno run --allow-read --allow-write src/cli.ts ./data ./output/similar.json \
  --mode search \
  --query "encryption" \
  --format json \
  --top 15
```

## 型定義

### core/types.ts

```typescript
/**
 * トレーサビリティID
 */
export interface TraceabilityId {
  /** 完全なID文字列 */
  fullId: string;
  /** {level}: コロンの前の文字列 */
  level: string;
  /** {scope}: 最初のコロンと2番目のコロンの間の文字列 */
  scope: string;
  /** {semantic}: 2番目のコロン後からハイフンまでの文字列 */
  semantic: string;
  /** {hash}: ハイフン後からハッシュ記号までの文字列 */
  hash: string;
  /** {version}: ハッシュ記号後の文字列 */
  version: string;
  /** IDが見つかったファイルパス */
  filePath: string;
  /** ファイル内での行番号 */
  lineNumber: number;
}

/**
 * クラスタ
 */
export interface Cluster {
  /** クラスタに含まれるID */
  items: TraceabilityId[];
  /** クラスタの代表ID（オプション） */
  centroid?: TraceabilityId;
  /** クラスタID */
  id: number;
}

/**
 * クラスタリング結果
 */
export interface ClusteringResult {
  /** クラスタの配列 */
  clusters: Cluster[];
  /** 使用したアルゴリズム名 */
  algorithm: string;
  /** 使用した距離計算手法 */
  distanceCalculator: string;
}

/**
 * 類似度検索の1件の結果（新機能）
 */
export interface SimilarityItem {
  /** ID情報 */
  id: TraceabilityId;
  /** クエリとの距離スコア */
  distance: number;
}

/**
 * 類似度検索結果（新機能）
 */
export interface SimilaritySearchResult {
  /** 検索クエリ */
  query: string;
  /** 類似度順にソートされたID配列 */
  items: SimilarityItem[];
  /** 使用した距離計算手法 */
  distanceCalculator: string;
}
```

## 距離計算インターフェース

### distance/calculator.ts

```typescript
/**
 * 距離計算インターフェース
 */
export interface DistanceCalculator {
  /**
   * 2つの文字列間の距離を計算
   * @param a 文字列A
   * @param b 文字列B
   * @returns 距離（0に近いほど類似）
   */
  calculate(a: string, b: string): number;

  /**
   * 計算手法の名前
   */
  readonly name: string;
}

/**
 * 距離行列を作成
 */
export function createDistanceMatrix(
  items: string[],
  calculator: DistanceCalculator
): number[][] {
  const n = items.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distance = calculator.calculate(items[i], items[j]);
      matrix[i][j] = distance;
      matrix[j][i] = distance;
    }
  }

  return matrix;
}
```

## クラスタリングアルゴリズムインターフェース

### clustering/algorithm.ts

```typescript
import type { TraceabilityId, Cluster } from "../core/types.ts";

/**
 * クラスタリングアルゴリズムインターフェース
 */
export interface ClusteringAlgorithm {
  /**
   * クラスタリングを実行
   * @param items クラスタリング対象のID
   * @param distanceMatrix 距離行列
   * @returns クラスタの配列
   */
  cluster(items: TraceabilityId[], distanceMatrix: number[][]): Cluster[];

  /**
   * アルゴリズムの名前
   */
  readonly name: string;
}

/**
 * クラスタリングオプション（アルゴリズムごとに異なる）
 */
export interface ClusteringOptions {
  /** K-Means: クラスタ数 */
  k?: number;
  /** 階層的: 結合の閾値 */
  threshold?: number;
  /** DBSCAN: 近傍の半径 */
  epsilon?: number;
  /** DBSCAN: 最小ポイント数 */
  minPoints?: number;
}
```

## 実装方針

### 1. レーベンシュタイン距離

動的計画法で実装。O(mn) の計算量。

```typescript
export class LevenshteinDistance implements DistanceCalculator {
  readonly name = "Levenshtein";

  calculate(a: string, b: string): number {
    // DP テーブルを使った実装
  }
}
```

### 2. 階層的クラスタリング

凝集型（Agglomerative）を実装。

```typescript
export class HierarchicalClustering implements ClusteringAlgorithm {
  readonly name = "Hierarchical";

  cluster(items: TraceabilityId[], distanceMatrix: number[][]): Cluster[] {
    // 1. 各アイテムを個別のクラスタとして初期化
    // 2. 最も近い2つのクラスタを結合
    // 3. 閾値に達するまで繰り返し
  }
}
```

### 3. K-Means クラスタリング

```typescript
export class KMeansClustering implements ClusteringAlgorithm {
  readonly name = "K-Means";

  cluster(items: TraceabilityId[], distanceMatrix: number[][]): Cluster[] {
    // 1. K個のクラスタ中心をランダムに初期化
    // 2. 各アイテムを最も近い中心に割り当て
    // 3. 中心を再計算
    // 4. 収束するまで繰り返し
  }
}
```

## CLI実装例

### src/cli.ts

```typescript
import { parseArgs } from "@std/cli/parse-args";
import { scanFiles } from "./core/scanner.ts";
import { extractIds } from "./core/extractor.ts";
import { createDistanceMatrix } from "./distance/calculator.ts";
import { LevenshteinDistance } from "./distance/levenshtein.ts";
import { JaroWinklerDistance } from "./distance/jaro_winkler.ts";
import { CosineDistance } from "./distance/cosine.ts";
import { StructuralDistance } from "./distance/structural.ts";
import { HierarchicalClustering } from "./clustering/hierarchical.ts";
import { KMeansClustering } from "./clustering/kmeans.ts";
import { DBSCANClustering } from "./clustering/dbscan.ts";
import type { DistanceCalculator } from "./distance/calculator.ts";
import type { ClusteringAlgorithm } from "./clustering/algorithm.ts";

async function main() {
  // 引数をパース
  const args = parseArgs(Deno.args, {
    string: ["algorithm", "distance", "format", "threshold", "k", "epsilon", "min-points"],
    default: {
      algorithm: "hierarchical",
      distance: "levenshtein",
      format: "json",
      threshold: "0.5",
      k: "0",
      epsilon: "0.3",
      "min-points": "2",
    },
  });

  // 必須引数のチェック
  if (args._.length < 2) {
    console.error("Usage: deno run --allow-read --allow-write src/cli.ts <input-dir> <output-file> [options]");
    Deno.exit(1);
  }

  const inputDir = String(args._[0]);
  const outputFile = String(args._[1]);

  // 距離計算器を選択
  const calculator: DistanceCalculator = getDistanceCalculator(args.distance);

  // クラスタリングアルゴリズムを選択
  const algorithm: ClusteringAlgorithm = getClusteringAlgorithm(args.algorithm, {
    threshold: parseFloat(args.threshold),
    k: parseInt(args.k),
    epsilon: parseFloat(args.epsilon),
    minPoints: parseInt(args["min-points"]),
  });

  // 1. ファイルをスキャン
  console.log(`Scanning files in: ${inputDir}`);
  const files = await scanFiles(inputDir);
  console.log(`Found ${files.length} markdown files`);

  // 2. IDを抽出
  console.log("Extracting traceability IDs...");
  const ids = await extractIds(files);
  console.log(`Extracted ${ids.length} IDs`);

  // 3. 距離行列を作成
  console.log(`Calculating distance matrix using: ${calculator.name}`);
  const matrix = createDistanceMatrix(
    ids.map(id => id.fullId),
    calculator
  );

  // 4. クラスタリング実行
  console.log(`Clustering using: ${algorithm.name}`);
  const clusters = algorithm.cluster(ids, matrix);
  console.log(`Created ${clusters.length} clusters`);

  // 5. 結果を出力
  console.log(`Writing results to: ${outputFile}`);
  await writeOutput(outputFile, { clusters, algorithm: algorithm.name, distanceCalculator: calculator.name }, args.format);

  console.log("Done!");
}

function getDistanceCalculator(name: string): DistanceCalculator {
  switch (name) {
    case "levenshtein":
      return new LevenshteinDistance();
    case "jaro-winkler":
      return new JaroWinklerDistance();
    case "cosine":
      return new CosineDistance();
    case "structural":
      return new StructuralDistance();
    default:
      throw new Error(`Unknown distance calculator: ${name}`);
  }
}

function getClusteringAlgorithm(name: string, options: any): ClusteringAlgorithm {
  switch (name) {
    case "hierarchical":
      return new HierarchicalClustering(options.threshold);
    case "kmeans":
      return new KMeansClustering(options.k);
    case "dbscan":
      return new DBSCANClustering(options.epsilon, options.minPoints);
    default:
      throw new Error(`Unknown clustering algorithm: ${name}`);
  }
}

async function writeOutput(filePath: string, result: any, format: string) {
  let content: string;

  switch (format) {
    case "json":
      content = JSON.stringify(result, null, 2);
      break;
    case "markdown":
      content = formatAsMarkdown(result);
      break;
    case "csv":
      content = formatAsCsv(result);
      break;
    default:
      throw new Error(`Unknown format: ${format}`);
  }

  await Deno.writeTextFile(filePath, content);
}

function formatAsMarkdown(result: any): string {
  // Markdown形式でフォーマット
  let md = `# Traceability ID Clustering Results\n\n`;
  md += `- Algorithm: ${result.algorithm}\n`;
  md += `- Distance Calculator: ${result.distanceCalculator}\n`;
  md += `- Total Clusters: ${result.clusters.length}\n\n`;

  result.clusters.forEach((cluster: any, index: number) => {
    md += `## Cluster ${index + 1} (${cluster.items.length} items)\n\n`;
    cluster.items.forEach((item: any) => {
      md += `- \`${item.fullId}\` - ${item.filePath}:${item.lineNumber}\n`;
    });
    md += `\n`;
  });

  return md;
}

function formatAsCsv(result: any): string {
  // CSV形式でフォーマット
  let csv = "ClusterID,TraceabilityID,FilePath,LineNumber,Level,Scope,Semantic,Hash,Version\n";

  result.clusters.forEach((cluster: any, clusterIndex: number) => {
    cluster.items.forEach((item: any) => {
      csv += `${clusterIndex + 1},${item.fullId},${item.filePath},${item.lineNumber},${item.level},${item.scope},${item.semantic},${item.hash},${item.version}\n`;
    });
  });

  return csv;
}

if (import.meta.main) {
  await main();
}
```

## ライブラリ使用例

### プログラムから使用する場合

```typescript
import { scanFiles } from "./core/scanner.ts";
import { extractIds } from "./core/extractor.ts";
import { LevenshteinDistance } from "./distance/levenshtein.ts";
import { HierarchicalClustering } from "./clustering/hierarchical.ts";
import { createDistanceMatrix } from "./distance/calculator.ts";

// 1. ファイルをスキャン
const files = await scanFiles("./data");

// 2. IDを抽出
const ids = await extractIds(files);

// 3. 距離計算器を選択
const calculator = new LevenshteinDistance();

// 4. 距離行列を作成
const matrix = createDistanceMatrix(
  ids.map(id => id.fullId),
  calculator
);

// 5. クラスタリングアルゴリズムを選択
const algorithm = new HierarchicalClustering(0.5);

// 6. クラスタリング実行
const clusters = algorithm.cluster(ids, matrix);

// 7. 結果を利用
console.log(clusters);
```

## 類似度検索の実装（新機能）

### search/similarity.ts

```typescript
import type { TraceabilityId, SimilarityItem, SimilaritySearchResult } from "../core/types.ts";
import type { DistanceCalculator } from "../distance/calculator.ts";

/**
 * 類似度検索を実行
 * @param query 検索クエリ文字列
 * @param ids 検索対象のID配列
 * @param calculator 距離計算器
 * @param options オプション（top: 上位N件, showDistance: 距離表示）
 * @returns 類似度順にソートされた結果
 */
export function searchSimilar(
  query: string,
  ids: TraceabilityId[],
  calculator: DistanceCalculator,
  options?: { top?: number }
): SimilaritySearchResult {
  // 1. 各IDとクエリの距離を計算
  const items: SimilarityItem[] = ids.map(id => ({
    id,
    distance: calculator.calculate(query, id.fullId),
  }));

  // 2. 距離でソート（昇順 = 近い順）
  items.sort((a, b) => a.distance - b.distance);

  // 3. 上位N件に絞る（オプション）
  const filteredItems = options?.top
    ? items.slice(0, options.top)
    : items;

  return {
    query,
    items: filteredItems,
    distanceCalculator: calculator.name,
  };
}

/**
 * クエリがIDの一部（semantic等）にマッチするか検索
 * @param query 検索キーワード
 * @param ids 検索対象のID配列
 * @returns マッチしたID配列
 */
export function searchByKeyword(
  query: string,
  ids: TraceabilityId[]
): TraceabilityId[] {
  const lowerQuery = query.toLowerCase();

  return ids.filter(id =>
    id.fullId.toLowerCase().includes(lowerQuery) ||
    id.semantic.toLowerCase().includes(lowerQuery) ||
    id.scope.toLowerCase().includes(lowerQuery)
  );
}
```

### 処理フロー（類似度検索モード）

1. **ファイルスキャン** - 通常のクラスタリングと同じ
2. **ID抽出** - 通常のクラスタリングと同じ
3. **距離計算** - クエリ vs 全ID（1対多）
4. **ソート** - 距離の昇順（近い順）
5. **フィルタリング** - 上位N件（オプション）
6. **出力** - simple形式 or JSON形式

### CLI実装の変更点

```typescript
// src/cli.ts に追加

async function main() {
  const args = parseArgs(Deno.args, {
    string: [
      "mode",          // 新規: cluster | search
      "query",         // 新規: 検索クエリ
      "top",           // 新規: 上位N件
      "algorithm",
      "distance",
      "format",
      // ...
    ],
    boolean: ["help", "show-distance"],  // 新規: 距離表示
    default: {
      mode: "cluster",
      algorithm: "hierarchical",
      distance: "levenshtein",
      format: "simple",
      // ...
    },
  });

  // モード判定
  if (args.mode === "search") {
    // 類似度検索モード
    if (!args.query) {
      console.error("Error: --query is required in search mode");
      Deno.exit(1);
    }
    await runSearchMode(args);
  } else {
    // クラスタリングモード
    await runClusterMode(args);
  }
}

async function runSearchMode(args: any) {
  // 1-2. ファイルスキャン & ID抽出（同じ）
  const files = await scanFiles(inputDir);
  const ids = await extractIds(files);

  // 3. 距離計算器を選択
  const calculator = getDistanceCalculator(args.distance);

  // 4. 類似度検索を実行
  const result = searchSimilar(
    args.query,
    ids,
    calculator,
    { top: args.top ? parseInt(args.top) : undefined }
  );

  // 5. 結果を出力
  const content = formatSearchResult(result, args.format, args["show-distance"]);
  await Deno.writeTextFile(outputFile, content);
}
```

## 拡張性

新しいアルゴリズムや距離計算手法を追加する場合：

1. `DistanceCalculator` または `ClusteringAlgorithm` インターフェースを実装
2. 対応するディレクトリに新しいファイルを追加
3. `mod.ts` でエクスポート

インターフェースを守れば、既存コードの変更なしに追加可能。

類似度検索機能は既存のクラスタリング機能とは独立したモードとして実装されるため、相互に影響しない。
