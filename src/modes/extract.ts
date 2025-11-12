import { extractIds } from "../core/extractor.ts";
import { scanFiles } from "../core/scanner.ts";
import { extractContext } from "../extract/context.ts";
import { loadIds } from "../extract/loader.ts";
import { formatContextResult } from "../formatter/formatter.ts";
import type { ContextExtractionRequest } from "../core/types.ts";

export interface ExtractModeOptions {
  inputDir: string;
  outputFile: string;
  idsSource: string;
  isFile: boolean;
  before: number;
  after: number;
  format: "json" | "markdown" | "simple";
}

/**
 * 抽出モードを実行
 */
export async function runExtractMode(
  options: ExtractModeOptions,
): Promise<void> {
  console.log(`Extract mode`);

  const targetIds = await loadIds(options.idsSource, options.isFile);
  console.log(`Target IDs: ${targetIds.length}`);

  console.log(`Scanning files in: ${options.inputDir}`);
  const files = await scanFiles(options.inputDir);
  console.log(`Found ${files.length} markdown files`);

  console.log("Extracting traceability IDs...");
  const ids = await extractIds(files);
  console.log(`Extracted ${ids.length} IDs`);

  if (ids.length === 0) {
    console.warn("No traceability IDs found");
    return;
  }

  console.log("Extracting context...");
  const request: ContextExtractionRequest = {
    ids: targetIds,
    before: options.before,
    after: options.after,
  };
  const result = await extractContext(request, ids);
  console.log(`Found ${result.contexts.length} IDs`);
  console.log(`Not found: ${result.notFound.length} IDs`);

  console.log(`Writing results to: ${options.outputFile}`);
  const content = formatContextResult(result, options.format);
  await Deno.writeTextFile(options.outputFile, content);

  console.log("Done!");
}
