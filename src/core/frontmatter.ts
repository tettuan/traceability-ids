/**
 * Frontmatter detection.
 *
 * Frontmatter is a block at the very start of a file that opens with a `---` line
 * and closes with the next `---` or `...` line. A file without a closing line has
 * no frontmatter.
 *
 * @module
 */

const OPEN = /^﻿?---\s*$/;
const CLOSE = /^(---|\.\.\.)\s*$/;

/**
 * Number of leading lines that form the frontmatter, closing line included
 *
 * @param lines Lines of the file
 * @returns 0 when the file has no frontmatter
 */
export function frontmatterLineCount(lines: readonly string[]): number {
  if (lines.length === 0 || !OPEN.test(lines[0])) return 0;
  const close = lines.findIndex((line, i) => i > 0 && CLOSE.test(line.replace(/\r$/, "")));
  return close === -1 ? 0 : close + 1;
}
