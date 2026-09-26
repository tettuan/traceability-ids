/**
 * Formatters for IdIndex output in list mode.
 *
 * @module
 */

import { assertNever } from "../core/errors.ts";
import type { ListFormat } from "../core/options.ts";
import type { IdIndex } from "../core/types.ts";

/**
 * Format IdIndex as JSON string.
 *
 * @param index - The ID index to format
 * @returns JSON string
 */
export function formatListAsJson(index: IdIndex): string {
  return JSON.stringify(index, null, 2);
}

/**
 * Format IdIndex as a simple list of unique fullIds (one per line).
 *
 * @param index - The ID index to format
 * @returns Plain text with one ID per line
 */
export function formatListAsSimple(index: IdIndex): string {
  return index.entries.map((e) => e.fullId).join("\n") + "\n";
}

/**
 * Format IdIndex as CSV.
 *
 * Each row is one occurrence (fullId + file + line).
 *
 * @param index - The ID index to format
 * @returns CSV string
 */
export function formatListAsCsv(index: IdIndex): string {
  let csv = "FullId,Level,Scope,Semantic,Hash,Version,OccurrenceCount,FilePath,LineNumber\n";

  for (const entry of index.entries) {
    for (const occ of entry.occurrences) {
      csv += `"${entry.fullId}","${entry.level}","${entry.scope}","${entry.semantic}",` +
        `"${entry.hash}","${entry.version}",${entry.occurrences.length},` +
        `"${occ.filePath}",${occ.lineNumber}\n`;
    }
  }

  return csv;
}

/**
 * Format IdIndex as occurrence counts per file: `{count} {filePath}`, by file path.
 *
 * Occurrences of every entry are added up (like `grep -c` over several IDs);
 * use the `count` format for counts per ID.
 *
 * @param index - The ID index to format
 * @returns One line per file holding an occurrence
 */
export function formatListAsLocations(index: IdIndex): string {
  const counts = new Map<string, number>();
  for (const entry of index.entries) {
    for (const { filePath } of entry.occurrences) {
      counts.set(filePath, (counts.get(filePath) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([filePath, count]) => `${count} ${filePath}\n`)
    .join("");
}

/**
 * Format IdIndex as occurrence counts per ID: `{count} {fullId}`, in index order.
 *
 * @param index - The ID index to format
 * @returns One line per entry
 */
export function formatListAsCount(index: IdIndex): string {
  return index.entries.map((e) => `${e.occurrences.length} ${e.fullId}\n`).join("");
}

/**
 * Format IdIndex in the specified format.
 *
 * @param index - The ID index to format
 * @param format - Output format
 * @returns Formatted string
 */
export function formatListResult(
  index: IdIndex,
  format: ListFormat,
): string {
  switch (format) {
    case "json":
      return formatListAsJson(index);
    case "simple":
      return formatListAsSimple(index);
    case "csv":
      return formatListAsCsv(index);
    case "locations":
      return formatListAsLocations(index);
    case "count":
      return formatListAsCount(index);
    default:
      return assertNever(format);
  }
}
