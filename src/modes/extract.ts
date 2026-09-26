import { consoleIO, type ModeIO } from "../core/events.ts";
import { lookupOutcome, type ModeOutcome } from "../core/outcome.ts";
import type { ExtractFormat, VersionMatchMode } from "../core/options.ts";
import type { ContextExtractionRequest } from "../core/types.ts";
import { extractContext } from "../extract/context.ts";
import { type IdsSource, loadIds } from "../extract/loader.ts";
import { formatContextResult } from "../formatter/formatter.ts";
import { collectIds, emitResult, type InputSpec } from "./pipeline.ts";

/** Options of extract mode */
export interface ExtractModeOptions extends InputSpec {
  /** Output file (default: STDOUT) */
  outputFile?: string;
  /** Where the requested IDs come from */
  ids: IdsSource;
  /** Lines before the target line (max: 50) */
  before: number;
  /** Lines after the target line (max: 50) */
  after: number;
  /** Output format */
  format: ExtractFormat;
  /** Version resolution for IDs given without a version (default: latest) */
  versions?: VersionMatchMode;
}

/**
 * 抽出モードを実行
 *
 * Events: ModeStarted → TargetsLoaded → (collectIds) → ContextsResolved → Output*
 *
 * @returns `partial` with the IDs not found (all of them when nothing was scanned)
 */
export async function runExtractMode(
  options: ExtractModeOptions,
  io: ModeIO = consoleIO,
): Promise<ModeOutcome> {
  io.report({ type: "ModeStarted", mode: "extract" });

  const targetIds = await loadIds(options.ids);
  io.report({ type: "TargetsLoaded", count: targetIds.length });

  const collected = await collectIds(options, io);
  if (!collected) return lookupOutcome(targetIds);

  const request: ContextExtractionRequest = {
    ids: targetIds,
    before: options.before,
    after: options.after,
    versions: options.versions,
  };
  const result = await extractContext(request, collected.rawIds);
  io.report({
    type: "ContextsResolved",
    found: result.contexts.length,
    notFound: result.notFound.length,
  });

  await emitResult(io, formatContextResult(result, options.format), options.outputFile);
  return lookupOutcome(result.notFound);
}
