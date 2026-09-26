#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Search mode for finding traceability IDs similar to a query string.
 *
 * Uses similarity algorithms to find IDs matching a search term or pattern.
 * Supports multiple distance calculation methods for flexible matching.
 *
 * @example
 * ```bash
 * # Find IDs similar to "security"
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search ./docs --query "security" --top 10
 *
 * # Show distance scores
 * deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search ./docs --query "auth" --show-distance
 * ```
 *
 * @module
 */

import { INPUT_OPTIONS_HELP } from "./src/cli/help.ts";
import { parseSearchArgs } from "./src/cli/args.ts";
import { type CommandSpec, main } from "./src/cli/runner.ts";
import { runSearchMode } from "./src/modes/search.ts";
import type { SearchModeOptions } from "./src/modes/search.ts";

const USAGE = `Search Mode - Find IDs similar to a query

USAGE:
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search [options] <input-path...>

ARGUMENTS:
  <input-path...> Directories or files to scan (one or more; directories are scanned recursively)

OPTIONS:
  --query <string>        Search query (REQUIRED)
  --output <file>         Output file path (default: STDOUT)
  --distance <name>       Distance calculation method (default: cosine)
                          • levenshtein, jaro-winkler, cosine, structural
  --top <number>          Return only top N results (default: all)
  --show-distance         Include distance scores in output
  --format <format>       Output format (default: simple)
                          • simple, json, markdown, csv
${INPUT_OPTIONS_HELP}

EXAMPLES:
  # Output to STDOUT
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \\
    --query "security" --top 10 ./docs

  # Output to file
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \\
    ./docs --query "security" --output result.txt --show-distance

  # Search specs and source code together
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \\
    --query "auth" --ext md,ts .specs src

  # Options can be in any order
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \\
    --top 5 --query "auth" ./data --distance cosine
`;

/** The search command */
export const command: CommandSpec<SearchModeOptions> = {
  usage: USAGE,
  parse: parseSearchArgs,
  run: (options) => runSearchMode(options),
};

if (import.meta.main) {
  await main(command);
}
