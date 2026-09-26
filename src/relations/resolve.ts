/**
 * Resolution of declared relations to the extracted IDs they point to.
 *
 * @module
 */

import { DEFAULT_VERSION_MATCH, type VersionMatchMode } from "../core/options.ts";
import {
  positionKey,
  type RelationDeclaration,
  type RelationEdge,
  type ResolvedRelations,
  type SourcePosition,
} from "../core/relations.ts";
import type { TraceabilityId } from "../core/types.ts";
import { resolveTargetId } from "../extract/resolver.ts";

/**
 * Connect each declaration to the IDs its target names (pure)
 *
 * A target exists when it occurs somewhere other than in relation values
 * (`referenceLines`): writing an ID in `trace_to` does not make it exist.
 * Versioned targets match exactly; versionless targets follow `mode`
 * (`latest`: newest version, `all`: every version), as in extract mode.
 *
 * @returns edges without duplicates, and the declarations whose target is not found
 */
export function resolveRelations(
  declarations: readonly RelationDeclaration[],
  referenceLines: readonly SourcePosition[],
  ids: readonly TraceabilityId[],
  mode: VersionMatchMode = DEFAULT_VERSION_MATCH,
): ResolvedRelations {
  const references = new Set(referenceLines.map(positionKey));
  const items = ids.filter((id) => !references.has(positionKey(id)));

  const edges = new Map<string, RelationEdge>();
  const broken: RelationDeclaration[] = [];
  for (const declaration of declarations) {
    const groups = resolveTargetId(declaration.target, items, mode);
    if (groups.length === 0) {
      broken.push(declaration);
      continue;
    }
    for (const { fullId } of groups) {
      const key = `${declaration.kind}\0${declaration.source}\0${fullId}`;
      if (!edges.has(key)) {
        edges.set(key, {
          kind: declaration.kind,
          source: declaration.source,
          target: fullId,
          declaration,
        });
      }
    }
  }
  return { edges: [...edges.values()], broken };
}
