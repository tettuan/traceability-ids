/**
 * Extraction of declared relations (`derived_from` / `trace_to`) from documents.
 *
 * Relations are read from YAML regions:
 *
 * - the frontmatter, unless the frontmatter policy is `skip`,
 * - fenced ` ```yaml ` / ` ```yml ` blocks in the body.
 *
 * In a region, every mapping holding `derived_from` or `trace_to` declares relations.
 * Their source is the mapping's own `id`: an ID (`id: req:a:b-abc#v1`) or a nested
 * `full` (`id:` / `full: req:a:b-abc#v1`). Without an own ID the relations are not drawn
 * and `SourceMissing` is reported; a file never stands in for an ID.
 *
 * A YAML comment (`#` at the start of a value or after whitespace, outside quotes) is
 * removed before a value is read, so `derived_from:  # note` is a key whose values are
 * the list under it; the `#` of a version (`...-a1b2c3#v1`) is not a comment.
 *
 * Regions are read line by line from their indentation, not by a YAML parser, so
 * documents that are not strictly valid YAML (a plain scalar starting with a backquote,
 * for example) still yield their relations, like IDs are found in any text.
 *
 * @module
 */

import { frontmatterLineCount } from "../core/frontmatter.ts";
import { findIds } from "../core/id.ts";
import { readText } from "../core/io.ts";
import { isNonEmpty } from "../core/nonempty.ts";
import { DEFAULT_FRONTMATTER, type FrontmatterPolicy } from "../core/options.ts";
import { type ExtractedRelations, isRelationKind, type SourcePosition } from "../core/relations.ts";

/** Lines of YAML found in a file */
export interface YamlRegion {
  /** 1-based line number of the first line */
  firstLine: number;
  /** Lines of the region */
  lines: readonly string[];
}

/** A line of a region, as far as its structure matters */
type Line =
  | { kind: "blank" }
  /** `key: value` or `- key: value`; `column` is where the key starts */
  | { kind: "key"; column: number; item: boolean; key: string; value: string }
  /** Anything else (list scalar, continuation text); `column` is its indentation */
  | { kind: "other"; column: number; item: boolean; value: string };

const FENCE_OPEN = /^\s*```\s*ya?ml\s*$/;
const FENCE_CLOSE = /^\s*```\s*$/;
const KEY_LINE = /^(\s*)(-\s+)?([A-Za-z_][\w-]*)\s*:(?:\s+(.*))?$/;
const ITEM_LINE = /^(\s*)-(?:\s+(.*))?$/;
const EMPTY_VALUES = new Set(["", "[]", "~", "null"]);

/**
 * YAML regions of a file, in order: frontmatter (when included), then fenced YAML blocks
 */
export function yamlRegions(content: string, frontmatter: FrontmatterPolicy): YamlRegion[] {
  const lines = content.split("\n").map((line) => line.replace(/\r$/, ""));
  const regions: YamlRegion[] = [];
  const bodyStart = frontmatterLineCount(lines);
  if (bodyStart > 0 && frontmatter !== "skip") {
    regions.push({ firstLine: 2, lines: lines.slice(1, bodyStart - 1) });
  }
  for (let i = bodyStart; i < lines.length; i++) {
    if (!FENCE_OPEN.test(lines[i])) continue;
    const close = lines.findIndex((line, j) => j > i && FENCE_CLOSE.test(line));
    if (close === -1) break;
    regions.push({ firstLine: i + 2, lines: lines.slice(i + 1, close) });
    i = close;
  }
  return regions;
}

/**
 * A value without its YAML comment, trimmed (pure)
 *
 * A comment starts at `#` that begins the value or follows whitespace, outside single
 * or double quotes. `#` right after other characters (`...-a1b2c3#v1`) is kept.
 */
export function stripYamlComment(value: string): string {
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quote === '"' && ch === "\\") {
      i++;
    } else if (quote !== null) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "#" && (i === 0 || /\s/.test(value[i - 1]))) {
      return value.substring(0, i).trim();
    }
  }
  return value.trim();
}

function classify(text: string): Line {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return { kind: "blank" };
  const key = text.match(KEY_LINE);
  if (key) {
    return {
      kind: "key",
      column: key[1].length + (key[2]?.length ?? 0),
      item: key[2] !== undefined,
      key: key[3],
      value: stripYamlComment(key[4] ?? ""),
    };
  }
  const item = text.match(ITEM_LINE);
  return item
    ? { kind: "other", column: item[1].length, item: true, value: stripYamlComment(item[2] ?? "") }
    : {
      kind: "other",
      column: text.length - text.trimStart().length,
      item: false,
      value: stripYamlComment(trimmed),
    };
}

/**
 * Whether a line is a list item written at the column of the mapping's keys
 * (`key:` / `- value`, a sequence value of a sibling key, not a new item)
 */
function isCompactItem(line: Line, column: number): boolean {
  return line.kind === "other" && line.item && line.column === column;
}

/**
 * Indexes of the key lines of the mapping that holds the key line at `at`
 */
function mappingKeys(lines: readonly Line[], at: number, column: number): number[] {
  const keys = [at];
  const current = lines[at];
  const startsHere = current.kind === "key" && current.item;
  // upward, until the item start or a shallower line
  for (let j = at - 1; j >= 0 && !startsHere; j--) {
    const line = lines[j];
    if (line.kind === "blank" || line.column > column || isCompactItem(line, column)) continue;
    if (line.kind === "other" || line.column < column) break;
    keys.unshift(j);
    if (line.item) break;
  }
  // downward, until the next item or a shallower line
  for (let j = at + 1; j < lines.length; j++) {
    const line = lines[j];
    if (line.kind === "blank" || line.column > column || isCompactItem(line, column)) continue;
    if (line.kind === "other" || line.column < column || line.item) break;
    keys.push(j);
  }
  return keys;
}

/**
 * Own ID of the mapping: `id: <ID>`, or `full: <ID>` nested under `id:`
 */
function ownId(lines: readonly Line[], keys: readonly number[], column: number): string | null {
  const at = keys.find((i) => {
    const line = lines[i];
    return line.kind === "key" && line.key === "id";
  });
  if (at === undefined) return null;
  const idLine = lines[at];
  if (idLine.kind === "key" && idLine.value !== "") return findIds(idLine.value)[0]?.fullId ?? null;
  for (let j = at + 1; j < lines.length; j++) {
    const line = lines[j];
    if (line.kind === "blank") continue;
    if (line.column <= column) break;
    if (line.kind === "key" && line.key === "full") return findIds(line.value)[0]?.fullId ?? null;
  }
  return null;
}

/**
 * Values of the relation key at `at`: its inline value, or the list items under it
 */
function relationValues(
  lines: readonly Line[],
  at: number,
  column: number,
): { index: number; value: string }[] {
  const key = lines[at];
  if (key.kind === "key" && key.value !== "") return [{ index: at, value: key.value }];
  const values: { index: number; value: string }[] = [];
  for (let j = at + 1; j < lines.length; j++) {
    const line = lines[j];
    if (line.kind === "blank") continue;
    if (line.kind !== "other" || !line.item || line.column < column) break;
    values.push({ index: j, value: line.value });
  }
  return values;
}

function unquote(value: string): string {
  return value.replace(/^(["'])(.*)\1$/, "$2");
}

/**
 * Extract declared relations from a text (pure)
 *
 * @param content File content
 * @param filePath Path recorded in positions
 * @param frontmatter Whether relations in the frontmatter are read (default: include)
 */
export function extractRelationsFromText(
  content: string,
  filePath: string,
  frontmatter: FrontmatterPolicy = DEFAULT_FRONTMATTER,
): ExtractedRelations {
  const result: ExtractedRelations = { declarations: [], referenceLines: [], issues: [] };
  for (const region of yamlRegions(content, frontmatter)) {
    const lines = region.lines.map(classify);
    const at = (index: number): SourcePosition => ({
      filePath,
      lineNumber: region.firstLine + index,
    });

    lines.forEach((line, i) => {
      if (line.kind !== "key" || !isRelationKind(line.key)) return;
      const relation = line.key;
      const values = relationValues(lines, i, line.column);
      result.referenceLines.push(...values.map((v) => at(v.index)));

      const targets: { target: string; index: number }[] = [];
      for (const { index, value } of values) {
        const found = findIds(value);
        if (found.length > 0) {
          targets.push(...found.map((id) => ({ target: id.fullId, index })));
        } else if (!EMPTY_VALUES.has(value)) {
          result.issues.push({
            kind: "InvalidTarget",
            relation,
            value: unquote(value),
            ...at(index),
          });
        }
      }
      if (!isNonEmpty(targets)) return;

      const source = ownId(lines, mappingKeys(lines, i, line.column), line.column);
      if (source === null) {
        const names = targets.map((t) => t.target);
        if (isNonEmpty(names)) {
          result.issues.push({
            kind: "SourceMissing",
            relation,
            targets: names,
            ...at(targets[0].index),
          });
        }
        return;
      }
      for (const { target, index } of targets) {
        result.declarations.push({ kind: relation, source, target, ...at(index) });
      }
    });
  }
  return result;
}

/**
 * Extract declared relations from files
 *
 * @throws TraceabilityError `PathNotFound` | `PathAccessDenied` | `FileReadFailed`
 */
export async function extractRelations(
  filePaths: readonly string[],
  frontmatter: FrontmatterPolicy = DEFAULT_FRONTMATTER,
): Promise<ExtractedRelations> {
  const result: ExtractedRelations = { declarations: [], referenceLines: [], issues: [] };
  for (const filePath of filePaths) {
    const found = extractRelationsFromText(await readText(filePath), filePath, frontmatter);
    result.declarations.push(...found.declarations);
    result.referenceLines.push(...found.referenceLines);
    result.issues.push(...found.issues);
  }
  return result;
}
