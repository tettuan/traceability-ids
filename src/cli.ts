import { parseArgs } from "jsr:@std/cli@^1.0.9/parse-args";
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
  console.log(`Traceability IDs - Extract and cluster traceability IDs from markdown files

USAGE:
  deno run --allow-read --allow-write src/cli.ts <input-dir> <output-file> [options]

ARGUMENTS:
  <input-dir>     Directory to scan for .md files (recursively scanned)
  <output-file>   Path where results will be written

GLOBAL OPTIONS:
  --mode <mode>           Execution mode (default: cluster)
                          • cluster - Group similar IDs into clusters
                          • search  - Find IDs similar to a query

  --distance <name>       Distance calculation method (default: levenshtein)
                          • levenshtein  - Edit distance (simple, general-purpose)
                          • jaro-winkler - Prefix-weighted similarity
                          • cosine       - N-gram based similarity
                          • structural   - Component-aware (RECOMMENDED for scope grouping)

  --format <format>       Output format (default: simple)
                          • simple           - Unique ID list, one per line
                          • simple-clustered - IDs grouped by cluster
                          • json            - Full structured data
                          • markdown        - Human-readable report
                          • csv             - Spreadsheet-compatible

  --help                  Show this help message

CLUSTERING MODE OPTIONS:
  --algorithm <name>      Algorithm to use (default: hierarchical)
                          • hierarchical - Agglomerative clustering (bottom-up)
                          • kmeans       - Partition-based clustering
                          • dbscan       - Density-based clustering

  --threshold <number>    Distance threshold for hierarchical (default: 10)
                          IDs within this distance will be merged into clusters

  --k <number>            Number of clusters for K-Means (default: 0 = auto)
                          0 means automatic estimation based on dataset size

  --epsilon <number>      Neighborhood radius for DBSCAN (default: 0.3)
                          Defines the maximum distance between cluster members

  --min-points <number>   Minimum points for DBSCAN core (default: 2)
                          Minimum neighbors required to form a dense region

SEARCH MODE OPTIONS:
  --query <string>        Search query (REQUIRED in search mode)
                          Can be a full ID, keyword, or partial match

  --top <number>          Return only top N results (default: all)
                          Limits output to most similar matches

  --show-distance         Include distance scores in output (default: false)
                          Useful for understanding similarity rankings

EXAMPLES:

  Clustering Examples:

    # Basic clustering - finds similar IDs and groups them
    deno run --allow-read --allow-write src/cli.ts ./docs ./output/ids.txt

    # Group IDs by scope using structural distance (recommended)
    deno run --allow-read --allow-write src/cli.ts ./docs ./output/ids.txt \\
      --distance structural --threshold 0.3

    # Create exactly 5 clusters using K-Means
    deno run --allow-read --allow-write src/cli.ts ./docs ./output/ids.txt \\
      --algorithm kmeans --k 5

    # Density-based clustering to find natural groups
    deno run --allow-read --allow-write src/cli.ts ./docs ./output/ids.txt \\
      --algorithm dbscan --epsilon 0.3 --min-points 2

    # Output with cluster boundaries visible
    deno run --allow-read --allow-write src/cli.ts ./docs ./output/ids.txt \\
      --format simple-clustered

  Search Examples:

    # Find IDs related to "security" (top 10 most similar)
    deno run --allow-read --allow-write src/cli.ts ./docs ./output/security.txt \\
      --mode search --query "security" --top 10

    # Search with similarity scores shown
    deno run --allow-read --allow-write src/cli.ts ./docs ./output/security.txt \\
      --mode search --query "security" --show-distance

    # Find IDs similar to a specific ID
    deno run --allow-read --allow-write src/cli.ts ./docs ./output/similar.txt \\
      --mode search --query "req:apikey:security-4f7b2e#20251111a"

    # Structural search (better for finding same-scope IDs)
    deno run --allow-read --allow-write src/cli.ts ./docs ./output/similar.txt \\
      --mode search --query "encryption" --distance structural --top 20

    # Get detailed JSON output for programmatic use
    deno run --allow-read --allow-write src/cli.ts ./docs ./output/results.json \\
      --mode search --query "auth" --format json

DISTANCE CALCULATION GUIDE:

  Choose the right distance calculator for your use case:

  • Use 'structural' when you want to group IDs by scope or structure
    Example: Group all "req:apikey:*" IDs together

  • Use 'levenshtein' for general-purpose similarity
    Example: Find typos or similar naming patterns

  • Use 'jaro-winkler' to emphasize prefix matching
    Example: Group IDs that start similarly

  • Use 'cosine' for substring similarity
    Example: Find IDs with common word parts

TRACEABILITY ID FORMAT:

  Pattern: {level}:{scope}:{semantic}-{hash}#{version}
  Example: req:apikey:security-4f7b2e#20251111a

  Components:
    • level    : Requirement type (e.g., req, design, test)
    • scope    : Feature area (e.g., apikey, dashboard)
    • semantic : Description (e.g., security, encryption)
    • hash     : Unique identifier
    • version  : Version or date

For more information, see: https://github.com/your-repo/traceability-ids
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
