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

import { allowMissingOptionHelp, INPUT_OPTIONS_HELP, versionsOptionHelp } from "./src/cli/help.ts";
import { parseListArgs } from "./src/cli/args.ts";
import { type CommandSpec, main } from "./src/cli/runner.ts";
import { runListMode } from "./src/modes/list.ts";
import type { ListCommandOptions } from "./src/cli/args.ts";
import { applyAllowMissing } from "./src/core/outcome.ts";

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
                          • locations: "{count} {filePath}" per file (all selected IDs added up)
                          • count: "{count} {fullId}" per ID
  --ids <string>          Only these IDs (space-separated)
                          • With version (…#20251111a): exact match
                          • Without version (…-4f7b2e): resolved by --versions
  --ids-file <path>       Path to file containing IDs (one per line)
  --output <file>         Output file path (default: stdout)
  --sort <key>            Sort order (default: fullId)
                          • fullId: Alphabetical by full ID
                          • scope: Group by scope
                          • level: Group by level
                          • count: Most occurrences first
  --batch-size <number>   Split output into batches (default: 0 = no split)
                          Requires --output. Creates files like output-001.json
${versionsOptionHelp("--ids")}
${allowMissingOptionHelp("some IDs are")}
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

  # Where and how often one ID occurs, every version
  deno run --allow-read list.ts ./docs --ids req:auth:login-flow-1a2b3c --versions all --format locations

  # Batch output (100 IDs per file)
  deno run --allow-read --allow-write list.ts ./data --output tmp/ids.json --batch-size 100
`;

/** The list command */
export const command: CommandSpec<ListCommandOptions> = {
  usage: USAGE,
  parse: parseListArgs,
  run: async (options, io) =>
    applyAllowMissing(await runListMode(options, io), options.allowMissing),
};

if (import.meta.main) {
  await main(command);
}
