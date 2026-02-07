/**
 * Aggregates raw traceability IDs into an indexed structure
 * grouped by unique fullId with all occurrences.
 *
 * @module
 */

import type { IdIndex, IdIndexEntry, TraceabilityId } from "../core/types.ts";

/** Sort key options for ID index entries */
export type SortKey = "fullId" | "scope" | "level" | "count";

/**
 * Aggregate raw traceability IDs into an IdIndex.
 *
 * Groups all occurrences of the same fullId together,
 * preserving file path and line number for each occurrence.
 *
 * @param rawIds - All extracted IDs (including duplicates)
 * @param sortBy - Sort key for entries (default: "fullId")
 * @returns IdIndex with grouped entries
 */
export function aggregateOccurrences(
  rawIds: TraceabilityId[],
  sortBy: SortKey = "fullId",
): IdIndex {
  const map = new Map<string, IdIndexEntry>();

  for (const id of rawIds) {
    const existing = map.get(id.fullId);
    if (existing) {
      existing.occurrences.push({
        filePath: id.filePath,
        lineNumber: id.lineNumber,
      });
    } else {
      map.set(id.fullId, {
        fullId: id.fullId,
        level: id.level,
        scope: id.scope,
        semantic: id.semantic,
        hash: id.hash,
        version: id.version,
        occurrences: [{
          filePath: id.filePath,
          lineNumber: id.lineNumber,
        }],
      });
    }
  }

  const entries = [...map.values()];
  sortEntries(entries, sortBy);

  return {
    totalUniqueIds: entries.length,
    totalOccurrences: rawIds.length,
    entries,
  };
}

/**
 * Split an IdIndex into batches of the specified size.
 *
 * @param index - The full IdIndex
 * @param batchSize - Number of entries per batch
 * @returns Array of IdIndex objects, each with a subset of entries
 */
export function splitBatches(index: IdIndex, batchSize: number): IdIndex[] {
  if (batchSize <= 0) {
    return [index];
  }

  const batches: IdIndex[] = [];
  for (let i = 0; i < index.entries.length; i += batchSize) {
    const batchEntries = index.entries.slice(i, i + batchSize);
    const batchOccurrences = batchEntries.reduce(
      (sum, e) => sum + e.occurrences.length,
      0,
    );
    batches.push({
      totalUniqueIds: batchEntries.length,
      totalOccurrences: batchOccurrences,
      entries: batchEntries,
    });
  }

  return batches;
}

/** Sort entries in place by the given key */
function sortEntries(entries: IdIndexEntry[], sortBy: SortKey): void {
  switch (sortBy) {
    case "fullId":
      entries.sort((a, b) => a.fullId.localeCompare(b.fullId));
      break;
    case "scope":
      entries.sort((a, b) => a.scope.localeCompare(b.scope) || a.fullId.localeCompare(b.fullId));
      break;
    case "level":
      entries.sort((a, b) => a.level.localeCompare(b.level) || a.fullId.localeCompare(b.fullId));
      break;
    case "count":
      entries.sort((a, b) =>
        b.occurrences.length - a.occurrences.length ||
        a.fullId.localeCompare(b.fullId)
      );
      break;
  }
}
