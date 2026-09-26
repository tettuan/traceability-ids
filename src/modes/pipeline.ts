/**
 * Steps shared by every mode: scanning input, extracting IDs, emitting the result.
 *
 * @module
 */

import type { ModeIO } from "../core/events.ts";
import { extractIds } from "../core/extractor.ts";
import { writeText } from "../core/io.ts";
import { DEFAULT_EXTENSIONS, scanFiles } from "../core/scanner.ts";
import type { TraceabilityId } from "../core/types.ts";

/** What to scan */
export interface InputSpec {
  /** Directories or files to scan */
  inputDir: string | readonly string[];
  /** File extensions to scan (default: md) */
  extensions?: readonly string[];
}

/** Whether a mode stops (`stop`) or goes on with empty results (`continue`) when nothing is found */
export type EmptyPolicy = "stop" | "continue";

/** IDs collected from the input */
export interface CollectedIds {
  /** Scanned files */
  files: string[];
  /** Every occurrence, in file and line order */
  rawIds: TraceabilityId[];
}

/**
 * Scan the input and extract every ID occurrence
 *
 * Emits `ScanStarted` → `FilesScanned` → `IdsExtracted`, or stops after
 * `FilesScanned` with `Stopped(NoFiles)` / after `IdsExtracted` with `Stopped(NoIds)`.
 *
 * With `emptyPolicy: "continue"` it never stops and returns empty results instead.
 *
 * @returns collected IDs, or `null` when stopped because there is nothing to process
 * @throws TraceabilityError input errors of {@link scanFiles} and {@link extractIds}
 */
export async function collectIds(
  input: InputSpec,
  io: ModeIO,
  emptyPolicy: EmptyPolicy = "stop",
): Promise<CollectedIds | null> {
  const paths = typeof input.inputDir === "string" ? [input.inputDir] : input.inputDir;
  const extensions = input.extensions ?? DEFAULT_EXTENSIONS;

  io.report({ type: "ScanStarted", paths, extensions });
  const files = await scanFiles(paths, extensions);
  io.report({ type: "FilesScanned", count: files.length });
  if (files.length === 0 && emptyPolicy === "stop") {
    io.report({ type: "Stopped", reason: "NoFiles" });
    return null;
  }

  const rawIds = await extractIds(files);
  const unique = new Set(rawIds.map((id) => id.fullId)).size;
  io.report({ type: "IdsExtracted", total: rawIds.length, unique });
  if (rawIds.length === 0 && emptyPolicy === "stop") {
    io.report({ type: "Stopped", reason: "NoIds" });
    return null;
  }

  return { files, rawIds };
}

/**
 * Write the result to `outputFile`, or print it when no file is given
 *
 * Emits `OutputWritten` or `OutputPrinted`.
 *
 * @throws TraceabilityError `FileWriteFailed`
 */
export async function emitResult(
  io: ModeIO,
  content: string,
  outputFile?: string,
): Promise<void> {
  if (outputFile) {
    await writeText(outputFile, content);
    io.report({ type: "OutputWritten", path: outputFile });
  } else {
    io.print(content);
    io.report({ type: "OutputPrinted", length: content.length });
  }
}
