/**
 * Reading relations with a YAML parser, then locating them in the region's lines.
 *
 * What the relations are (which mapping declares them, its own ID, the values) is decided
 * by the YAML parser (`@std/yaml`), so every valid YAML form is read: block and flow
 * collections over several lines, quoted keys, block scalars, anchors and aliases, merge
 * keys, several documents.
 *
 * Line numbers are then found by searching the region: for each relation, in document
 * order, the next `derived_from:` / `trace_to:` key, then each value ID after it; a matched
 * occurrence is used once. Comments and block scalar text are not searched. A value that
 * is not found this way (an alias of a value written earlier) is placed on its key line.
 *
 * @module
 */

import { parseAll } from "@std/yaml";
import { findIds, idSearchPattern } from "../core/id.ts";
import { isNonEmpty } from "../core/nonempty.ts";
import {
  type ExtractedRelations,
  isRelationKind,
  type RelationKind,
  type SourcePosition,
} from "../core/relations.ts";
import { stripYamlComment, type YamlRegion } from "./region.ts";

/** A relation as the parser sees it, in document order */
interface ParsedRelation {
  kind: RelationKind;
  /** Own ID of the declaring mapping, or `null` */
  source: string | null;
  /** Values, each an ID list or a value that is not an ID */
  values: ParsedValue[];
}

/** One relation value */
type ParsedValue =
  /** A value naming one or more IDs */
  | { kind: "ids"; ids: string[] }
  /** A value that names no ID, as text */
  | { kind: "invalid"; text: string };

/** Something found in the region's text: a relation key or an ID */
type Token =
  | { kind: "key"; key: RelationKind; line: number }
  | { kind: "id"; id: string; line: number };

/** Relation key in a line: at the start, after `- `, `{` or `,`; optionally quoted */
const RELATION_KEY = /(?<=^|[\s{,])(["']?)(derived_from|trace_to)\1\s*:(?=\s|$|[[{])/g;
/** A line opening a block scalar (`key: |`, `- >-`, ...) */
const BLOCK_SCALAR = /(?:^|:|-)\s*[|>][-+0-9]*$/;

/**
 * Own ID of a mapping: `id: <ID>`, or `full: <ID>` nested under `id:`
 */
function ownIdOf(mapping: Record<string, unknown>): string | null {
  const id = mapping.id;
  if (typeof id === "string") return findIds(id)[0]?.fullId ?? null;
  if (isMapping(id) && typeof id.full === "string") return findIds(id.full)[0]?.fullId ?? null;
  return null;
}

function isMapping(node: unknown): node is Record<string, unknown> {
  return typeof node === "object" && node !== null && !Array.isArray(node) &&
    !(node instanceof Date);
}

/**
 * Values of a relation: a sequence (nested ones flattened) or a single value;
 * `null` and empty strings are no value
 */
function valuesOf(node: unknown): ParsedValue[] {
  if (node === null || node === undefined) return [];
  if (Array.isArray(node)) return node.flatMap(valuesOf);
  if (isMapping(node)) {
    const id = ownIdOf(node);
    return [id ? { kind: "ids", ids: [id] } : { kind: "invalid", text: JSON.stringify(node) }];
  }
  const text = node instanceof Date ? node.toISOString() : String(node).trim();
  if (text === "") return [];
  const ids = findIds(text).map((id) => id.fullId);
  return [ids.length > 0 ? { kind: "ids", ids } : { kind: "invalid", text }];
}

/**
 * Relations of a parsed document, in document order (relation values are not descended)
 */
function relationsOf(node: unknown, out: ParsedRelation[]): void {
  if (Array.isArray(node)) {
    for (const item of node) relationsOf(item, out);
    return;
  }
  if (!isMapping(node)) return;
  for (const [key, value] of Object.entries(node)) {
    if (isRelationKind(key)) {
      out.push({ kind: key, source: ownIdOf(node), values: valuesOf(value) });
    } else {
      relationsOf(value, out);
    }
  }
}

/**
 * Relation keys and IDs of the region's text, in order, outside comments and block scalars
 */
function tokensOf(region: YamlRegion): Token[] {
  const tokens: Token[] = [];
  let scalarIndent = -1; // indentation of the line opening a block scalar, -1 when outside
  region.lines.forEach((raw, index) => {
    const indent = raw.length - raw.trimStart().length;
    if (scalarIndent >= 0) {
      if (raw.trim() === "" || indent > scalarIndent) return;
      scalarIndent = -1;
    }
    const text = stripYamlComment(raw);
    const line = region.firstLine + index;
    const found: { column: number; token: Token }[] = [];
    for (const m of text.matchAll(RELATION_KEY)) {
      found.push({ column: m.index, token: { kind: "key", key: m[2] as RelationKind, line } });
    }
    for (const m of text.matchAll(idSearchPattern())) {
      found.push({ column: m.index, token: { kind: "id", id: m[0], line } });
    }
    found.sort((a, b) => a.column - b.column);
    tokens.push(...found.map((f) => f.token));
    if (BLOCK_SCALAR.test(text)) scalarIndent = indent;
  });
  return tokens;
}

/**
 * Read the relations of a region with the YAML parser (pure)
 *
 * @returns the relations, or why and where the region is not valid YAML
 */
export function readRelationsByYaml(region: YamlRegion, filePath: string): YamlReading {
  let documents: unknown[];
  try {
    documents = parseAll(region.lines.join("\n")) as unknown[];
  } catch (error) {
    return { kind: "invalid", ...syntaxErrorOf(error, region) };
  }
  const relations: ParsedRelation[] = [];
  for (const document of documents) relationsOf(document, relations);

  const result: ExtractedRelations = { declarations: [], referenceLines: [], issues: [] };
  const at = (line: number): SourcePosition => ({ filePath, lineNumber: line });
  const referenced = new Set<number>();
  const tokens = tokensOf(region);
  let cursor = 0;

  /** Next token matching, from the cursor; advances the cursor past it */
  const take = (match: (token: Token) => boolean): Token | undefined => {
    const index = tokens.findIndex((token, i) => i >= cursor && match(token));
    if (index === -1) return undefined;
    cursor = index + 1;
    return tokens[index];
  };

  for (const relation of relations) {
    const key = take((t) => t.kind === "key" && t.key === relation.kind);
    const keyLine = key?.line ?? region.firstLine;
    if (key) referenced.add(keyLine);

    const targets: { target: string; line: number }[] = [];
    let lastLine = keyLine;
    for (const value of relation.values) {
      if (value.kind === "invalid") {
        result.issues.push({
          kind: "InvalidTarget",
          relation: relation.kind,
          value: value.text,
          ...at(lineOf(region, value.text, lastLine) ?? lastLine),
        });
        continue;
      }
      for (const id of value.ids) {
        const found = take((t) => t.kind === "id" && t.id === id);
        const line = found?.line ?? keyLine;
        if (found) {
          referenced.add(line);
          lastLine = line;
        }
        targets.push({ target: id, line });
      }
    }
    if (!isNonEmpty(targets)) continue;

    if (relation.source === null) {
      const names = targets.map((t) => t.target);
      if (isNonEmpty(names)) {
        result.issues.push({
          kind: "SourceMissing",
          relation: relation.kind,
          targets: names,
          ...at(targets[0].line),
        });
      }
      continue;
    }
    for (const { target, line } of targets) {
      result.declarations.push({
        kind: relation.kind,
        source: relation.source,
        target,
        ...at(line),
      });
    }
  }
  result.referenceLines.push(...[...referenced].sort((a, b) => a - b).map(at));
  return { kind: "read", relations: result };
}

/** Result of reading a region with the YAML parser */
export type YamlReading =
  | { kind: "read"; relations: ExtractedRelations }
  /** Not valid YAML: the parser's reason and the line it points at */
  | { kind: "invalid"; reason: string; lineNumber: number };

/**
 * Reason and line of a parse error (`... at line N, column M: ...`); the region's first
 * line when the error names no line
 */
function syntaxErrorOf(error: unknown, region: YamlRegion): { reason: string; lineNumber: number } {
  const message = (error instanceof Error ? error.message : String(error)).split("\n")[0];
  const match = message.match(/^(.*?)\s+at line (\d+)/);
  const line = match ? Number(match[2]) : 1;
  return {
    reason: (match ? match[1] : message).trim(),
    lineNumber: region.firstLine + Math.min(Math.max(line, 1), region.lines.length) - 1,
  };
}

/**
 * First line at or after `from` whose text (without comment) contains `text`
 */
function lineOf(region: YamlRegion, text: string, from: number): number | undefined {
  const start = Math.max(0, from - region.firstLine);
  const index = region.lines.findIndex((line, i) =>
    i >= start && stripYamlComment(line).includes(text)
  );
  return index === -1 ? undefined : region.firstLine + index;
}
