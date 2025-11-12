import { deduplicateIds, extractIds } from "../core/extractor.ts";
import { scanFiles } from "../core/scanner.ts";
import { createDistanceCalculator } from "../cli/distance-factory.ts";
import { searchSimilar } from "../search/similarity.ts";
import { formatSearchResult } from "../formatter/formatter.ts";

export interface SearchModeOptions {
  inputDir: string;
  outputFile?: string;
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
  // Progress logs go to STDERR
  console.error(`Search mode`);
  console.error(`Query: ${options.query}`);
  console.error(`Distance calculator: ${options.distance}`);

  const calculator = createDistanceCalculator(options.distance);

  const files = await scanFiles(options.inputDir);
  console.error(`Found ${files.length} markdown files`);

  const allIds = await extractIds(files);
  console.error(`Extracted ${allIds.length} IDs (with duplicates)`);

  const ids = deduplicateIds(allIds);
  console.error(`Deduplicated to ${ids.length} unique IDs`);

  if (ids.length === 0) {
    console.error("No traceability IDs found");
    return;
  }

  console.error("Searching for similar IDs...");
  const result = searchSimilar(
    options.query,
    ids,
    calculator,
    { top: options.top },
  );
  console.error(`Found ${result.items.length} results`);

  const content = formatSearchResult(
    result,
    options.format,
    options.showDistance,
  );

  if (options.outputFile) {
    console.error(`Writing results to: ${options.outputFile}`);
    await Deno.writeTextFile(options.outputFile, content);
    console.error("Done!");
  } else {
    // Output to STDOUT
    console.log(content);
  }
}
