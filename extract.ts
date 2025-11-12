#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Extract mode entry point for JSR
 *
 * Usage:
 *   deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract <input-dir> <output-file> --ids <ids> [options]
 */

import { parseArgs } from "jsr:@std/cli@^1.0.9/parse-args";
import { scanFiles } from "./src/core/scanner.ts";
import { extractIds } from "./src/core/extractor.ts";
import { extractContext } from "./src/extract/context.ts";
import { loadIds } from "./src/extract/loader.ts";
import { formatContextResult } from "./src/formatter/formatter.ts";
import type { ContextExtractionRequest } from "./src/core/types.ts";

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["ids", "ids-file", "before", "after", "format"],
    boolean: ["help"],
    default: {
      before: "3",
      after: "10",
      format: "markdown",
    },
  });

  if (args.help || args._.length < 2 || (!args.ids && !args["ids-file"])) {
    console.log(`Extract Mode - Extract context around specific IDs (grep-like)

USAGE:
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract <input-dir> <output-file> --ids <ids> [options]

ARGUMENTS:
  <input-dir>     Directory to scan for .md files
  <output-file>   Path where results will be written

OPTIONS:
  --ids <string>          Space-separated list of IDs to extract (REQUIRED)
  --ids-file <path>       Path to file containing IDs (one per line)
  --before <number>       Lines before target line (default: 3, max: 50)
  --after <number>        Lines after target line (default: 10, max: 50)
  --format <format>       Output format (default: markdown)
                          • markdown, json, simple
  --help                  Show this help message

EXAMPLES:
  # Extract context for a single ID
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \\
    ./docs ./output/context.md \\
    --ids "req:apikey:security-4f7b2e#20251111a"

  # Extract from ID list file
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/extract \\
    ./docs ./output/context.md \\
    --ids-file ./ids.txt --before 5 --after 15
`);
    Deno.exit(args.help ? 0 : 1);
  }

  const inputDir = String(args._[0]);
  const outputFile = String(args._[1]);

  try {
    console.log(`Extract mode`);

    const idsSource = args.ids || args["ids-file"];
    if (!idsSource) {
      console.error("Error: Either --ids or --ids-file is required");
      Deno.exit(1);
    }
    const targetIds = await loadIds(
      idsSource,
      Boolean(args["ids-file"]),
    );
    console.log(`Target IDs: ${targetIds.length}`);

    console.log(`Scanning files in: ${inputDir}`);
    const files = await scanFiles(inputDir);
    console.log(`Found ${files.length} markdown files`);

    console.log("Extracting traceability IDs...");
    const ids = await extractIds(files);
    console.log(`Extracted ${ids.length} IDs`);

    if (ids.length === 0) {
      console.warn("No traceability IDs found");
      Deno.exit(0);
    }

    console.log("Extracting context...");
    const request: ContextExtractionRequest = {
      ids: targetIds,
      before: parseInt(args.before),
      after: parseInt(args.after),
    };
    const result = await extractContext(request, ids);
    console.log(`Found ${result.contexts.length} IDs`);
    console.log(`Not found: ${result.notFound.length} IDs`);

    console.log(`Writing results to: ${outputFile}`);
    const content = formatContextResult(
      result,
      args.format as "json" | "markdown" | "simple",
    );
    await Deno.writeTextFile(outputFile, content);

    console.log("Done!");
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
