#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Extract mode for retrieving context around specific traceability IDs.
 *
 * Searches files (markdown by default) for specified IDs and extracts surrounding lines,
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

import { allowMissingOptionHelp, INPUT_OPTIONS_HELP, versionsOptionHelp } from "./src/cli/help.ts";
import { parseExtractArgs } from "./src/cli/args.ts";
import { type CommandSpec, main } from "./src/cli/runner.ts";
import { runExtractMode } from "./src/modes/extract.ts";
import type { ExtractCommandOptions } from "./src/cli/args.ts";
import { applyAllowMissing } from "./src/core/outcome.ts";

const USAGE = `Extract Mode - Extract context around specific IDs (grep-like)

USAGE:
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract [options] <input-path...>

ARGUMENTS:
  <input-path...> Directories or files to scan (one or more; directories are scanned recursively)

OPTIONS:
  --ids <string>          Space-separated list of IDs to extract (REQUIRED)
                          • With version (…#20251111a): exact match
                          • Without version (…-4f7b2e): resolved by --versions
  --ids-file <path>       Path to file containing IDs (one per line)
  --output <file>         Output file path (default: STDOUT)
  --before <number>       Lines before target line (default: 3, max: 50)
  --after <number>        Lines after target line (default: 10, max: 50)
  --format <format>       Output format (default: markdown)
                          • markdown, json, simple
${versionsOptionHelp("IDs")}
${allowMissingOptionHelp("some IDs are")}
${INPUT_OPTIONS_HELP}

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

  # ID without version: newest version / every version
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \\
    --ids "req:apikey:security-4f7b2e" ./docs
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \\
    --ids "req:apikey:security-4f7b2e" --versions all ./docs

  # Scan several paths, including source code
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \\
    --ids "req:apikey:security-4f7b2e" --ext md,rs,ts .specs src

  # Options can be in any order
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \\
    --before 5 ./data --ids "req:test:id-abc#v1" --format json
`;

/** The extract command */
export const command: CommandSpec<ExtractCommandOptions> = {
  usage: USAGE,
  parse: parseExtractArgs,
  run: async (options, io) =>
    applyAllowMissing(await runExtractMode(options, io), options.allowMissing),
};

if (import.meta.main) {
  await main(command);
}
