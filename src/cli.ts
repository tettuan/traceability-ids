/**
 * CLI tool for extracting and clustering traceability IDs from markdown files.
 *
 * Supports multiple clustering algorithms (hierarchical, k-means, DBSCAN) and
 * distance calculation methods (Levenshtein, Jaro-Winkler, Cosine, Structural).
 *
 * @example
 * ```bash
 * # Extract and cluster IDs from markdown files
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./docs
 *
 * # Output with cluster boundaries
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./docs --format simple-clustered
 * ```
 *
 * @module
 */

import { parseArgs } from "jsr:@std/cli@^1.0.9/parse-args";
import { runClusterMode } from "./modes/cluster.ts";
import type { ClusteringOptions } from "./cli/clustering-factory.ts";

/**
 * 使用方法を表示
 */
function showUsage() {
  console.log(
    `Traceability IDs - Extract and cluster traceability IDs from markdown files

USAGE:
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids [options] <input-dir>

  # Search mode (use /search subpath)
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search [options] <input-dir>

  # Extract mode (use /extract subpath)
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract [options] <input-dir>

ARGUMENTS:
  <input-dir>     Directory to scan for .md files (recursively scanned)

CLUSTER MODE OPTIONS:
  --output <file>         Output file path (default: STDOUT)
  --distance <name>       Distance calculation method (default: structural)
                          • levenshtein  - Edit distance (simple, general-purpose)
                          • jaro-winkler - Prefix-weighted similarity
                          • cosine       - N-gram based (BEST for keyword search)
                          • structural   - Component-aware (BEST for scope grouping)

  --format <format>       Output format (default: simple)
                          • simple           - Unique ID list, one per line
                          • simple-clustered - IDs grouped by cluster
                          • json            - Full structured data
                          • markdown        - Human-readable report
                          • csv             - Spreadsheet-compatible

  --algorithm <name>      Clustering algorithm (default: hierarchical)
                          • hierarchical - Builds tree-like clusters (threshold-based)
                          • kmeans       - Partitions into k groups
                          • dbscan       - Density-based clustering

  --threshold <number>    Distance threshold for hierarchical clustering (default: 0.3)
                          Lower = stricter clusters (more fine-grained)

  --k <number>            Number of clusters for k-means (default: auto)
                          0 = auto-detect optimal k

  --epsilon <number>      Maximum distance for DBSCAN neighborhood (default: 0.3)
  --min-points <number>   Minimum neighbors for DBSCAN core points (default: 2)

  --help                  Show this help message

EXAMPLES:
  # Output to STDOUT
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids ./docs

  # Output to file
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids \\
    ./docs --output clusters.txt

  # Custom threshold for finer clusters
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids \\
    --threshold 0.2 ./docs --output clusters.txt

  # K-means clustering with 5 groups, JSON output
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids \\
    --algorithm kmeans --k 5 --format json ./docs

  # Options can be in any order
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids \\
    --algorithm dbscan ./docs --distance cosine --epsilon 0.4
`,
  );
}

/**
 * メイン関数
 */
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
      "output",
    ],
    boolean: ["help"],
    default: {
      algorithm: "hierarchical",
      distance: "structural",
      format: "simple",
      threshold: "0.3", // structuralに最適化
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
  if (args._.length < 1) {
    console.error("Error: Missing required argument <input-dir>\n");
    showUsage();
    Deno.exit(1);
  }

  try {
    const clusteringOptions: ClusteringOptions = {
      threshold: parseFloat(args.threshold),
      k: parseInt(args.k),
      epsilon: parseFloat(args.epsilon),
      minPoints: parseInt(args["min-points"]),
    };

    await runClusterMode({
      inputDir: String(args._[0]),
      outputFile: args.output ? String(args.output) : undefined,
      algorithm: args.algorithm,
      distance: args.distance,
      format: args.format as
        | "json"
        | "markdown"
        | "csv"
        | "simple"
        | "simple-clustered",
      clusteringOptions,
    });
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
