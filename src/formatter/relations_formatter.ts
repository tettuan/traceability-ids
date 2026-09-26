/**
 * Formatters of relations mode.
 *
 * @module
 */

import { assertNever } from "../core/errors.ts";
import type { RelationsFormat } from "../core/options.ts";
import {
  describeBrokenReason,
  describeDeclaration,
  positionKey,
  type RelationResolution,
} from "../core/relations.ts";
import type { RelationRow } from "../relations/select.ts";

/** Reason kind of a broken resolution; empty for a resolved one */
function reasonKind(resolution: RelationResolution): string {
  switch (resolution.status) {
    case "resolved":
      return "";
    case "broken":
      return resolution.reason.kind;
    default:
      return assertNever(resolution);
  }
}

/**
 * One line per row: `path:line: source -kind-> target`, plus ` (reason)` when broken
 */
export function formatRelationsAsSimple(rows: readonly RelationRow[]): string {
  return rows.map(({ declaration, resolution }) => {
    const line = describeDeclaration(declaration);
    switch (resolution.status) {
      case "resolved":
        return `${line}\n`;
      case "broken":
        return `${line} (${describeBrokenReason(resolution.reason)})\n`;
      default:
        return assertNever(resolution);
    }
  }).join("");
}

/**
 * Tab-separated, always 6 columns:
 * `direction kind source target path:line reason` (reason empty when resolved)
 */
export function formatRelationsAsTsv(rows: readonly RelationRow[]): string {
  return rows.map(({ direction, declaration, resolution }) =>
    [
      direction,
      declaration.kind,
      declaration.source,
      declaration.target,
      positionKey(declaration),
      reasonKind(resolution),
    ].join("\t") + "\n"
  ).join("");
}

/**
 * `{ rows: [{ direction, kind, source, target, filePath, lineNumber, resolution }] }`
 */
export function formatRelationsAsJson(rows: readonly RelationRow[]): string {
  return JSON.stringify(
    {
      rows: rows.map(({ direction, declaration, resolution }) => ({
        direction,
        kind: declaration.kind,
        source: declaration.source,
        target: declaration.target,
        filePath: declaration.filePath,
        lineNumber: declaration.lineNumber,
        resolution,
      })),
    },
    null,
    2,
  );
}

/**
 * Format rows in the given format
 */
export function formatRelations(rows: readonly RelationRow[], format: RelationsFormat): string {
  switch (format) {
    case "simple":
      return formatRelationsAsSimple(rows);
    case "tsv":
      return formatRelationsAsTsv(rows);
    case "json":
      return formatRelationsAsJson(rows);
    default:
      return assertNever(format);
  }
}
