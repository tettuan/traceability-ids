/**
 * Relations between traceability IDs: `derived_from` (派生元) and `trace_to` (追跡先・参照先).
 *
 * Only the referencing item declares a relation; the referenced item does not know it.
 * A relation is a directed edge from the declaring item (source) to the ID it names
 * (target). It says nothing about the level hierarchy. See docs/trace-relations.md.
 *
 * @module
 */

import { assertNever } from "./errors.ts";
import { versionOf } from "./id.ts";
import type { NonEmptyArray } from "./nonempty.ts";

/** Relation fields */
export const RELATION_KINDS = ["derived_from", "trace_to"] as const;
/** Relation field: `derived_from` (派生元) or `trace_to` (追跡先・参照先) */
export type RelationKind = typeof RELATION_KINDS[number];
/** Meaning of each relation field */
export const RELATION_LABELS: { readonly [K in RelationKind]: string } = {
  "derived_from": "派生元",
  "trace_to": "追跡先（参照先）",
};

/**
 * Whether a string names a relation field
 */
export function isRelationKind(value: string): value is RelationKind {
  return (RELATION_KINDS as readonly string[]).includes(value);
}

/** Where something was written */
export interface SourcePosition {
  /** File path */
  filePath: string;
  /** 1-based line number */
  lineNumber: number;
}

/** A relation as declared by the referencing item */
export interface RelationDeclaration extends SourcePosition {
  /** Relation field */
  kind: RelationKind;
  /** Full ID of the declaring item */
  source: string;
  /** Target ID as written (with or without version); position is the line it is written on */
  target: string;
}

/** A declared relation connected to an extracted ID */
export interface RelationEdge {
  /** Relation field */
  kind: RelationKind;
  /** Full ID of the declaring item */
  source: string;
  /** Full ID the target resolved to */
  target: string;
  /** The declaration it comes from */
  declaration: RelationDeclaration;
}

/**
 * A declaration that could not become an edge (reported as a warning, nothing is drawn)
 *
 * - `SourceMissing`: relations are declared where no own ID of the declaring item exists
 * - `InvalidTarget`: a relation value is not a traceability ID
 */
export type RelationIssue =
  | (SourcePosition & {
    kind: "SourceMissing";
    relation: RelationKind;
    targets: NonEmptyArray<string>;
  })
  | (SourcePosition & { kind: "InvalidTarget"; relation: RelationKind; value: string });

/**
 * Why a declared target was not found
 *
 * - `NodeMissing`: no item has the target's unique key (a broken link)
 * - `VersionMissing`: the target names a version, and items with its unique key exist,
 *   but none with that version. `existing` are their full IDs, newest first
 *   (the unique key itself when the item is written without a version)
 */
export type BrokenReason =
  | { kind: "NodeMissing" }
  | { kind: "VersionMissing"; existing: NonEmptyArray<string> };

/** A declaration whose target was not found, with the reason */
export interface BrokenRelation extends RelationDeclaration {
  /** Why the target was not found */
  reason: BrokenReason;
}

/** What a declaration resolved to */
export type RelationResolution =
  /** Full IDs its target resolved to */
  | { status: "resolved"; targets: NonEmptyArray<string> }
  /** Its target was not found */
  | { status: "broken"; reason: BrokenReason };

/** Status of a resolution: `resolved` or `broken` */
export type ResolutionStatus = RelationResolution["status"];

/** A declaration and what it resolved to */
export interface ResolvedDeclaration {
  /** The declaration */
  declaration: RelationDeclaration;
  /** What its target resolved to */
  resolution: RelationResolution;
}

/** Relations declared in the input, and what could not be read as relations */
export interface ExtractedRelations {
  /** Declarations, in file and document order */
  declarations: RelationDeclaration[];
  /** Positions of the lines holding relation values (IDs there are references, not items) */
  referenceLines: SourcePosition[];
  /** Warnings */
  issues: RelationIssue[];
}

/** Declarations resolved against the extracted IDs */
export interface ResolvedRelations {
  /** Edges, without duplicates */
  edges: RelationEdge[];
  /** Declarations whose target is not found anywhere but in relation values */
  broken: BrokenRelation[];
}

/** `path:line` of a position */
export function positionKey(position: SourcePosition): string {
  return `${position.filePath}:${position.lineNumber}`;
}

/**
 * Warning line of a relation issue
 */
export function describeRelationIssue(issue: RelationIssue): string {
  const at = positionKey(issue);
  switch (issue.kind) {
    case "SourceMissing":
      return `${at}: ${issue.relation} has no own ID to start from; ignored ${issue.targets.length} target(s)`;
    case "InvalidTarget":
      return `${at}: ${issue.relation} value is not a traceability ID: ${issue.value}`;
    default:
      return assertNever(issue);
  }
}

/**
 * Line of a declared relation: `path:line: source -kind-> target`
 */
export function describeDeclaration(declaration: RelationDeclaration): string {
  return `${
    positionKey(declaration)
  }: ${declaration.source} -${declaration.kind}-> ${declaration.target}`;
}

/**
 * Text of a broken reason, e.g. `version not found: node exists with 20260101`
 */
export function describeBrokenReason(reason: BrokenReason): string {
  switch (reason.kind) {
    case "NodeMissing":
      return "node not found";
    case "VersionMissing":
      return `version not found: node exists with ${
        reason.existing.map((id) => versionOf(id) || "no version").join(", ")
      }`;
    default:
      return assertNever(reason);
  }
}

/**
 * Line of a broken relation: `path:line: source -kind-> target (reason)`
 */
export function describeBrokenRelation(relation: BrokenRelation): string {
  return `${describeDeclaration(relation)} (${describeBrokenReason(relation.reason)})`;
}
