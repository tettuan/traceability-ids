#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * List mode for traceability IDs.
 *
 * Extracts all traceability IDs from markdown files and outputs a structured
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

import { parseArgs } from "jsr:@std/cli@^1.0.9/parse-args";
import { runListMode } from "./src/modes/list.ts";

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["output", "format", "sort", "batch-size"],
    boolean: ["help"],
    default: {
      format: "json",
      sort: "fullId",
      "batch-size": "0",
    },
  });

  if (args.help || args._.length < 1) {
    console.log(`List Mode - Extract all traceability IDs with occurrences

USAGE:
  deno run --allow-read --allow-write list.ts [options] <input-dir>

ARGUMENTS:
  <input-dir>             Directory to scan for .md files

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
  --help                  Show this help message

EXAMPLES:
  # List all IDs as JSON to stdout
  deno run --allow-read list.ts ./data

  # Write to file sorted by scope
  deno run --allow-read --allow-write list.ts ./data --output tmp/ids.json --sort scope

  # Simple list of unique IDs
  deno run --allow-read list.ts ./data --format simple

  # Batch output (100 IDs per file)
  deno run --allow-read --allow-write list.ts ./data --output tmp/ids.json --batch-size 100
`);
    Deno.exit(args.help ? 0 : 1);
  }

  try {
    const outputFile = args.output ? String(args.output) : undefined;

    if (outputFile) {
      const outputDir = outputFile.substring(0, outputFile.lastIndexOf("/"));
      if (outputDir) {
        await Deno.mkdir(outputDir, { recursive: true });
      }
    }

    await runListMode({
      inputDir: String(args._[0]),
      outputFile,
      format: String(args.format) as "json" | "simple" | "csv",
      sort: String(args.sort) as "fullId" | "scope" | "level" | "count",
      batchSize: parseInt(String(args["batch-size"])),
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
