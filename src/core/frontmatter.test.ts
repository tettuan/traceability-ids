import { assertEquals } from "@std/assert";
import { extractIdsFromText } from "./extractor.ts";
import { frontmatterLineCount } from "./frontmatter.ts";

function count(text: string): number {
  return frontmatterLineCount(text.split("\n"));
}

Deno.test("frontmatterLineCount - closed by --- or ...", () => {
  assertEquals(count("---\na: 1\n---\nbody"), 3);
  assertEquals(count("---\na: 1\n...\nbody"), 3);
  assertEquals(count("---\n---\nbody"), 2);
});

Deno.test("frontmatterLineCount - CRLF, BOM and trailing spaces", () => {
  assertEquals(count("---\r\na: 1\r\n---\r\nbody"), 3);
  assertEquals(count("﻿---\na: 1\n---  \nbody"), 3);
});

Deno.test("frontmatterLineCount - no frontmatter", () => {
  assertEquals(count(""), 0);
  assertEquals(count("# title\n---\nx\n---"), 0);
  assertEquals(count(" ---\na\n---"), 0);
  assertEquals(count("---\nunclosed: true\nbody"), 0);
});

Deno.test("extractIdsFromText - skip keeps body IDs with original line numbers", () => {
  const text = "---\ntrace_to:\n  - req:a:b-1f#v1\n---\n# req:a:c-2f#v1\n";
  assertEquals(
    extractIdsFromText(text, "/f", "include").map((id) => [id.fullId, id.lineNumber]),
    [["req:a:b-1f#v1", 3], ["req:a:c-2f#v1", 5]],
  );
  assertEquals(
    extractIdsFromText(text, "/f", "skip").map((id) => [id.fullId, id.lineNumber]),
    [["req:a:c-2f#v1", 5]],
  );
});
