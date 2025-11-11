import { parseArgs } from "jsr:@std/cli/parse-args";
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
import { formatResult, formatSearchResult } from "./formatter/formatter.ts";
import { searchSimilar } from "./search/similarity.ts";
import type { DistanceCalculator } from "./distance/calculator.ts";
import type { ClusteringAlgorithm } from "./clustering/algorithm.ts";
import type { ClusteringResult } from "./core/types.ts";

/**
 * 距離計算器を取得
 */
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
      throw new Error(
        `Unknown distance calculator: ${name}. Available: levenshtein, jaro-winkler, cosine, structural`,
      );
  }
}

/**
 * クラスタリングアルゴリズムを取得
 */
function getClusteringAlgorithm(
  name: string,
  options: {
    threshold: number;
    k: number;
    epsilon: number;
    minPoints: number;
  },
): ClusteringAlgorithm {
  switch (name) {
    case "hierarchical":
      return new HierarchicalClustering(options.threshold);
    case "kmeans":
      return new KMeansClustering(options.k);
    case "dbscan":
      return new DBSCANClustering(options.epsilon, options.minPoints);
    default:
      throw new Error(
        `Unknown clustering algorithm: ${name}. Available: hierarchical, kmeans, dbscan`,
      );
  }
}

/**
 * 使用方法を表示
 */
function showUsage() {
  console.log(`Usage: deno run --allow-read --allow-write src/cli.ts <input-dir> <output-file> [options]

Arguments:
  <input-dir>     Input directory to scan for .md files
  <output-file>   Output file path for results

Options (Common):
  --mode <mode>           Execution mode (default: cluster)
                          Available: cluster, search
  --distance <name>       Distance calculator (default: levenshtein)
                          Available: levenshtein, jaro-winkler, cosine, structural
  --format <format>       Output format (default: simple)
                          Available: simple, simple-clustered, json, markdown, csv

Options (Clustering Mode):
  --algorithm <name>      Clustering algorithm (default: hierarchical)
                          Available: hierarchical, kmeans, dbscan
  --threshold <number>    Threshold for hierarchical clustering (default: 10)
  --k <number>            Number of clusters for K-Means (default: 0 = auto)
  --epsilon <number>      Radius for DBSCAN (default: 0.3)
  --min-points <number>   Minimum points for DBSCAN (default: 2)

Options (Search Mode):
  --query <string>        Search query (required in search mode)
  --top <number>          Return only top N results (default: all)
  --show-distance         Show distance scores (default: false)

Examples (Clustering Mode):
  # Basic usage - simple ID list
  deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt

  # Using structural distance for scope-based grouping
  deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt \\
    --distance structural --threshold 0.3

  # K-Means clustering with 5 clusters
  deno run --allow-read --allow-write src/cli.ts ./data ./output/ids.txt \\
    --algorithm kmeans --k 5

Examples (Search Mode):
  # Search for IDs similar to "security"
  deno run --allow-read --allow-write src/cli.ts ./data ./output/similar.txt \\
    --mode search --query "security" --top 10

  # Search with distance scores
  deno run --allow-read --allow-write src/cli.ts ./data ./output/similar.txt \\
    --mode search --query "encryption" --show-distance

  # Search using structural distance
  deno run --allow-read --allow-write src/cli.ts ./data ./output/similar.txt \\
    --mode search --query "req:apikey:security-4f7b2e#20251111a" \\
    --distance structural --top 20
`);
}

/**
 * メイン関数
 */
async function main() {
  // 引数をパース
  const args = parseArgs(Deno.args, {
    string: [
      "mode",
      "query",
      "top",
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

  // 必須引数のチェック
  if (args._.length < 2) {
    console.error("Error: Missing required arguments\n");
    showUsage();
    Deno.exit(1);
  }

  const inputDir = String(args._[0]);
  const outputFile = String(args._[1]);

  // モード判定
  if (args.mode === "search") {
    await runSearchMode(args, inputDir, outputFile);
  } else {
    await runClusterMode(args, inputDir, outputFile);
  }
}

/**
 * クラスタリングモードを実行
 */
async function runClusterMode(
  // deno-lint-ignore no-explicit-any
  args: any,
  inputDir: string,
  outputFile: string,
) {
  try {
    // 距離計算器を選択
    console.log(`Distance calculator: ${args.distance}`);
    const calculator: DistanceCalculator = getDistanceCalculator(args.distance);

    // クラスタリングアルゴリズムを選択
    console.log(`Clustering algorithm: ${args.algorithm}`);
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

    if (files.length === 0) {
      console.warn("No markdown files found");
      Deno.exit(0);
    }

    // 2. IDを抽出
    console.log("Extracting traceability IDs...");
    const ids = await extractIds(files);
    console.log(`Extracted ${ids.length} IDs`);

    if (ids.length === 0) {
      console.warn("No traceability IDs found");
      Deno.exit(0);
    }

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

    // 結果を構造化
    const result: ClusteringResult = {
      clusters,
      algorithm: algorithm.name,
      distanceCalculator: calculator.name,
    };

    // 5. 結果を出力
    console.log(`Writing results to: ${outputFile}`);
    const content = formatResult(
      result,
      args.format as "json" | "markdown" | "csv" | "simple" | "simple-clustered",
    );
    await Deno.writeTextFile(outputFile, content);

    console.log("Done!");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}

/**
 * 類似度検索モードを実行
 */
async function runSearchMode(
  // deno-lint-ignore no-explicit-any
  args: any,
  inputDir: string,
  outputFile: string,
) {
  try {
    // クエリのチェック
    if (!args.query) {
      console.error("Error: --query is required in search mode\n");
      showUsage();
      Deno.exit(1);
    }

    console.log(`Search mode`);
    console.log(`Query: ${args.query}`);

    // 距離計算器を選択
    console.log(`Distance calculator: ${args.distance}`);
    const calculator: DistanceCalculator = getDistanceCalculator(args.distance);

    // 1. ファイルをスキャン
    console.log(`Scanning files in: ${inputDir}`);
    const files = await scanFiles(inputDir);
    console.log(`Found ${files.length} markdown files`);

    if (files.length === 0) {
      console.warn("No markdown files found");
      Deno.exit(0);
    }

    // 2. IDを抽出
    console.log("Extracting traceability IDs...");
    const ids = await extractIds(files);
    console.log(`Extracted ${ids.length} IDs`);

    if (ids.length === 0) {
      console.warn("No traceability IDs found");
      Deno.exit(0);
    }

    // 3. 類似度検索を実行
    console.log("Searching for similar IDs...");
    const result = searchSimilar(
      args.query,
      ids,
      calculator,
      { top: args.top ? parseInt(args.top) : undefined },
    );
    console.log(`Found ${result.items.length} results`);

    // 4. 結果を出力
    console.log(`Writing results to: ${outputFile}`);
    const content = formatSearchResult(
      result,
      args.format as "json" | "markdown" | "csv" | "simple",
      args["show-distance"] === true,
    );
    await Deno.writeTextFile(outputFile, content);

    console.log("Done!");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
