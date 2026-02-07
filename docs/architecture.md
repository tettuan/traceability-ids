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

- **`--algorithm <name>`** - クラスタリングアルゴリズム（デフォルト:
  hierarchical）
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
  calculator: DistanceCalculator,
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
import type { Cluster, TraceabilityId } from "../core/types.ts";

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
    string: [
      "algorithm",
      "distance",
      "format",
      "threshold",
      "k",
      "epsilon",
      "min-points",
    ],
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
    console.error(
      "Usage: deno run --allow-read --allow-write src/cli.ts <input-dir> <output-file> [options]",
    );
    Deno.exit(1);
  }

  const inputDir = String(args._[0]);
  const outputFile = String(args._[1]);

  // 距離計算器を選択
  const calculator: DistanceCalculator = getDistanceCalculator(args.distance);

  // クラスタリングアルゴリズムを選択
  const algorithm: ClusteringAlgorithm = getClusteringAlgorithm(
    args.algorithm,
    {
      threshold: parseFloat(args.threshold),
      k: parseInt(args.k),
      epsilon: parseFloat(args.epsilon),
      minPoints: parseInt(args["min-points"]),
    },
  );

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
    ids.map((id) => id.fullId),
    calculator,
  );

  // 4. クラスタリング実行
  console.log(`Clustering using: ${algorithm.name}`);
  const clusters = algorithm.cluster(ids, matrix);
  console.log(`Created ${clusters.length} clusters`);

  // 5. 結果を出力
  console.log(`Writing results to: ${outputFile}`);
  await writeOutput(outputFile, {
    clusters,
    algorithm: algorithm.name,
    distanceCalculator: calculator.name,
  }, args.format);

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

function getClusteringAlgorithm(
  name: string,
  options: any,
): ClusteringAlgorithm {
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
      csv += `${
        clusterIndex + 1
      },${item.fullId},${item.filePath},${item.lineNumber},${item.level},${item.scope},${item.semantic},${item.hash},${item.version}\n`;
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
  ids.map((id) => id.fullId),
  calculator,
);

// 5. クラスタリングアルゴリズムを選択
const algorithm = new HierarchicalClustering(0.5);

// 6. クラスタリング実行
const clusters = algorithm.cluster(ids, matrix);

// 7. 結果を利用
console.log(clusters);
```

## 類似度検索の実装

### search/similarity.ts

```typescript
import type { SimilarityItem, SimilaritySearchResult, TraceabilityId } from "../core/types.ts";
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
  options?: { top?: number },
): SimilaritySearchResult {
  // 1. 各IDとクエリの距離を計算
  const items: SimilarityItem[] = ids.map((id) => ({
    id,
    distance: calculator.calculate(query, id.fullId),
  }));

  // 2. 距離でソート（昇順 = 近い順）
  items.sort((a, b) => a.distance - b.distance);

  // 3. 上位N件に絞る（オプション）
  const filteredItems = options?.top ? items.slice(0, options.top) : items;

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
  ids: TraceabilityId[],
): TraceabilityId[] {
  const lowerQuery = query.toLowerCase();

  return ids.filter((id) =>
    id.fullId.toLowerCase().includes(lowerQuery) ||
    id.semantic.toLowerCase().includes(lowerQuery) ||
    id.scope.toLowerCase().includes(lowerQuery)
  );
}
```

## コンテキスト抽出の実装（Extract Mode - 新機能）

**目的**: 指定されたIDをファイルから検索し、該当箇所の前後行を抽出（grep -A -B
のようなイメージ）

**類似度検索（Search Mode）との違い**:

- Search Mode: ID間の距離計算 → 類似したIDを探す → ID一覧のみ返す
- Extract Mode: IDでファイル検索 → 該当行を特定 → 前後のテキストを返す

### モジュール構成の追加

```
src/
├── extract/                  # コンテキスト抽出（新規）
│   ├── context.ts           # ファイル検索とコンテキスト抽出ロジック
│   └── loader.ts            # ID一覧の読み込み（コマンドライン or ファイル）
```

### core/types.ts への型追加

```typescript
/**
 * コンテキスト抽出リクエスト
 */
export interface ContextExtractionRequest {
  /** 抽出対象のID一覧 */
  ids: string[];
  /** 該当行の前に取得する行数 */
  before: number;
  /** 該当行の後に取得する行数 */
  after: number;
}

/**
 * 位置ごとのコンテキスト情報
 */
export interface LocationContext {
  /** ファイルパス */
  filePath: string;
  /** 行番号（1-indexed） */
  lineNumber: number;
  /** 該当行の内容 */
  targetLine: string;
  /** 該当行より前の行（配列の順序は古い順） */
  beforeLines: { lineNumber: number; content: string }[];
  /** 該当行より後の行（配列の順序は新しい順） */
  afterLines: { lineNumber: number; content: string }[];
}

/**
 * ID ごとの抽出コンテキスト
 */
export interface ExtractedContext {
  /** 対象のID */
  id: string;
  /** 該当箇所の配列（複数ファイルに出現する可能性） */
  locations: LocationContext[];
}

/**
 * コンテキスト抽出の全体結果
 */
export interface ContextExtractionResult {
  /** 抽出リクエスト */
  request: ContextExtractionRequest;
  /** ID ごとの抽出結果 */
  contexts: ExtractedContext[];
  /** 見つからなかったID */
  notFound: string[];
}
```

### extract/context.ts

```typescript
import type {
  ContextExtractionRequest,
  ContextExtractionResult,
  ExtractedContext,
  LocationContext,
  TraceabilityId,
} from "../core/types.ts";

/**
 * 指定されたIDのコンテキストを抽出
 * @param request 抽出リクエスト
 * @param ids 抽出済みのトレーサビリティID配列
 * @returns コンテキスト抽出結果
 */
export async function extractContext(
  request: ContextExtractionRequest,
  ids: TraceabilityId[],
): Promise<ContextExtractionResult> {
  const contexts: ExtractedContext[] = [];
  const notFound: string[] = [];

  // 各IDについて処理
  for (const targetId of request.ids) {
    // 該当するIDを検索
    const matchedIds = ids.filter((id) => id.fullId === targetId);

    if (matchedIds.length === 0) {
      notFound.push(targetId);
      continue;
    }

    // 各出現箇所についてコンテキストを抽出
    const locations: LocationContext[] = [];
    for (const matched of matchedIds) {
      const context = await extractLocationContext(
        matched.filePath,
        matched.lineNumber,
        request.before,
        request.after,
      );
      locations.push(context);
    }

    contexts.push({
      id: targetId,
      locations,
    });
  }

  return {
    request,
    contexts,
    notFound,
  };
}

/**
 * 特定のファイル・行番号からコンテキストを抽出
 * @param filePath ファイルパス
 * @param lineNumber 対象行番号（1-indexed）
 * @param before 前N行（最大50）
 * @param after 後M行（最大50）
 * @returns 位置コンテキスト
 */
async function extractLocationContext(
  filePath: string,
  lineNumber: number,
  before: number,
  after: number,
): Promise<LocationContext> {
  // 制約チェック
  const MAX_LINES = 50;
  const MAX_LINE_LENGTH = 300;
  before = Math.min(before, MAX_LINES);
  after = Math.min(after, MAX_LINES);

  // ファイル全体を読み込み
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");

  // 行番号を配列インデックスに変換（1-indexed → 0-indexed）
  const targetIndex = lineNumber - 1;

  // 範囲を計算（境界チェック）
  const startIndex = Math.max(0, targetIndex - before);
  const endIndex = Math.min(lines.length - 1, targetIndex + after);

  // 前の行を抽出（文字数制限、空行整形）
  const beforeLines = [];
  for (let i = startIndex; i < targetIndex; i++) {
    beforeLines.push({
      lineNumber: i + 1,
      content: truncateLine(lines[i], MAX_LINE_LENGTH),
    });
  }

  // 該当行（文字数制限）
  const targetLine = truncateLine(lines[targetIndex], MAX_LINE_LENGTH);

  // 後の行を抽出（文字数制限、空行整形）
  const afterLines = [];
  for (let i = targetIndex + 1; i <= endIndex; i++) {
    afterLines.push({
      lineNumber: i + 1,
      content: truncateLine(lines[i], MAX_LINE_LENGTH),
    });
  }

  // 連続した空行を削除
  const cleanedBeforeLines = removeConsecutiveEmptyLines(beforeLines);
  const cleanedAfterLines = removeConsecutiveEmptyLines(afterLines);

  return {
    filePath,
    lineNumber,
    targetLine,
    beforeLines: cleanedBeforeLines,
    afterLines: cleanedAfterLines,
  };
}

/**
 * 行を指定文字数で切り詰める（マルチバイト対応）
 * @param line 元の行
 * @param maxLength 最大文字数
 * @returns 切り詰められた行
 */
function truncateLine(line: string, maxLength: number): string {
  if (line.length <= maxLength) {
    return line;
  }
  return line.substring(0, maxLength) + "...";
}

/**
 * 連続した空行を1つにまとめる
 * @param lines 行配列
 * @returns 整形された行配列
 */
function removeConsecutiveEmptyLines(
  lines: { lineNumber: number; content: string }[],
): { lineNumber: number; content: string }[] {
  const result: { lineNumber: number; content: string }[] = [];
  let previousWasEmpty = false;

  for (const line of lines) {
    const isEmpty = line.content.trim() === "";

    if (isEmpty) {
      if (!previousWasEmpty) {
        result.push(line);
        previousWasEmpty = true;
      }
      // 連続する空行はスキップ
    } else {
      result.push(line);
      previousWasEmpty = false;
    }
  }

  return result;
}
```

### extract/loader.ts

```typescript
/**
 * ID一覧を読み込む
 * @param source コマンドライン引数文字列、またはファイルパス
 * @returns ID配列
 */
export async function loadIds(
  source: string,
  isFile: boolean,
): Promise<string[]> {
  if (isFile) {
    // ファイルから読み込み
    const content = await Deno.readTextFile(source);
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } else {
    // スペース区切りで分割
    return source.split(/\s+/).filter((id) => id.length > 0);
  }
}
```

### formatter への追加（context フォーマット）

````typescript
import type { ContextExtractionResult, ExtractedContext, LocationContext } from "../core/types.ts";

/**
 * コンテキスト抽出結果を Markdown 形式でフォーマット
 */
export function formatContextAsMarkdown(
  result: ContextExtractionResult,
): string {
  let md = "# Context Extraction Results\n\n";
  md += `- Before lines: ${result.request.before}\n`;
  md += `- After lines: ${result.request.after}\n`;
  md += `- Total IDs requested: ${result.request.ids.length}\n`;
  md += `- Found: ${result.contexts.length}\n`;
  md += `- Not found: ${result.notFound.length}\n\n`;

  // 見つからなかったIDを表示
  if (result.notFound.length > 0) {
    md += "## Not Found\n\n";
    result.notFound.forEach((id) => {
      md += `- ${id}\n`;
    });
    md += "\n";
  }

  // 各IDのコンテキストを表示
  result.contexts.forEach((context) => {
    md += formatExtractedContextAsMarkdown(context);
  });

  return md;
}

/**
 * 単一IDのコンテキストをMarkdown形式でフォーマット
 */
function formatExtractedContextAsMarkdown(context: ExtractedContext): string {
  let md = `## ID: ${context.id}\n\n`;

  context.locations.forEach((location) => {
    md += `### Location: ${location.filePath}:${location.lineNumber}\n\n`;
    md += "```\n";

    // 前の行
    location.beforeLines.forEach((line) => {
      md += `${line.lineNumber}: ${line.content}\n`;
    });

    // 該当行（ハイライト）
    md += `>>> ${location.lineNumber}: ${location.targetLine}\n`;

    // 後の行
    location.afterLines.forEach((line) => {
      md += `${line.lineNumber}: ${line.content}\n`;
    });

    md += "```\n\n";
  });

  return md;
}

/**
 * コンテキスト抽出結果を JSON 形式でフォーマット
 */
export function formatContextAsJson(
  result: ContextExtractionResult,
): string {
  return JSON.stringify(result, null, 2);
}

/**
 * コンテキスト抽出結果をシンプルテキスト形式でフォーマット
 */
export function formatContextAsSimple(
  result: ContextExtractionResult,
): string {
  let text = "";

  result.contexts.forEach((context) => {
    context.locations.forEach((location) => {
      text += `${location.filePath}:${location.lineNumber}: ${context.id}\n`;
    });
  });

  return text;
}
````

### 処理フロー（類似度検索モード）

1. **ファイルスキャン** - 通常のクラスタリングと同じ
2. **ID抽出** - 通常のクラスタリングと同じ
3. **距離計算** - クエリ vs 全ID（1対多）
4. **ソート** - 距離の昇順（近い順）
5. **フィルタリング** - 上位N件（オプション）
6. **出力** - simple形式 or JSON形式

### CLI実装の変更点（3モード対応）

```typescript
// src/cli.ts に追加

async function main() {
  const args = parseArgs(Deno.args, {
    string: [
      "mode", // cluster | search | extract
      "query", // 検索クエリ（search モード）
      "top", // 上位N件（search モード）
      "ids", // ID一覧（extract モード）
      "ids-file", // IDファイル（extract モード）
      "before", // 前N行（extract モード）
      "after", // 後M行（extract モード）
      "algorithm",
      "distance",
      "format",
      "threshold",
      "k",
      "epsilon",
      "min-points",
    ],
    boolean: ["help", "show-distance"],
    default: {
      mode: "cluster",
      algorithm: "hierarchical",
      distance: "levenshtein",
      format: "simple",
      before: "3",
      after: "10",
      threshold: "10",
      k: "0",
      epsilon: "0.3",
      "min-points": "2",
    },
  });

  // ヘルプ表示
  if (args.help) {
    showUsage();
    Deno.exit(0);
  }

  // モード判定
  if (args.mode === "search") {
    // 類似度検索モード
    if (!args.query) {
      console.error("Error: --query is required in search mode");
      Deno.exit(1);
    }
    await runSearchMode(args);
  } else if (args.mode === "extract") {
    // コンテキスト抽出モード（新機能）
    if (!args.ids && !args["ids-file"]) {
      console.error("Error: --ids or --ids-file is required in extract mode");
      Deno.exit(1);
    }
    await runExtractMode(args);
  } else {
    // クラスタリングモード（デフォルト）
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
    { top: args.top ? parseInt(args.top) : undefined },
  );

  // 5. 結果を出力
  const content = formatSearchResult(
    result,
    args.format,
    args["show-distance"],
  );
  await Deno.writeTextFile(outputFile, content);
}

async function runExtractMode(args: any) {
  try {
    console.log(`Extract mode`);

    // 1. ID一覧を読み込み
    const targetIds = await loadIds(
      args.ids || args["ids-file"],
      Boolean(args["ids-file"]),
    );
    console.log(`Target IDs: ${targetIds.length}`);

    // 2. ファイルスキャン & ID抽出
    console.log(`Scanning files in: ${inputDir}`);
    const files = await scanFiles(inputDir);
    console.log(`Found ${files.length} markdown files`);

    console.log("Extracting traceability IDs...");
    const ids = await extractIds(files);
    console.log(`Extracted ${ids.length} IDs`);

    // 3. コンテキスト抽出を実行
    console.log("Extracting context...");
    const request: ContextExtractionRequest = {
      ids: targetIds,
      before: parseInt(args.before),
      after: parseInt(args.after),
    };
    const result = await extractContext(request, ids);
    console.log(`Found ${result.contexts.length} IDs`);
    console.log(`Not found: ${result.notFound.length} IDs`);

    // 4. 結果を出力
    console.log(`Writing results to: ${outputFile}`);
    const content = formatContextResult(result, args.format);
    await Deno.writeTextFile(outputFile, content);

    console.log("Done!");
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}

function formatContextResult(
  result: ContextExtractionResult,
  format: string,
): string {
  switch (format) {
    case "json":
      return formatContextAsJson(result);
    case "markdown":
      return formatContextAsMarkdown(result);
    case "simple":
      return formatContextAsSimple(result);
    default:
      return formatContextAsMarkdown(result);
  }
}
```

### ヘルプメッセージへの追加

```typescript
function showUsage() {
  console.log(`
USAGE:
  deno run --allow-read [--allow-write] src/cli.ts <input-dir> <output-file> [options]

ARGUMENTS:
  <input-dir>     Directory to scan for .md files (recursively scanned)
  <output-file>   Path where results will be written

GLOBAL OPTIONS:
  --mode <mode>           Execution mode (default: cluster)
                          • cluster - Group similar IDs into clusters
                          • search  - Find IDs similar to a query
                          • extract - Extract context around specific IDs (NEW)

  --format <format>       Output format (default: simple)
                          • simple           - Simple output
                          • json            - Full structured data
                          • markdown        - Human-readable report

  --help                  Show this help message

CLUSTERING MODE OPTIONS:
  (same as before...)

SEARCH MODE OPTIONS:
  (same as before...)

EXTRACT MODE OPTIONS (NEW):
  --ids <string>          Space-separated list of IDs to extract
                          Example: "req:apikey:security-4f7b2e#20251111a req:auth:login-abc123#v1"

  --ids-file <path>       Path to file containing IDs (one per line)
                          Alternative to --ids option

  --before <number>       Number of lines before target line (default: 3)
                          Context lines to include before the matched line

  --after <number>        Number of lines after target line (default: 10)
                          Context lines to include after the matched line

EXTRACT MODE EXAMPLES (NEW):

  # Extract context for a single ID
  deno run --allow-read src/cli.ts ./docs ./output/context.md \\
    --mode extract \\
    --ids "req:apikey:security-4f7b2e#20251111a" \\
    --before 3 \\
    --after 10

  # Extract context for multiple IDs
  deno run --allow-read src/cli.ts ./docs ./output/context.md \\
    --mode extract \\
    --ids "req:apikey:security-4f7b2e#20251111a req:apikey:encryption-6d3a9c#20251111a"

  # Extract from ID list file
  deno run --allow-read src/cli.ts ./docs ./output/context.md \\
    --mode extract \\
    --ids-file ./ids-to-extract.txt \\
    --before 5 \\
    --after 15

  # Output as JSON
  deno run --allow-read src/cli.ts ./docs ./output/context.json \\
    --mode extract \\
    --ids "req:apikey:security-4f7b2e#20251111a" \\
    --format json

  # Pipeline: search then extract
  # 1. Search for similar IDs
  deno run --allow-read --allow-write src/cli.ts ./docs ./tmp/similar.txt \\
    --mode search \\
    --query "security" \\
    --top 5 \\
    --format simple

  # 2. Extract context for found IDs
  deno run --allow-read src/cli.ts ./docs ./output/context.md \\
    --mode extract \\
    --ids-file ./tmp/similar.txt
  `);
}
```

## 拡張性

新しいアルゴリズムや距離計算手法を追加する場合：

1. `DistanceCalculator` または `ClusteringAlgorithm` インターフェースを実装
2. 対応するディレクトリに新しいファイルを追加
3. `mod.ts` でエクスポート

インターフェースを守れば、既存コードの変更なしに追加可能。

### 3つのモードの独立性と役割

| モード      | 役割               | 入力         | 処理                          | 出力                      |
| ----------- | ------------------ | ------------ | ----------------------------- | ------------------------- |
| **cluster** | IDをグループ化     | ディレクトリ | 距離行列作成 + クラスタリング | クラスタ化されたID一覧    |
| **search**  | 類似IDを探す       | クエリ文字列 | 距離計算（クエリ vs 全ID）    | 類似度順のID一覧          |
| **extract** | IDの使用箇所を探す | ID一覧       | ファイル検索（grep的）        | 該当箇所 + 前後のテキスト |

各モードは互いに影響を与えず、独立して拡張・保守可能。

### パイプライン的な使用

各モードは独立しているが、組み合わせて使用することで強力なワークフローを実現：

1. **cluster → extract**: クラスタリング結果から特定クラスタのIDを抽出 →
   実際の使用箇所をgrep的に検索
2. **search → extract**: "security"に類似したIDを距離計算で探す →
   見つかったIDの実際の使用箇所を検索
3. **extract のみ**: 既知のIDリストの使用箇所を一括で grep 的に検索

## モジュール構成の全体像（新機能含む）

```
src/
├── core/
│   ├── types.ts              # 共通型定義（新型追加）
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
├── search/
│   └── similarity.ts         # 類似度検索実装
├── extract/                  # コンテキスト抽出（新規）
│   ├── context.ts           # コンテキスト抽出ロジック
│   └── loader.ts            # ID一覧の読み込み
├── formatter/
│   ├── formatter.ts          # 出力フォーマッター（context対応追加）
│   └── simple.ts             # シンプル形式
├── cli.ts                    # CLIエントリポイント（3モード対応）
└── mod.ts                    # ライブラリエントリポイント（新エクスポート追加）
```
