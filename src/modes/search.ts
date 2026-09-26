import { createDistanceCalculator } from "../cli/distance-factory.ts";
import { consoleIO, type ModeIO } from "../core/events.ts";
import { COMPLETE, type ModeOutcome } from "../core/outcome.ts";
import { deduplicateIds } from "../core/extractor.ts";
import type { DistanceName, SearchFormat } from "../core/options.ts";
import { formatSearchResult } from "../formatter/formatter.ts";
import { searchSimilar } from "../search/similarity.ts";
import { collectIds, emitResult, hashRuleOf, type InputSpec } from "./pipeline.ts";

/** Options of search mode */
export interface SearchModeOptions extends InputSpec {
  /** Output file (default: STDOUT) */
  outputFile?: string;
  /** Search query */
  query: string;
  /** Distance calculator */
  distance: DistanceName;
  /** Return only the top N results (default: all) */
  top?: number;
  /** Include distance scores (simple format) */
  showDistance: boolean;
  /** Output format */
  format: SearchFormat;
}

/**
 * 検索モードを実行
 *
 * Events: ModeStarted → CalculatorSelected → (collectIds) → SearchCompleted → Output*
 */
export async function runSearchMode(
  options: SearchModeOptions,
  io: ModeIO = consoleIO,
): Promise<ModeOutcome> {
  io.report({ type: "ModeStarted", mode: "search" });
  const calculator = createDistanceCalculator(options.distance, hashRuleOf(options));
  io.report({ type: "CalculatorSelected", name: options.distance });

  const collected = await collectIds(options, io);
  if (!collected) return COMPLETE;

  const result = searchSimilar(options.query, deduplicateIds(collected.rawIds), calculator, {
    top: options.top,
  });
  io.report({ type: "SearchCompleted", query: options.query, results: result.items.length });

  const content = formatSearchResult(result, options.format, options.showDistance);
  await emitResult(io, content, options.outputFile);
  return COMPLETE;
}
