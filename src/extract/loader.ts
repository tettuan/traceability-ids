/**
 * Where the requested IDs come from.
 *
 * @module
 */

import { assertNever } from "../core/errors.ts";
import { readText } from "../core/io.ts";

/** Source of requested IDs */
export type IdsSource =
  /** IDs given inline, separated by whitespace */
  | { kind: "inline"; text: string }
  /** A file with one ID per line (blank lines ignored) */
  | { kind: "file"; path: string };

/**
 * Split inline text into IDs (whitespace-separated)
 */
export function parseInlineIds(text: string): string[] {
  return text.split(/\s+/).filter((id) => id.length > 0);
}

/**
 * Split file content into IDs (one per line, trimmed, blank lines ignored)
 */
export function parseIdLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Load the requested IDs
 *
 * @example
 * ```ts
 * const ids = await loadIds({ kind: "inline", text: "id1 id2" });
 * const fromFile = await loadIds({ kind: "file", path: "./ids.txt" });
 * ```
 *
 * @throws TraceabilityError `PathNotFound` | `PathAccessDenied` | `FileReadFailed` (file source)
 */
export async function loadIds(source: IdsSource): Promise<string[]> {
  switch (source.kind) {
    case "inline":
      return parseInlineIds(source.text);
    case "file":
      return parseIdLines(await readText(source.path));
    default:
      return assertNever(source);
  }
}
