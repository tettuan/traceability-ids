#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Search mode entry point for JSR
 *
 * Usage:
 *   deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search <input-dir> <output-file> --query <query> [options]
 */

import { parseArgs } from "jsr:@std/cli@^1.0.9/parse-args";
import { scanFiles } from "./src/core/scanner.ts";
import { deduplicateIds, extractIds } from "./src/core/extractor.ts";
import { LevenshteinDistance } from "./src/distance/levenshtein.ts";
import { JaroWinklerDistance } from "./src/distance/jaro_winkler.ts";
import { CosineDistance } from "./src/distance/cosine.ts";
import { StructuralDistance } from "./src/distance/structural.ts";
import { formatSearchResult } from "./src/formatter/formatter.ts";
import { searchSimilar } from "./src/search/similarity.ts";
import type { DistanceCalculator } from "./src/distance/calculator.ts";

function getDistanceCalculator(name: string): DistanceCalculator {
  switch (name) {
    case "levenshtein":
      return new LevenshteinDistance();
    case "jaro-winkler":
      return new JaroWinklerDistance();
    case "cosine":
      return new CosineDistance();
    case "structural":
      return new StructuralDistance();
    default:
      throw new Error(
        `Unknown distance calculator: ${name}. Available: levenshtein, jaro-winkler, cosine, structural`,
      );
  }
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["query", "top", "distance", "format"],
    boolean: ["help", "show-distance"],
    default: {
      distance: "cosine", // Search mode default
      format: "simple",
    },
  });

  if (args.help || args._.length < 2 || !args.query) {
    console.log(`Search Mode - Find IDs similar to a query

USAGE:
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search <input-dir> <output-file> --query <query> [options]

ARGUMENTS:
  <input-dir>     Directory to scan for .md files
  <output-file>   Path where results will be written

OPTIONS:
  --query <string>        Search query (REQUIRED)
  --distance <name>       Distance calculation method (default: cosine)
                          • levenshtein, jaro-winkler, cosine, structural
  --top <number>          Return only top N results (default: all)
  --show-distance         Include distance scores in output
  --format <format>       Output format (default: simple)
                          • simple, json, markdown, csv
  --help                  Show this help message

EXAMPLE:
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/search \\
    ./docs ./output/search.txt \\
    --query "security" --top 10 --show-distance
`);
    Deno.exit(args.help ? 0 : 1);
  }

  const inputDir = String(args._[0]);
  const outputFile = String(args._[1]);

  try {
    console.log(`Search mode`);
    console.log(`Query: ${args.query}`);
    console.log(`Distance calculator: ${args.distance}`);

    const calculator: DistanceCalculator = getDistanceCalculator(args.distance);

    const files = await scanFiles(inputDir);
    console.log(`Found ${files.length} markdown files`);

    const allIds = await extractIds(files);
    console.log(`Extracted ${allIds.length} IDs (with duplicates)`);

    const ids = deduplicateIds(allIds);
    console.log(`Deduplicated to ${ids.length} unique IDs`);

    if (ids.length === 0) {
      console.warn("No traceability IDs found");
      Deno.exit(0);
    }

    console.log("Searching for similar IDs...");
    const result = searchSimilar(
      args.query,
      ids,
      calculator,
      { top: args.top ? parseInt(args.top) : undefined },
    );
    console.log(`Found ${result.items.length} results`);

    console.log(`Writing results to: ${outputFile}`);
    const content = formatSearchResult(
      result,
      args.format as "json" | "markdown" | "csv" | "simple",
      args["show-distance"] === true,
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
