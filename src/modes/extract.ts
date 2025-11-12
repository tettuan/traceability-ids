import { extractIds } from "../core/extractor.ts";
import { scanFiles } from "../core/scanner.ts";
import { extractContext } from "../extract/context.ts";
import { loadIds } from "../extract/loader.ts";
import { formatContextResult } from "../formatter/formatter.ts";
import type { ContextExtractionRequest } from "../core/types.ts";

export interface ExtractModeOptions {
  inputDir: string;
  outputFile?: string;
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
  // Progress logs go to STDERR
  console.error(`Extract mode`);

  const targetIds = await loadIds(options.idsSource, options.isFile);
  console.error(`Target IDs: ${targetIds.length}`);

  console.error(`Scanning files in: ${options.inputDir}`);
  const files = await scanFiles(options.inputDir);
  console.error(`Found ${files.length} markdown files`);

  console.error("Extracting traceability IDs...");
  const ids = await extractIds(files);
  console.error(`Extracted ${ids.length} IDs`);

  if (ids.length === 0) {
    console.error("No traceability IDs found");
    return;
  }

  console.error("Extracting context...");
  const request: ContextExtractionRequest = {
    ids: targetIds,
    before: options.before,
    after: options.after,
  };
  const result = await extractContext(request, ids);
  console.error(`Found ${result.contexts.length} IDs`);
  console.error(`Not found: ${result.notFound.length} IDs`);

  const content = formatContextResult(result, options.format);

  if (options.outputFile) {
    console.error(`Writing results to: ${options.outputFile}`);
    await Deno.writeTextFile(options.outputFile, content);
    console.error("Done!");
  } else {
    // Output to STDOUT
    console.log(content);
  }
}
