#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Extract mode for retrieving context around specific traceability IDs.
 *
 * Searches markdown files for specified IDs and extracts surrounding lines,
 * similar to grep with context. Useful for understanding where and how IDs are used.
 *
 * @example
 * ```bash
 * # Extract context for a specific ID
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract ./docs --ids "req:auth:login-abc#v1"
 *
 * # Extract with custom context range
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract ./docs --ids "req:auth:login-abc#v1" --before 5 --after 15
 * ```
 *
 * @module
 */

import { parseArgs } from "jsr:@std/cli@^1.0.9/parse-args";
import { runExtractMode } from "./src/modes/extract.ts";

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["ids", "ids-file", "before", "after", "format", "output"],
    boolean: ["help"],
    default: {
      before: "3",
      after: "10",
      format: "markdown",
    },
  });

  if (args.help || args._.length < 1 || (!args.ids && !args["ids-file"])) {
    console.log(`Extract Mode - Extract context around specific IDs (grep-like)

USAGE:
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract [options] <input-dir>

ARGUMENTS:
  <input-dir>     Directory to scan for .md files

OPTIONS:
  --ids <string>          Space-separated list of IDs to extract (REQUIRED)
  --ids-file <path>       Path to file containing IDs (one per line)
  --output <file>         Output file path (default: STDOUT)
  --before <number>       Lines before target line (default: 3, max: 50)
  --after <number>        Lines after target line (default: 10, max: 50)
  --format <format>       Output format (default: markdown)
                          • markdown, json, simple
  --help                  Show this help message

EXAMPLES:
  # Output to STDOUT
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \\
    --ids "req:apikey:security-4f7b2e#20251111a" ./docs

  # Output to file
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \\
    ./docs --ids "req:apikey:security-4f7b2e#20251111a" --output context.md

  # Extract from ID list file
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \\
    --ids-file ./ids.txt ./docs --before 5 --after 15

  # Options can be in any order
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \\
    --before 5 ./data --ids "req:test:id-abc#v1" --format json
`);
    Deno.exit(args.help ? 0 : 1);
  }

  try {
    const idsSource = args.ids || args["ids-file"];
    if (!idsSource) {
      console.error("Error: Either --ids or --ids-file is required");
      Deno.exit(1);
    }

    await runExtractMode({
      inputDir: String(args._[0]),
      outputFile: args.output ? String(args.output) : undefined,
      idsSource,
      isFile: Boolean(args["ids-file"]),
      before: parseInt(args.before),
      after: parseInt(args.after),
      format: args.format as "json" | "markdown" | "simple",
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
