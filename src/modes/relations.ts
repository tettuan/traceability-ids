/**
 * Relations mode - declared relations (`derived_from` / `trace_to`) as data.
 *
 * @module
 */

import { consoleIO, type ModeIO } from "../core/events.ts";
import { COMPLETE, lookupOutcome, type ModeOutcome } from "../core/outcome.ts";
import {
  DEFAULT_RELATION_DIRECTION,
  DEFAULT_VERSION_MATCH,
  type RelationDirection,
  type RelationsFormat,
  type VersionMatchMode,
} from "../core/options.ts";
import type { RelationKind, ResolutionStatus } from "../core/relations.ts";
import { type IdsSource, loadIds } from "../extract/loader.ts";
import { formatRelations } from "../formatter/relations_formatter.ts";
import { extractRelations } from "../relations/extract.ts";
import { edgesOf, itemsOf, resolveDeclarations } from "../relations/resolve.ts";
import { type RelationSelection, selectRelations } from "../relations/select.ts";
import { collectIds, emitResult, type InputSpec } from "./pipeline.ts";

/** Options of relations mode */
export interface RelationsModeOptions extends InputSpec {
  /** Output file (default: STDOUT) */
  outputFile?: string;
  /** Requested IDs (default: every declaration) */
  ids?: IdsSource;
  /** Direction seen from the requested IDs (only with `ids`; default: both) */
  direction?: RelationDirection;
  /** Relation fields to output */
  kinds: readonly RelationKind[];
  /** `resolved` declarations, or only the `broken` ones */
  status: ResolutionStatus;
  /** Version resolution for requested IDs and targets given without a version (default: latest) */
  versions?: VersionMatchMode;
  /** Output format */
  format: RelationsFormat;
}

/**
 * Run relations mode: one row per declaration, with where it is written
 *
 * Events: ModeStarted → TargetsLoaded? → (collectIds) → RelationIssueFound*
 * → RelationsResolved → RelationsSelected → Output*
 *
 * @returns `partial` with the requested IDs found nowhere (neither an item nor a declared target)
 */
export async function runRelationsMode(
  options: RelationsModeOptions,
  io: ModeIO = consoleIO,
): Promise<ModeOutcome> {
  io.report({ type: "ModeStarted", mode: "relations" });
  const targetIds = options.ids ? await loadIds(options.ids) : undefined;
  if (targetIds) io.report({ type: "TargetsLoaded", count: targetIds.length });

  const collected = await collectIds(options, io);
  if (!collected) return targetIds ? lookupOutcome(targetIds) : COMPLETE;

  const mode = options.versions ?? DEFAULT_VERSION_MATCH;
  const extracted = await extractRelations(collected.files, options.frontmatter);
  for (const issue of extracted.issues) io.report({ type: "RelationIssueFound", issue });
  const resolved = resolveDeclarations(
    extracted.declarations,
    extracted.referenceLines,
    collected.rawIds,
    mode,
  );
  const { edges, broken } = edgesOf(resolved);
  io.report({
    type: "RelationsResolved",
    declared: resolved.length,
    edges: edges.length,
    broken: broken.length,
  });

  const selection: RelationSelection = targetIds
    ? { kind: "ids", ids: targetIds, direction: options.direction ?? DEFAULT_RELATION_DIRECTION }
    : { kind: "all" };
  const items = itemsOf(collected.rawIds, extracted.referenceLines);
  const result = selectRelations(resolved, items, selection, options, mode);
  io.report({
    type: "RelationsSelected",
    rows: result.rows.length,
    notFound: result.missing.length,
  });

  await emitResult(io, formatRelations(result.rows, options.format), options.outputFile);
  return lookupOutcome(result.missing);
}
