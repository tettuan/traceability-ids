/**
 * YAML regions of a document and YAML comment handling, shared by the relation readers.
 *
 * @module
 */

import { frontmatterLineCount } from "../core/frontmatter.ts";
import type { FrontmatterPolicy } from "../core/options.ts";

/** Lines of YAML found in a file */
export interface YamlRegion {
  /** 1-based line number of the first line */
  firstLine: number;
  /** Lines of the region */
  lines: readonly string[];
}

/** Opening or closing code fence: indentation, fence (``` or ~~~, 3 or more), info string */
const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;

/**
 * YAML regions of a file, in order: frontmatter (when included), then fenced code blocks
 * whose info string is `yaml` or `yml` (case-insensitive; attributes after it allowed)
 *
 * Fences are ``` or ~~~, 3 or more; a block closes at a fence of the same character that
 * is at least as long and has no info string. The contents of other blocks (for example a
 * ```` ````markdown ```` example holding a ```` ```yaml ```` block) are skipped. An unclosed
 * block ends the scan.
 */
export function yamlRegions(content: string, frontmatter: FrontmatterPolicy): YamlRegion[] {
  const lines = content.split("\n").map((line) => line.replace(/\r$/, ""));
  const regions: YamlRegion[] = [];
  const bodyStart = frontmatterLineCount(lines);
  if (bodyStart > 0 && frontmatter !== "skip") {
    regions.push({ firstLine: 2, lines: lines.slice(1, bodyStart - 1) });
  }
  for (let i = bodyStart; i < lines.length; i++) {
    const open = lines[i].match(FENCE);
    if (!open) continue;
    const [, , fence, info] = open;
    if (fence[0] === "`" && info.includes("`")) continue; // inline code, not a fence
    const close = lines.findIndex((line, j) => {
      const m = j > i ? line.match(FENCE) : null;
      return m !== null && m[2][0] === fence[0] && m[2].length >= fence.length &&
        m[3].trim() === "";
    });
    if (close === -1) break;
    if (/^ya?ml$/i.test(info.trim().split(/[\s{]/)[0])) {
      regions.push({ firstLine: i + 2, lines: lines.slice(i + 1, close) });
    }
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
