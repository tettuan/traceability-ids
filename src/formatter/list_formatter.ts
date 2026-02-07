/**
 * Formatters for IdIndex output in list mode.
 *
 * @module
 */

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
 * Format IdIndex in the specified format.
 *
 * @param index - The ID index to format
 * @param format - Output format
 * @returns Formatted string
 */
export function formatListResult(
  index: IdIndex,
  format: "json" | "simple" | "csv",
): string {
  switch (format) {
    case "json":
      return formatListAsJson(index);
    case "simple":
      return formatListAsSimple(index);
    case "csv":
      return formatListAsCsv(index);
    default:
      throw new Error(`Unknown list format: ${format}`);
  }
}
