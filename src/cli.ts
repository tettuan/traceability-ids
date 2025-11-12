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
  # Cluster mode (default entry point)
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids <input-dir> <output-file> [options]

  # Search mode (use /search subpath)
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search <input-dir> <output-file> --query <query> [options]

  # Extract mode (use /extract subpath)
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract <input-dir> <output-file> --ids <ids> [options]

ARGUMENTS:
  <input-dir>     Directory to scan for .md files (recursively scanned)
  <output-file>   Path where results will be written

CLUSTER MODE OPTIONS:
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
  # Default: Hierarchical clustering with structural distance
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids \\
    ./docs ./output/clusters.txt

  # Custom threshold for finer clusters
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids \\
    ./docs ./output/clusters.txt --threshold 0.2

  # K-means clustering with 5 groups, JSON output
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids \\
    ./docs ./output/clusters.json \\
    --algorithm kmeans --k 5 --format json

  # DBSCAN with cosine distance for keyword-based grouping
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids \\
    ./docs ./output/clusters.txt \\
    --algorithm dbscan --distance cosine --epsilon 0.4

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
  if (args._.length < 2) {
    console.error("Error: Missing required arguments\n");
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
      outputFile: String(args._[1]),
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
