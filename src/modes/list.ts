/**
 * List mode - Extract all traceability IDs with occurrence information.
 *
 * Scans files (markdown by default), groups IDs by fullId, and outputs a structured
 * index with all file locations for each unique ID.
 *
 * @module
 */

import { consoleIO, type ModeIO } from "../core/events.ts";
import { COMPLETE, type ModeOutcome } from "../core/outcome.ts";
import type { ListFormat, SortKey } from "../core/options.ts";
import { formatListResult } from "../formatter/list_formatter.ts";
import { aggregateOccurrences, splitBatches } from "../list/aggregator.ts";
import { collectIds, emitResult, type InputSpec } from "./pipeline.ts";

/** Options for running list mode */
export interface ListModeOptions extends InputSpec {
  /** Output file path (undefined = stdout) */
  outputFile?: string;
  /** Output format */
  format: ListFormat;
  /** Sort key for entries */
  sort: SortKey;
  /** Batch size (0 = no batching; batching requires `outputFile`) */
  batchSize: number;
}

/**
 * Run list mode: scan, extract, aggregate, format, and output.
 *
 * Unlike the other modes it outputs an empty index when nothing is found.
 * Events: ModeStarted → ScanStarted → FilesScanned → IdsExtracted → Output* (one per batch)
 *
 * @param options - List mode options
 * @param io - Progress and output sink
 */
export async function runListMode(
  options: ListModeOptions,
  io: ModeIO = consoleIO,
): Promise<ModeOutcome> {
  io.report({ type: "ModeStarted", mode: "list" });
  const collected = await collectIds(options, io, "continue");
  const index = aggregateOccurrences(collected?.rawIds ?? [], options.sort);

  if (options.batchSize > 0 && options.outputFile) {
    const batches = splitBatches(index, options.batchSize);
    for (const [i, batch] of batches.entries()) {
      const file = batchFileName(options.outputFile, i + 1);
      await emitResult(io, formatListResult(batch, options.format), file);
    }
  } else {
    await emitResult(io, formatListResult(index, options.format), options.outputFile);
  }
  return COMPLETE;
}

/**
 * Name of the n-th batch file: `out.json` → `out-001.json`
 */
export function batchFileName(outputFile: string, n: number): string {
  const ext = getExtension(outputFile);
  const base = outputFile.replace(new RegExp(`${escapeRegExp(ext)}$`), "");
  return `${base}-${String(n).padStart(3, "0")}${ext}`;
}

function getExtension(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  return dot >= 0 ? filePath.substring(dot) : "";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
