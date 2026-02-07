#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Analyze mode for traceability ID document improvement report.
 *
 * Generates a Markdown report analyzing document structure, detail level,
 * duplication, and gap coverage of traceability IDs.
 *
 * @example
 * ```bash
 * # Generate analysis report
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/analyze ./data
 *
 * # Custom output path
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/analyze ./data --output tmp/report.md
 * ```
 *
 * @module
 */

import { parseArgs } from "jsr:@std/cli@^1.0.9/parse-args";
import { runAnalyzeMode } from "./src/modes/analyze.ts";

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: [
      "output",
      "distance",
      "algorithm",
      "threshold",
      "edge-threshold",
      "k",
      "epsilon",
      "min-points",
    ],
    boolean: ["help"],
    default: {
      output: "tmp/analyze-report.md",
      distance: "structural",
      algorithm: "hierarchical",
      threshold: "0.3",
      "edge-threshold": "0.5",
      k: "0",
      epsilon: "0.3",
      "min-points": "2",
    },
  });

  if (args.help || args._.length < 1) {
    console.log(`Analyze Mode - Traceability ID document improvement report

USAGE:
  deno run --allow-read --allow-write analyze.ts [options] <input-dir>

ARGUMENTS:
  <input-dir>             Directory to scan for .md files

OPTIONS:
  --output <file>         Output report file (default: tmp/analyze-report.md)
  --distance <name>       Distance calculator (default: structural)
                          • levenshtein, jaro-winkler, cosine, structural
  --algorithm <name>      Clustering algorithm (default: hierarchical)
                          • hierarchical, kmeans, dbscan
  --threshold <number>    Clustering threshold (default: 0.3)
  --edge-threshold <n>    Edge threshold for connectivity analysis (default: 0.5)
  --k <number>            K-Means: number of clusters (default: auto)
  --epsilon <number>      DBSCAN: neighborhood radius (default: 0.3)
  --min-points <number>   DBSCAN: minimum neighbors (default: 2)
  --help                  Show this help message

EXAMPLES:
  # Basic usage
  deno run --allow-read --allow-write analyze.ts ./data

  # Custom output
  deno run --allow-read --allow-write analyze.ts ./data --output tmp/report.md

  # Fine-grained clustering for analysis
  deno run --allow-read --allow-write analyze.ts ./data --threshold 0.2
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

    await runAnalyzeMode({
      inputDir: String(args._[0]),
      outputFile,
      distance: String(args.distance),
      algorithm: String(args.algorithm),
      edgeThreshold: parseFloat(args["edge-threshold"]),
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
