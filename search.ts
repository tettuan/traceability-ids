#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Search mode entry point for JSR
 *
 * Usage:
 *   deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search <input-dir> --query <query> [options]
 */

import { parseArgs } from "jsr:@std/cli@^1.0.9/parse-args";
import { runSearchMode } from "./src/modes/search.ts";

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["query", "top", "distance", "format", "output"],
    boolean: ["help", "show-distance"],
    default: {
      distance: "cosine", // Search mode default
      format: "simple",
    },
  });

  if (args.help || args._.length < 1 || !args.query) {
    console.log(`Search Mode - Find IDs similar to a query

USAGE:
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search [options] <input-dir>

ARGUMENTS:
  <input-dir>     Directory to scan for .md files

OPTIONS:
  --query <string>        Search query (REQUIRED)
  --output <file>         Output file path (default: STDOUT)
  --distance <name>       Distance calculation method (default: cosine)
                          • levenshtein, jaro-winkler, cosine, structural
  --top <number>          Return only top N results (default: all)
  --show-distance         Include distance scores in output
  --format <format>       Output format (default: simple)
                          • simple, json, markdown, csv
  --help                  Show this help message

EXAMPLES:
  # Output to STDOUT
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \\
    --query "security" --top 10 ./docs

  # Output to file
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \\
    ./docs --query "security" --output result.txt --show-distance

  # Options can be in any order
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \\
    --top 5 --query "auth" ./data --distance cosine
`);
    Deno.exit(args.help ? 0 : 1);
  }

  try {
    await runSearchMode({
      inputDir: String(args._[0]),
      outputFile: args.output ? String(args.output) : undefined,
      query: args.query,
      distance: args.distance,
      top: args.top ? parseInt(args.top) : undefined,
      showDistance: args["show-distance"] === true,
      format: args.format as "json" | "markdown" | "csv" | "simple",
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
