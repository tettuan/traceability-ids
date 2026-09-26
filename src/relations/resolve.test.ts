import { assertEquals } from "@std/assert";
import type { VersionMatchMode } from "../core/options.ts";
import type { ResolvedRelations } from "../core/relations.ts";
import { extractIdsFromText } from "../core/extractor.ts";
import { extractRelationsFromText } from "./extract.ts";
import { resolveRelations } from "./resolve.ts";

const FILES = {
  "req.md": "# req:a:login-a1b2c3#v1\n# req:a:login-a1b2c3#v2\n",
  "dsg.md": `---
id: dsg:a:session-d4e5f6#v1
derived_from:
  - req:a:login-a1b2c3
trace_to:
  - spc:a:missing-g7h8i9#v1
  - req:a:login-a1b2c3#v1
---
`,
};

function resolve(mode: VersionMatchMode): ResolvedRelations {
  const entries = Object.entries(FILES);
  const ids = entries.flatMap(([path, text]) => extractIdsFromText(text, path));
  const relations = entries.map(([path, text]) => extractRelationsFromText(text, path));
  return resolveRelations(
    relations.flatMap((r) => r.declarations),
    relations.flatMap((r) => r.referenceLines),
    ids,
    mode,
  );
}

Deno.test("resolveRelations - versionless target goes to the latest version; versioned is exact", () => {
  const { edges, broken } = resolve("latest");
  assertEquals(edges.map((e) => [e.kind, e.source, e.target]), [
    ["derived_from", "dsg:a:session-d4e5f6#v1", "req:a:login-a1b2c3#v2"],
    ["trace_to", "dsg:a:session-d4e5f6#v1", "req:a:login-a1b2c3#v1"],
  ]);
  assertEquals(broken.map((b) => [b.target, b.lineNumber]), [["spc:a:missing-g7h8i9#v1", 6]]);
});

Deno.test("resolveRelations - all: versionless target goes to every version", () => {
  assertEquals(resolve("all").edges.filter((e) => e.kind === "derived_from").map((e) => e.target), [
    "req:a:login-a1b2c3#v2",
    "req:a:login-a1b2c3#v1",
  ]);
});

Deno.test("resolveRelations - an ID written only in relation values does not exist", () => {
  const text = "---\nid: req:a:x-a1b2c3#v1\ntrace_to:\n  - req:a:y-d4e5f6#v1\n---\n";
  const relations = extractRelationsFromText(text, "a.md");
  const ids = extractIdsFromText(text, "a.md");
  const result = resolveRelations(relations.declarations, relations.referenceLines, ids);
  assertEquals(result.edges, []);
  assertEquals(result.broken.map((b) => b.target), ["req:a:y-d4e5f6#v1"]);
});

Deno.test("resolveRelations - the same relation declared twice is one edge", () => {
  const block = "```yaml\nid: req:a:x-a1b2c3#v1\ntrace_to:\n  - req:a:y-d4e5f6#v1\n```\n";
  const text = `${block}${block}# req:a:y-d4e5f6#v1\n`;
  const relations = extractRelationsFromText(text, "a.md");
  const ids = extractIdsFromText(text, "a.md");
  const result = resolveRelations(relations.declarations, relations.referenceLines, ids);
  assertEquals(relations.declarations.length, 2);
  assertEquals(result.edges.length, 1);
});
