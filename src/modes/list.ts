/**
 * List mode - Extract all traceability IDs with occurrence information.
 *
 * Scans markdown files, groups IDs by fullId, and outputs a structured
 * index with all file locations for each unique ID.
 *
 * @module
 */

import { scanFiles } from "../core/scanner.ts";
import { extractIds } from "../core/extractor.ts";
import { aggregateOccurrences, splitBatches } from "../list/aggregator.ts";
import type { SortKey } from "../list/aggregator.ts";
import { formatListResult } from "../formatter/list_formatter.ts";

/** Options for running list mode */
export interface ListModeOptions {
  /** Directory to scan for .md files */
  inputDir: string;
  /** Output file path (undefined = stdout) */
  outputFile?: string;
  /** Output format */
  format: "json" | "simple" | "csv";
  /** Sort key for entries */
  sort: SortKey;
  /** Batch size (0 = no batching) */
  batchSize: number;
}

/**
 * Run list mode: scan, extract, aggregate, format, and output.
 *
 * @param options - List mode options
 */
export async function runListMode(options: ListModeOptions): Promise<void> {
  const filePaths = await scanFiles(options.inputDir);
  const rawIds = await extractIds(filePaths);
  const index = aggregateOccurrences(rawIds, options.sort);

  if (options.batchSize > 0 && options.outputFile) {
    const batches = splitBatches(index, options.batchSize);
    const ext = getExtension(options.outputFile);
    const base = options.outputFile.replace(new RegExp(`${escapeRegExp(ext)}$`), "");

    for (let i = 0; i < batches.length; i++) {
      const padded = String(i + 1).padStart(3, "0");
      const batchFile = `${base}-${padded}${ext}`;
      const content = formatListResult(batches[i], options.format);
      await Deno.writeTextFile(batchFile, content);
    }

    console.log(
      `Wrote ${batches.length} batch files (${index.totalUniqueIds} unique IDs, ${index.totalOccurrences} occurrences)`,
    );
  } else {
    const content = formatListResult(index, options.format);

    if (options.outputFile) {
      await Deno.writeTextFile(options.outputFile, content);
      console.log(
        `Wrote ${options.outputFile} (${index.totalUniqueIds} unique IDs, ${index.totalOccurrences} occurrences)`,
      );
    } else {
      console.log(content);
    }
  }
}

function getExtension(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  return dot >= 0 ? filePath.substring(dot) : "";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
