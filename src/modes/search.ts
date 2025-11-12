import { deduplicateIds, extractIds } from "../core/extractor.ts";
import { scanFiles } from "../core/scanner.ts";
import { createDistanceCalculator } from "../cli/distance-factory.ts";
import { searchSimilar } from "../search/similarity.ts";
import { formatSearchResult } from "../formatter/formatter.ts";

export interface SearchModeOptions {
  inputDir: string;
  outputFile: string;
  query: string;
  distance: string;
  top?: number;
  showDistance: boolean;
  format: "json" | "markdown" | "csv" | "simple";
}

/**
 * 検索モードを実行
 */
export async function runSearchMode(options: SearchModeOptions): Promise<void> {
  console.log(`Search mode`);
  console.log(`Query: ${options.query}`);
  console.log(`Distance calculator: ${options.distance}`);

  const calculator = createDistanceCalculator(options.distance);

  const files = await scanFiles(options.inputDir);
  console.log(`Found ${files.length} markdown files`);

  const allIds = await extractIds(files);
  console.log(`Extracted ${allIds.length} IDs (with duplicates)`);

  const ids = deduplicateIds(allIds);
  console.log(`Deduplicated to ${ids.length} unique IDs`);

  if (ids.length === 0) {
    console.warn("No traceability IDs found");
    return;
  }

  console.log("Searching for similar IDs...");
  const result = searchSimilar(
    options.query,
    ids,
    calculator,
    { top: options.top },
  );
  console.log(`Found ${result.items.length} results`);

  console.log(`Writing results to: ${options.outputFile}`);
  const content = formatSearchResult(
    result,
    options.format,
    options.showDistance,
  );
  await Deno.writeTextFile(options.outputFile, content);

  console.log("Done!");
}
