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

import { parseGraphArgs } from "./src/cli/args.ts";
import { type CommandSpec, main } from "./src/cli/runner.ts";
import { runGraphMode } from "./src/modes/graph.ts";
import type { GraphModeOptions } from "./src/modes/graph.ts";

const USAGE = `Graph Mode - 3D visualization of traceability ID relationships

USAGE:
  deno run --allow-read --allow-write graph.ts [options] <input-path...>

ARGUMENTS:
  <input-path...>      Directories or files to scan (one or more; directories are scanned recursively)

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
  --ext <list>            File extensions to scan, comma-separated (default: md)
                          • e.g. md,rs,ts,tsx,mjs,sh
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
`;

/** The graph command */
export const command: CommandSpec<GraphModeOptions> = {
  usage: USAGE,
  parse: parseGraphArgs,
  run: (options) => runGraphMode(options),
};

if (import.meta.main) {
  await main(command);
}
