#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Graph mode for 3D visualization of traceability ID relationships.
 *
 * Generates a self-contained HTML file with an interactive 3D force-directed graph
 * showing traceability IDs as nodes and their relationships as edges.
 *
 * @example
 * ```bash
 * # Generate 3D graph visualization
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/graph ./data
 *
 * # With MDS layout and custom output
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/graph ./data --layout mds --output tmp/mds.html
 * ```
 *
 * @module
 */

import { parseArgs } from "jsr:@std/cli@^1.0.9/parse-args";
import { runGraphMode } from "./src/modes/graph.ts";

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: [
      "output",
      "distance",
      "algorithm",
      "threshold",
      "edge-threshold",
      "color-by",
      "layout",
      "k",
      "epsilon",
      "min-points",
    ],
    boolean: ["help"],
    default: {
      output: "tmp/graph-3d.html",
      distance: "structural",
      algorithm: "hierarchical",
      threshold: "0.3",
      "edge-threshold": "0.5",
      "color-by": "cluster",
      layout: "force",
      k: "0",
      epsilon: "0.3",
      "min-points": "2",
    },
  });

  if (args.help || args._.length < 1) {
    console.log(`Graph Mode - 3D visualization of traceability ID relationships

USAGE:
  deno run --allow-read --allow-write graph.ts [options] <input-dir>

ARGUMENTS:
  <input-dir>             Directory to scan for .md files

OPTIONS:
  --output <file>         Output HTML file (default: tmp/graph-3d.html)
  --distance <name>       Distance calculator (default: structural)
                          • levenshtein, jaro-winkler, cosine, structural
  --algorithm <name>      Clustering algorithm (default: hierarchical)
                          • hierarchical, kmeans, dbscan
  --threshold <number>    Clustering threshold (default: 0.3)
  --edge-threshold <n>    Edge display threshold (default: 0.5)
  --color-by <mode>       Color mode: cluster|scope|level (default: cluster)
  --layout <mode>         Layout: force|mds (default: force)
  --k <number>            K-Means: number of clusters (default: auto)
  --epsilon <number>      DBSCAN: neighborhood radius (default: 0.3)
  --min-points <number>   DBSCAN: minimum neighbors (default: 2)
  --help                  Show this help message

EXAMPLES:
  # Basic usage
  deno run --allow-read --allow-write graph.ts ./data

  # MDS layout with scope coloring
  deno run --allow-read --allow-write graph.ts ./data --layout mds --color-by scope

  # Custom thresholds
  deno run --allow-read --allow-write graph.ts ./data --threshold 0.5 --edge-threshold 0.7

  # DBSCAN clustering
  deno run --allow-read --allow-write graph.ts ./data --algorithm dbscan --epsilon 0.4
`);
    Deno.exit(args.help ? 0 : 1);
  }

  try {
    const outputFile = String(args.output);

    // Ensure output directory exists
    const outputDir = outputFile.substring(0, outputFile.lastIndexOf("/"));
    if (outputDir) {
      await Deno.mkdir(outputDir, { recursive: true });
    }

    await runGraphMode({
      inputDir: String(args._[0]),
      outputFile,
      distance: String(args.distance),
      algorithm: String(args.algorithm),
      edgeThreshold: parseFloat(args["edge-threshold"]),
      colorBy: String(args["color-by"]) as "cluster" | "scope" | "level",
      layout: String(args.layout) as "force" | "mds",
      clusteringOptions: {
        threshold: parseFloat(args.threshold),
        k: parseInt(args.k),
        epsilon: parseFloat(args.epsilon),
        minPoints: parseInt(args["min-points"]),
      },
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
