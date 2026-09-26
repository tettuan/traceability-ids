#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * List mode for traceability IDs.
 *
 * Extracts all traceability IDs from files (markdown by default) and outputs a structured
 * index with occurrence information (file paths and line numbers).
 *
 * @example
 * ```bash
 * # Output JSON to stdout
 * deno run --allow-read jsr:@aidevtool/traceability-ids/list ./data
 *
 * # Write to file with batch splitting
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/list ./data --output tmp/id-index.json --batch-size 100
 * ```
 *
 * @module
 */

import { INPUT_OPTIONS_HELP } from "./src/cli/help.ts";
import { parseListArgs } from "./src/cli/args.ts";
import { type CommandSpec, main } from "./src/cli/runner.ts";
import { runListMode } from "./src/modes/list.ts";
import type { ListModeOptions } from "./src/modes/list.ts";

const USAGE = `List Mode - Extract all traceability IDs with occurrences

USAGE:
  deno run --allow-read --allow-write list.ts [options] <input-path...>

ARGUMENTS:
  <input-path...>      Directories or files to scan (one or more; directories are scanned recursively)

OPTIONS:
  --format <format>       Output format (default: json)
                          • json: Structured JSON with occurrences
                          • simple: One fullId per line
                          • csv: CSV with one row per occurrence
  --output <file>         Output file path (default: stdout)
  --sort <key>            Sort order (default: fullId)
                          • fullId: Alphabetical by full ID
                          • scope: Group by scope
                          • level: Group by level
                          • count: Most occurrences first
  --batch-size <number>   Split output into batches (default: 0 = no split)
                          Requires --output. Creates files like output-001.json
${INPUT_OPTIONS_HELP}

EXAMPLES:
  # List all IDs as JSON to stdout
  deno run --allow-read list.ts ./data

  # Write to file sorted by scope
  deno run --allow-read --allow-write list.ts ./data --output tmp/ids.json --sort scope

  # Simple list of unique IDs
  deno run --allow-read list.ts ./data --format simple

  # IDs written in specs and source code
  deno run --allow-read list.ts --ext md,rs,ts .specs src --format simple

  # Batch output (100 IDs per file)
  deno run --allow-read --allow-write list.ts ./data --output tmp/ids.json --batch-size 100
`;

/** The list command */
export const command: CommandSpec<ListModeOptions> = {
  usage: USAGE,
  parse: parseListArgs,
  run: (options) => runListMode(options),
};

if (import.meta.main) {
  await main(command);
}
