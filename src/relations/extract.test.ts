import { assertEquals } from "@std/assert";
import { RELATION_KINDS } from "../core/relations.ts";
import { extractRelationsFromText, yamlRegions } from "./extract.ts";

const ITEMS = `---
title: Doc
traceability:
  - id:
      full: req:auth:login-a1b2c3#v2
      level: req
    description: \`req:auth:login\` is not valid YAML, still read
    derived_from:
      - req:auth:base-d4e5f6#v1
    trace_to:
      - dsg:auth:session-g7h8i9
      - "spc:auth:token-j1k2l3#v1"
  - id:
      full: req:auth:logout-m4n5o6#v1
    derived_from: [req:auth:base-d4e5f6#v1]
    trace_to: []
---
# Body
`;

Deno.test("extractRelations - items in frontmatter: source is id.full, values keep their lines", () => {
  const result = extractRelationsFromText(ITEMS, "a.md");
  assertEquals(result.issues, []);
  assertEquals(
    result.declarations.map((d) => [d.kind, d.source, d.target, d.lineNumber]),
    [
      ["derived_from", "req:auth:login-a1b2c3#v2", "req:auth:base-d4e5f6#v1", 9],
      ["trace_to", "req:auth:login-a1b2c3#v2", "dsg:auth:session-g7h8i9", 11],
      ["trace_to", "req:auth:login-a1b2c3#v2", "spc:auth:token-j1k2l3#v1", 12],
      ["derived_from", "req:auth:logout-m4n5o6#v1", "req:auth:base-d4e5f6#v1", 15],
    ],
  );
  assertEquals(result.referenceLines.map((p) => p.lineNumber), [9, 11, 12, 15, 16]);
});

Deno.test("extractRelations - --skip-frontmatter reads only fenced yaml blocks in the body", () => {
  const text = `${ITEMS}
\`\`\`yaml
id: dsg:auth:session-g7h8i9#v1
trace_to:
  - req:auth:login-a1b2c3
\`\`\`
`;
  const result = extractRelationsFromText(text, "a.md", "skip");
  assertEquals(
    result.declarations.map((d) => [d.source, d.target, d.lineNumber]),
    [["dsg:auth:session-g7h8i9#v1", "req:auth:login-a1b2c3", 23]],
  );
  assertEquals(extractRelationsFromText(text, "a.md").declarations.length, 5);
});

Deno.test("extractRelations - top-level id of the frontmatter is the source", () => {
  const text = "---\nid: spc:w:list-a1b2c3#v1\ntrace_to:\n  - us:w:story-d4e5f6#v1\n---\n";
  const [decl] = extractRelationsFromText(text, "a.md").declarations;
  assertEquals([decl.source, decl.target], ["spc:w:list-a1b2c3#v1", "us:w:story-d4e5f6#v1"]);
});

Deno.test("extractRelations - without an own ID nothing is declared and SourceMissing is reported", () => {
  const text =
    "---\ntrace_id: REQ-2025-001\ntrace_to:\n  - req:a:x-a1b2c3#v1\n  - req:a:y-d4e5f6#v1\n---\n";
  const result = extractRelationsFromText(text, "a.md");
  assertEquals(result.declarations, []);
  assertEquals(result.issues, [{
    kind: "SourceMissing",
    relation: "trace_to",
    targets: ["req:a:x-a1b2c3#v1", "req:a:y-d4e5f6#v1"],
    filePath: "a.md",
    lineNumber: 4,
  }]);
});

Deno.test("extractRelations - empty relations need no source", () => {
  const text = "---\ntype: requirements\nderived_from: []\ntrace_to:\n---\n";
  assertEquals(extractRelationsFromText(text, "a.md"), {
    declarations: [],
    referenceLines: [{ filePath: "a.md", lineNumber: 3 }],
    issues: [],
  });
});

Deno.test("extractRelations - a value that is not an ID is InvalidTarget", () => {
  const text = "---\nid: spc:s:off-a1b2c3#v1\ntrace_to:\n  - us:stock:reliability\n---\n";
  const result = extractRelationsFromText(text, "a.md");
  assertEquals(result.declarations, []);
  assertEquals(result.issues, [{
    kind: "InvalidTarget",
    relation: "trace_to",
    value: "us:stock:reliability",
    filePath: "a.md",
    lineNumber: 4,
  }]);
});

Deno.test("extractRelations - a sibling item's id is not borrowed", () => {
  const text = `\`\`\`yaml
items:
  - id: req:a:first-a1b2c3#v1
    summary: first
  - summary: second has no id
    trace_to:
      - req:a:other-d4e5f6#v1
\`\`\`
`;
  const result = extractRelationsFromText(text, "a.md");
  assertEquals(result.declarations, []);
  assertEquals(result.issues.map((i) => i.kind), ["SourceMissing"]);
});

Deno.test("yamlRegions - unclosed fence and yaml outside fences are ignored", () => {
  assertEquals(yamlRegions("trace_to:\n  - a\n```yaml\nid: x\n", "include"), []);
  assertEquals(yamlRegions("```yml\nid: x\n```\n", "include"), [{
    firstLine: 2,
    lines: ["id: x"],
  }]);
});

Deno.test("extractRelations - every relation kind is read, inline or as a list", () => {
  const source = "req:a:src-a1b2c3#v1";
  const target = "req:a:dst-d4e5f6#v1";
  for (const kind of RELATION_KINDS) {
    for (const body of [`${kind}: [${target}]`, `${kind}:\n  - ${target}`]) {
      const text = `---\nid: ${source}\n${body}\n---\n`;
      const [declaration] = extractRelationsFromText(text, "a.md").declarations;
      assertEquals([declaration.kind, declaration.source, declaration.target], [
        kind,
        source,
        target,
      ]);
    }
  }
});
