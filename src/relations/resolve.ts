/**
 * Resolution of declared relations to the extracted IDs they point to.
 *
 * @module
 */

import { assertNever } from "../core/errors.ts";
import { compareVersionsDesc, hasVersion, uniqueKeyOf, withVersion } from "../core/id.ts";
import { isNonEmpty } from "../core/nonempty.ts";
import { DEFAULT_VERSION_MATCH, type VersionMatchMode } from "../core/options.ts";
import {
  type BrokenReason,
  type BrokenRelation,
  positionKey,
  type RelationDeclaration,
  type RelationEdge,
  type RelationResolution,
  type ResolvedDeclaration,
  type ResolvedRelations,
  type SourcePosition,
} from "../core/relations.ts";
import type { TraceabilityId } from "../core/types.ts";
import { resolveTargetId } from "../extract/resolver.ts";

/**
 * IDs that are items: occurrences outside relation values (`referenceLines`).
 * Writing an ID in `trace_to` does not make it exist.
 */
export function itemsOf(
  ids: readonly TraceabilityId[],
  referenceLines: readonly SourcePosition[],
): TraceabilityId[] {
  const references = new Set(referenceLines.map(positionKey));
  return ids.filter((id) => !references.has(positionKey(id)));
}

/**
 * Resolve one declaration against the items (pure)
 *
 * Versioned targets match exactly; versionless targets follow `mode`
 * (`latest`: newest version, `all`: every version), as in extract mode.
 * A target not found is `VersionMissing` when it names a version and items with its
 * unique key exist, otherwise `NodeMissing`.
 */
export function resolveDeclaration(
  declaration: RelationDeclaration,
  items: readonly TraceabilityId[],
  mode: VersionMatchMode = DEFAULT_VERSION_MATCH,
): RelationResolution {
  const targets = resolveTargetId(declaration.target, items, mode).map((group) => group.fullId);
  return isNonEmpty(targets)
    ? { status: "resolved", targets }
    : { status: "broken", reason: brokenReason(declaration.target, items) };
}

/**
 * Resolve every declaration, in declaration order (pure)
 */
export function resolveDeclarations(
  declarations: readonly RelationDeclaration[],
  referenceLines: readonly SourcePosition[],
  ids: readonly TraceabilityId[],
  mode: VersionMatchMode = DEFAULT_VERSION_MATCH,
): ResolvedDeclaration[] {
  const items = itemsOf(ids, referenceLines);
  return declarations.map((declaration) => ({
    declaration,
    resolution: resolveDeclaration(declaration, items, mode),
  }));
}

/**
 * Connect each declaration to the IDs its target names (pure)
 *
 * See {@link resolveDeclaration} for how targets are matched.
 *
 * @returns edges without duplicates, and the declarations whose target is not found
 */
export function resolveRelations(
  declarations: readonly RelationDeclaration[],
  referenceLines: readonly SourcePosition[],
  ids: readonly TraceabilityId[],
  mode: VersionMatchMode = DEFAULT_VERSION_MATCH,
): ResolvedRelations {
  return edgesOf(resolveDeclarations(declarations, referenceLines, ids, mode));
}

/**
 * Edges (without duplicates) and broken declarations of resolved declarations (pure)
 */
export function edgesOf(resolved: readonly ResolvedDeclaration[]): ResolvedRelations {
  const edges = new Map<string, RelationEdge>();
  const broken: BrokenRelation[] = [];
  for (const { declaration, resolution } of resolved) {
    switch (resolution.status) {
      case "broken":
        broken.push({ ...declaration, reason: resolution.reason });
        break;
      case "resolved":
        for (const target of resolution.targets) {
          const key = `${declaration.kind}\0${declaration.source}\0${target}`;
          if (!edges.has(key)) {
            edges.set(key, {
              kind: declaration.kind,
              source: declaration.source,
              target,
              declaration,
            });
          }
        }
        break;
      default:
        assertNever(resolution);
    }
  }
  return { edges: [...edges.values()], broken };
}

/**
 * Why `target` matches no item (pure)
 */
export function brokenReason(target: string, items: readonly TraceabilityId[]): BrokenReason {
  if (!hasVersion(target)) return { kind: "NodeMissing" };
  const key = uniqueKeyOf(target);
  const versions = [
    ...new Set(items.filter((id) => uniqueKeyOf(id.fullId) === key).map((id) => id.version)),
  ];
  const existing = [
    ...versions.filter((v) => v !== "").sort(compareVersionsDesc),
    ...versions.filter((v) => v === ""),
  ].map((version) => withVersion(key, version));
  return isNonEmpty(existing) ? { kind: "VersionMissing", existing } : { kind: "NodeMissing" };
}
