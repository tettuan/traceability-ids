/**
 * Resolution of requested IDs to the extracted occurrences they refer to.
 *
 * @module
 */

import { compareVersionsDesc, hasVersion, uniqueKeyOf, withVersion } from "../core/id.ts";
import type { VersionMatchMode } from "../core/options.ts";
import type { TraceabilityId } from "../core/types.ts";

/** Occurrences sharing one full ID, resolved from a requested ID */
export interface IdMatchGroup {
  /** Full ID of the occurrences (versionless when they were written without a version) */
  fullId: string;
  /** Occurrences, in extraction order */
  matches: TraceabilityId[];
}

/**
 * Resolve a requested ID to groups of matching occurrences, one group per full ID.
 *
 * - With a version (`...#{version}`): exact match only.
 * - Without a version: match by unique key. `latest` keeps only the newest version,
 *   `all` keeps every version newest first. References written without a version
 *   are included in both modes, after the versioned ones.
 *
 * @returns groups in output order; empty when nothing matches
 */
export function resolveTargetId(
  targetId: string,
  ids: readonly TraceabilityId[],
  mode: VersionMatchMode,
): IdMatchGroup[] {
  if (hasVersion(targetId)) {
    const matches = ids.filter((id) => id.fullId === targetId);
    return matches.length > 0 ? [{ fullId: targetId, matches }] : [];
  }

  const byVersion = new Map<string, TraceabilityId[]>();
  for (const id of ids) {
    if (uniqueKeyOf(id.fullId) !== targetId) continue;
    const list = byVersion.get(id.version) ?? [];
    list.push(id);
    byVersion.set(id.version, list);
  }

  const versions = [...byVersion.keys()].filter((v) => v !== "").sort(compareVersionsDesc);
  const selected = mode === "latest" ? versions.slice(0, 1) : versions;
  if (byVersion.has("")) selected.push("");
  return selected.map((version) => ({
    fullId: withVersion(targetId, version),
    matches: byVersion.get(version) ?? [],
  }));
}

/** Full IDs selected by requested IDs, and the requested IDs that matched nothing */
export interface IdSelection {
  /** Full IDs of every matched group */
  fullIds: Set<string>;
  /** Requested IDs without any match, in request order */
  missing: string[];
}

/**
 * Resolve every requested ID with {@link resolveTargetId} (pure)
 */
export function selectIds(
  targetIds: readonly string[],
  ids: readonly TraceabilityId[],
  mode: VersionMatchMode,
): IdSelection {
  const fullIds = new Set<string>();
  const missing: string[] = [];
  for (const targetId of targetIds) {
    const groups = resolveTargetId(targetId, ids, mode);
    if (groups.length === 0) missing.push(targetId);
    for (const group of groups) fullIds.add(group.fullId);
  }
  return { fullIds, missing };
}
