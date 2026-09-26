/**
 * Selection of declared relations by the IDs they touch (relations mode).
 *
 * @module
 */

import { assertNever } from "../core/errors.ts";
import { hasVersion, uniqueKeyOf } from "../core/id.ts";
import type { NonEmptyArray } from "../core/nonempty.ts";
import type { RelationDirection, VersionMatchMode } from "../core/options.ts";
import type {
  RelationDeclaration,
  RelationKind,
  RelationResolution,
  ResolutionStatus,
  ResolvedDeclaration,
} from "../core/relations.ts";
import type { TraceabilityId } from "../core/types.ts";
import { selectIds } from "../extract/resolver.ts";

/** Which declarations to select */
export type RelationSelection =
  /** Every declaration (each seen from its declaring item: direction `out`) */
  | { kind: "all" }
  /** Declarations touching the requested IDs, in the given direction */
  | { kind: "ids"; ids: NonEmptyArray<string>; direction: RelationDirection };

/** Filters applied to every selection */
export interface RelationFilter {
  /** Relation fields to keep */
  kinds: readonly RelationKind[];
  /** Resolution status to keep */
  status: ResolutionStatus;
}

/** Direction of one row, seen from the requested IDs */
export type RowDirection = "in" | "out";

/** One selected declaration */
export interface RelationRow {
  /** `out`: the requested ID declares it; `in`: it points at the requested ID */
  direction: RowDirection;
  /** The declaration (target as written) */
  declaration: RelationDeclaration;
  /** What its target resolved to */
  resolution: RelationResolution;
}

/** Selected rows and the requested IDs found nowhere */
export interface RelationSelectionResult {
  /** Rows in declaration order */
  rows: RelationRow[];
  /** Requested IDs that are neither an item nor a declared target */
  missing: string[];
}

/**
 * Whether a declared target names a requested ID: the same full ID when the request
 * has a version, the same unique key otherwise
 */
function namesRequested(target: string, requested: string): boolean {
  return hasVersion(requested) ? target === requested : uniqueKeyOf(target) === requested;
}

/**
 * Select declarations (pure)
 *
 * - `out`: the declaring item is one the requested IDs resolve to
 * - `in`: a resolved target is one the requested IDs resolve to, or a broken target
 *   names a requested ID
 * - a declaration both `out` and `in` (self reference) is one `out` row
 *
 * @param resolved every declaration with its resolution
 * @param items IDs that are items (see `itemsOf`)
 */
export function selectRelations(
  resolved: readonly ResolvedDeclaration[],
  items: readonly TraceabilityId[],
  selection: RelationSelection,
  filter: RelationFilter,
  mode: VersionMatchMode,
): RelationSelectionResult {
  const kept = resolved.filter(({ declaration, resolution }) =>
    filter.kinds.includes(declaration.kind) && resolution.status === filter.status
  );
  switch (selection.kind) {
    case "all":
      return { rows: kept.map((r) => ({ direction: "out", ...r })), missing: [] };
    case "ids": {
      const { fullIds } = selectIds(selection.ids, items, mode);
      const pointsAt = ({ declaration, resolution }: ResolvedDeclaration): boolean => {
        switch (resolution.status) {
          case "resolved":
            return resolution.targets.some((target) => fullIds.has(target));
          case "broken":
            return selection.ids.some((id) => namesRequested(declaration.target, id));
          default:
            return assertNever(resolution);
        }
      };
      const out = selection.direction !== "in";
      const into = selection.direction !== "out";
      const rows: RelationRow[] = [];
      for (const r of kept) {
        if (out && fullIds.has(r.declaration.source)) rows.push({ direction: "out", ...r });
        else if (into && pointsAt(r)) rows.push({ direction: "in", ...r });
      }
      const missing = selection.ids.filter((id) =>
        selectIds([id], items, mode).missing.length > 0 &&
        !resolved.some(({ declaration }) => namesRequested(declaration.target, id))
      );
      return { rows, missing };
    }
    default:
      return assertNever(selection);
  }
}
