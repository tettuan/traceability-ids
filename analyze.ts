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

import { parseAnalyzeArgs } from "./src/cli/args.ts";
import { type CommandSpec, main } from "./src/cli/runner.ts";
import { runAnalyzeMode } from "./src/modes/analyze.ts";
import type { AnalyzeModeOptions } from "./src/modes/analyze.ts";

const USAGE = `Analyze Mode - Traceability ID document improvement report

USAGE:
  deno run --allow-read --allow-write analyze.ts [options] <input-path...>

ARGUMENTS:
  <input-path...>      Directories or files to scan (one or more; directories are scanned recursively)

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
  --ext <list>            File extensions to scan, comma-separated (default: md)
                          • e.g. md,rs,ts,tsx,mjs,sh
  --skip-frontmatter      Ignore IDs in frontmatter (leading --- block); body only
  --help                  Show this help message

EXAMPLES:
  # Basic usage
  deno run --allow-read --allow-write analyze.ts ./data

  # Custom output
  deno run --allow-read --allow-write analyze.ts ./data --output tmp/report.md

  # Fine-grained clustering for analysis
  deno run --allow-read --allow-write analyze.ts ./data --threshold 0.2
`;

/** The analyze command */
export const command: CommandSpec<AnalyzeModeOptions> = {
  usage: USAGE,
  parse: parseAnalyzeArgs,
  run: (options) => runAnalyzeMode(options),
};

if (import.meta.main) {
  await main(command);
}
