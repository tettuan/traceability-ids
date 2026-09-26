/**
 * Steps shared by every mode: scanning input, extracting IDs, emitting the result.
 *
 * @module
 */

import type { ModeIO } from "../core/events.ts";
import { extractIds } from "../core/extractor.ts";
import { writeText } from "../core/io.ts";
import { DEFAULT_EXTENSIONS, scanFiles } from "../core/scanner.ts";
import {
  DEFAULT_FRONTMATTER,
  DEFAULT_HASH_POLICY,
  type FrontmatterPolicy,
  type HashPolicy,
} from "../core/options.ts";
import { DEFAULT_HASH_RULE, hasHash, type HashRule } from "../core/id.ts";
import type { TraceabilityId } from "../core/types.ts";

/** What to scan */
export interface InputSpec {
  /** Directories or files to scan */
  inputDir: string | readonly string[];
  /** File extensions to scan (default: md) */
  extensions?: readonly string[];
  /** Whether IDs in frontmatter are extracted (default: include) */
  frontmatter?: FrontmatterPolicy;
  /** Hash form of the last segment (default: DEFAULT_HASH_RULE) */
  hashRule?: HashRule;
  /** Whether IDs without a hash are kept (default: any) */
  hashes?: HashPolicy;
}

/**
 * Hash rule of an input spec
 */
export function hashRuleOf(input: InputSpec): HashRule {
  return input.hashRule ?? DEFAULT_HASH_RULE;
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
 * Emits `ScanStarted` → `FilesScanned` → `HashlessExcluded`? → `IdsExtracted`, or stops after
 * `FilesScanned` with `Stopped(NoFiles)` / after `IdsExtracted` with `Stopped(NoIds)`.
 *
 * With `hashes: "required"` IDs without a hash are dropped and counted in `HashlessExcluded`.
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
  const frontmatter = input.frontmatter ?? DEFAULT_FRONTMATTER;

  io.report({ type: "ScanStarted", paths, extensions, frontmatter });
  const files = await scanFiles(paths, extensions);
  io.report({ type: "FilesScanned", count: files.length });
  if (files.length === 0 && emptyPolicy === "stop") {
    io.report({ type: "Stopped", reason: "NoFiles" });
    return null;
  }

  const extracted = await extractIds(files, frontmatter, hashRuleOf(input));
  const rawIds = (input.hashes ?? DEFAULT_HASH_POLICY) === "required"
    ? extracted.filter(hasHash)
    : extracted;
  if (rawIds.length < extracted.length) {
    io.report({ type: "HashlessExcluded", count: extracted.length - rawIds.length });
  }
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
