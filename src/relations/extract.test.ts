import { assertEquals } from "@std/assert";
import { RELATION_KINDS } from "../core/relations.ts";
import { extractRelationsFromText, stripYamlComment, yamlRegions } from "./extract.ts";

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

Deno.test("extractRelations - invalid YAML falls back to line reading, with InvalidYaml", () => {
  const result = extractRelationsFromText(ITEMS, "a.md");
  // the description starting with a backquote is not valid YAML
  assertEquals(result.issues.map((i) => [i.kind, i.lineNumber]), [["InvalidYaml", 7]]);
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
    referenceLines: [{ filePath: "a.md", lineNumber: 3 }, { filePath: "a.md", lineNumber: 4 }],
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

// ── YAML comments and value forms (Issue #17) ──

Deno.test("stripYamlComment - # after whitespace or at the start, outside quotes", () => {
  const cases: [string, string][] = [
    ["", ""],
    ["# comment", ""],
    ["   # comment", ""],
    ["[]   # comment", "[]"],
    ["req:x:z-4d5e6f#20260101", "req:x:z-4d5e6f#20260101"],
    ["req:x:z-4d5e6f#20260101  # note", "req:x:z-4d5e6f#20260101"],
    ["req:x:z-4d5e6f#v1\t# tab before", "req:x:z-4d5e6f#v1"],
    ["[req:a:b-a1b2c3#v1, req:a:c-d4e5f6] # two", "[req:a:b-a1b2c3#v1, req:a:c-d4e5f6]"],
    ['"a # b"  # c', '"a # b"'],
    ["'a # b' # c", "'a # b'"],
    ["'it''s # x' # c", "'it''s # x'"],
    ['"esc \\" # x" # c', '"esc \\" # x"'],
    ["issue#12", "issue#12"],
    ["~ # null", "~"],
  ];
  for (const [value, expected] of cases) {
    assertEquals([value, stripYamlComment(value)], [value, expected]);
  }
});

/** Declarations `[kind, source, target, line]` and issue kinds of one frontmatter */
function read(body: string): { declared: [string, string, string, number][]; issues: string[] } {
  const result = extractRelationsFromText(`---\n${body}\n---\n`, "a.md");
  return {
    declared: result.declarations.map((d) => [d.kind, d.source, d.target, d.lineNumber]),
    issues: result.issues.map((i) => i.kind),
  };
}

const SRC = "us:x:y-1a2b3c#20260101";
const DST = "req:x:z-4d5e6f#20260101";
const DST2 = "req:x:w-7g8h9i";

Deno.test("extractRelations - Issue #17 reproduction: a comment on the key line keeps the list", () => {
  const text = `---
traceability:
  - id:
      full: ${SRC}
    derived_from:        # comment
      - ${DST}
---
# z \`${DST}\`
`;
  const result = extractRelationsFromText(text, "a.md");
  assertEquals(result.issues, []);
  assertEquals(result.declarations.map((d) => [d.kind, d.source, d.target, d.lineNumber]), [
    ["derived_from", SRC, DST, 6],
  ]);
});

Deno.test("extractRelations - value forms with comments, blanks and quotes", () => {
  const cases: [string, string, [string, string, string, number][], string[]][] = [
    ["empty flow list with a comment", `id: ${SRC}\ntrace_to: []   # comment`, [], []],
    ["key only with a comment, nothing under it", `id: ${SRC}\ntrace_to:   # none yet`, [], []],
    ["null with a comment", `id: ${SRC}\ntrace_to: ~ # none`, [], []],
    [
      "comment on the key and on every item",
      `id: ${SRC}\ntrace_to: # targets\n  - ${DST}  # first\n  - ${DST2} # second`,
      [["trace_to", SRC, DST, 4], ["trace_to", SRC, DST2, 5]],
      [],
    ],
    [
      "comment lines and blank lines inside the list",
      `id: ${SRC}\ntrace_to:\n  # heading\n  - ${DST}\n\n  # more\n  - ${DST2}`,
      [["trace_to", SRC, DST, 5], ["trace_to", SRC, DST2, 8]],
      [],
    ],
    [
      "list items at the same indentation as the key",
      `id: ${SRC}\nderived_from: # c\n- ${DST}\ntrace_to:\n- ${DST2}`,
      [["derived_from", SRC, DST, 4], ["trace_to", SRC, DST2, 6]],
      [],
    ],
    [
      "flow list with a comment",
      `id: ${SRC}\ntrace_to: [${DST}, "${DST2}"]  # two`,
      [["trace_to", SRC, DST, 3], ["trace_to", SRC, DST2, 3]],
      [],
    ],
    [
      "quoted values with # inside quotes",
      `id: ${SRC}\ntrace_to:\n  - "${DST}" # c\n  - '${DST2}'`,
      [["trace_to", SRC, DST, 4], ["trace_to", SRC, DST2, 5]],
      [],
    ],
    [
      "own id with a comment",
      `id: ${SRC}   # own id\nderived_from:\n  - ${DST}`,
      [["derived_from", SRC, DST, 4]],
      [],
    ],
    [
      "nested full with a comment",
      `- id: # own\n    full: ${SRC}  # full id\n  derived_from:  # from\n    - ${DST}`,
      [["derived_from", SRC, DST, 5]],
      [],
    ],
    [
      "a comment-only item is not a target",
      `id: ${SRC}\ntrace_to:\n  - # to be decided\n  - ${DST}`,
      [["trace_to", SRC, DST, 5]],
      [],
    ],
    [
      "a real non-ID value is still InvalidTarget",
      `id: ${SRC}\ntrace_to:\n  - us:stock:reliability # no hash`,
      [],
      ["InvalidTarget"],
    ],
    [
      "a comment does not stand in for an own ID",
      `trace_to: # c\n  - ${DST}`,
      [],
      ["SourceMissing"],
    ],
  ];
  for (const [name, body, declared, issues] of cases) {
    assertEquals([name, read(body)], [name, { declared, issues }]);
  }
});

Deno.test("extractRelations - InvalidTarget value is reported without its comment", () => {
  const result = extractRelationsFromText(
    `---\nid: ${SRC}\ntrace_to:\n  - "not an id # really"  # note\n---\n`,
    "a.md",
  );
  assertEquals(result.issues.map((i) => i.kind === "InvalidTarget" && i.value), [
    "not an id # really",
  ]);
});

Deno.test("extractRelations - CRLF lines and fenced blocks read comments the same way", () => {
  const crlf = `---\r\nid: ${SRC}\r\nderived_from:  # c\r\n  - ${DST}\r\n---\r\n`;
  assertEquals(extractRelationsFromText(crlf, "a.md").declarations.map((d) => d.target), [DST]);
  const fenced = `# Doc\n\n\`\`\`yaml\nid: ${SRC} # c\ntrace_to:   # c\n  - ${DST}\n\`\`\`\n`;
  const result = extractRelationsFromText(fenced, "a.md", "skip");
  assertEquals([result.issues, result.declarations.map((d) => [d.target, d.lineNumber])], [
    [],
    [[DST, 6]],
  ]);
});
