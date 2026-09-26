import { assertEquals } from "@std/assert";
import { extractRelationsFromText, yamlRegions } from "./extract.ts";

const S = "us:x:src-1a2b3c#v1";
const D = "req:x:dst-4d5e6f#v1";
const E = "req:x:end-7a8b9c";

/** `[kind, source, target, line]` of each declaration and the issue kinds */
interface Read {
  declared: [string, string, string, number][];
  issues: string[];
}

/**
 * Read `yaml` as a frontmatter: its first line is line 2 of the file
 */
function read(yaml: string): Read {
  const result = extractRelationsFromText(`---\n${yaml}\n---\n# body\n`, "a.md");
  return {
    declared: result.declarations.map((d) => [d.kind, d.source, d.target, d.lineNumber]),
    issues: result.issues.map((i) => i.kind),
  };
}

/** A case: name, YAML (line 2 onward), expected result */
type Case = [string, string, Read];

const none: Read = { declared: [], issues: [] };

const COLLECTIONS: Case[] = [
  ["block sequence", `id: ${S}\ntrace_to:\n  - ${D}\n  - ${E}`, {
    declared: [["trace_to", S, D, 4], ["trace_to", S, E, 5]],
    issues: [],
  }],
  [
    "block sequence at the key's indentation",
    `id: ${S}\ntrace_to:\n- ${D}\nderived_from:\n- ${E}`,
    {
      declared: [["trace_to", S, D, 4], ["derived_from", S, E, 6]],
      issues: [],
    },
  ],
  ["flow sequence", `id: ${S}\ntrace_to: [${D}, ${E}]`, {
    declared: [["trace_to", S, D, 3], ["trace_to", S, E, 3]],
    issues: [],
  }],
  ["flow sequence over several lines", `id: ${S}\ntrace_to: [\n  ${D},\n  ${E}\n]`, {
    declared: [["trace_to", S, D, 4], ["trace_to", S, E, 5]],
    issues: [],
  }],
  ["single scalar", `id: ${S}\nderived_from: ${D}`, {
    declared: [["derived_from", S, D, 3]],
    issues: [],
  }],
  ["one scalar naming two IDs", `id: ${S}\ntrace_to: ${D}, ${E}`, {
    declared: [["trace_to", S, D, 3], ["trace_to", S, E, 3]],
    issues: [],
  }],
  ["plain scalar continued on the next line", `id: ${S}\ntrace_to: ${D}\n  and more`, {
    declared: [["trace_to", S, D, 3]],
    issues: [],
  }],
  ["nested sequences are flattened", `id: ${S}\ntrace_to:\n  - [${D}]\n  - - ${E}`, {
    declared: [["trace_to", S, D, 4], ["trace_to", S, E, 5]],
    issues: [],
  }],
  ["the same target twice", `id: ${S}\ntrace_to:\n  - ${D}\n  - ${D}`, {
    declared: [["trace_to", S, D, 4], ["trace_to", S, D, 5]],
    issues: [],
  }],
];

const SCALARS_AND_KEYS: Case[] = [
  ["double-quoted values", `id: "${S}"\ntrace_to:\n  - "${D}"`, {
    declared: [["trace_to", S, D, 4]],
    issues: [],
  }],
  ["single-quoted values", `id: '${S}'\ntrace_to: ['${D}']`, {
    declared: [["trace_to", S, D, 3]],
    issues: [],
  }],
  ["double-quoted key", `id: ${S}\n"trace_to": [${D}]`, {
    declared: [["trace_to", S, D, 3]],
    issues: [],
  }],
  ["single-quoted key", `id: ${S}\n'derived_from':\n  - ${D}`, {
    declared: [["derived_from", S, D, 4]],
    issues: [],
  }],
  ["tagged value", `id: ${S}\ntrace_to: [!!str ${D}]`, {
    declared: [["trace_to", S, D, 3]],
    issues: [],
  }],
  ["relation before the own ID in the mapping", `trace_to: [${D}]\nid: ${S}`, {
    declared: [["trace_to", S, D, 2]],
    issues: [],
  }],
  ["own ID nested as full", `id:\n  full: ${S}\n  level: us\ntrace_to: [${D}]`, {
    declared: [["trace_to", S, D, 5]],
    issues: [],
  }],
  ["own ID as a flow mapping", `id: {full: ${S}}\ntrace_to: [${D}]`, {
    declared: [["trace_to", S, D, 3]],
    issues: [],
  }],
];

const MAPPINGS: Case[] = [
  [
    "items of a sequence",
    `items:\n  - id: ${S}\n    trace_to: [${D}]\n  - id: ${D}\n    trace_to: [${E}]`,
    {
      declared: [["trace_to", S, D, 4], ["trace_to", D, E, 6]],
      issues: [],
    },
  ],
  ["flow mapping as an item", `items:\n  - {id: ${S}, trace_to: [${D}]}`, {
    declared: [["trace_to", S, D, 3]],
    issues: [],
  }],
  ["flow mapping as the whole document", `{id: ${S}, derived_from: [${D}], trace_to: [${E}]}`, {
    declared: [["derived_from", S, D, 2], ["trace_to", S, E, 2]],
    issues: [],
  }],
  [
    "values written as mappings with an id",
    `id: ${S}\ntrace_to:\n  - id: ${D}\n    note: why\n  - id:\n      full: ${E}`,
    {
      declared: [["trace_to", S, D, 4], ["trace_to", S, E, 7]],
      issues: [],
    },
  ],
  ["deeply nested", `a:\n  b:\n    - c:\n        id: ${S}\n        derived_from: ${D}`, {
    declared: [["derived_from", S, D, 6]],
    issues: [],
  }],
  ["target equal to the own ID written above (self reference)", `id: ${S}\ntrace_to:\n  - ${S}`, {
    declared: [["trace_to", S, S, 4]],
    issues: [],
  }],
  [
    "target also mentioned in an earlier description",
    `id: ${S}\nnote: see ${D}\ntrace_to: [${D}]`,
    {
      declared: [["trace_to", S, D, 4]],
      issues: [],
    },
  ],
];

const TEXT_AND_REFERENCES: Case[] = [
  [
    "block scalar holding relation-like text",
    `id: ${S}\ndescription: |\n  trace_to:\n    - ${E}\ntrace_to: [${D}]`,
    {
      declared: [["trace_to", S, D, 6]],
      issues: [],
    },
  ],
  [
    "folded scalar holding relation-like text",
    `id: ${S}\nnote: >-\n  derived_from: ${E}\nderived_from: ${D}`,
    {
      declared: [["derived_from", S, D, 5]],
      issues: [],
    },
  ],
  [
    "anchor and alias: the alias is placed on its key line",
    `items:\n  - id: ${S}\n    trace_to: &t [${D}]\n  - id: ${E}\n    trace_to: *t`,
    {
      declared: [["trace_to", S, D, 4], ["trace_to", E, D, 6]],
      issues: [],
    },
  ],
  [
    "merge key brings relations into a mapping",
    `base: &b {trace_to: [${D}]}\nitem:\n  <<: *b\n  id: ${S}`,
    {
      declared: [["trace_to", S, D, 2]],
      issues: ["SourceMissing"],
    },
  ],
];

const EMPTY_AND_INVALID: Case[] = [
  ["empty flow sequence", `id: ${S}\ntrace_to: []`, none],
  ["null", `id: ${S}\ntrace_to: ~\nderived_from: null`, none],
  ["no value", `id: ${S}\ntrace_to:`, none],
  ["empty string", `id: ${S}\ntrace_to: ""`, none],
  ["a number is not an ID", `id: ${S}\ntrace_to: [123]`, {
    declared: [],
    issues: ["InvalidTarget"],
  }],
  ["a mapping without an id is not an ID", `id: ${S}\ntrace_to:\n  - note: x`, {
    declared: [],
    issues: ["InvalidTarget"],
  }],
  ["no own ID", `title: x\ntrace_to: [${D}]`, { declared: [], issues: ["SourceMissing"] }],
  ["own ID that is not an ID", `id: REQ-001\ntrace_to: [${D}]`, {
    declared: [],
    issues: ["SourceMissing"],
  }],
];

for (
  const [group, cases] of Object.entries({
    COLLECTIONS,
    SCALARS_AND_KEYS,
    MAPPINGS,
    TEXT_AND_REFERENCES,
    EMPTY_AND_INVALID,
  })
) {
  Deno.test(`relations in valid YAML - ${group}`, () => {
    for (const [name, yaml, expected] of cases) {
      assertEquals([name, read(yaml)], [name, expected]);
    }
  });
}

Deno.test("relations in valid YAML - several documents in a fenced block", () => {
  const text =
    `# doc\n\`\`\`yaml\nid: ${S}\ntrace_to: [${D}]\n---\nid: ${D}\ntrace_to: [${E}]\n\`\`\`\n`;
  assertEquals(
    extractRelationsFromText(text, "a.md").declarations.map((
      d,
    ) => [d.source, d.target, d.lineNumber]),
    [[S, D, 4], [D, E, 7]],
  );
});

Deno.test("relations in valid YAML - relation values are reference lines, other IDs are not", () => {
  const result = extractRelationsFromText(
    `---\nid: ${S}\nnote: ${E}\ntrace_to:\n  - ${D}\n---\n`,
    "a.md",
  );
  assertEquals(result.referenceLines.map((p) => p.lineNumber), [4, 5]);
});

// ── not valid YAML: line reading, InvalidYaml ──

Deno.test("invalid YAML - relations are read line by line and InvalidYaml names the line", () => {
  const cases: [string, string, number][] = [
    ["plain scalar starting with a backquote", `id: ${S}\nnote: \`x\` y\ntrace_to:\n  - ${D}`, 3],
    ["duplicated key", `id: ${S}\nid: ${S}\ntrace_to:\n  - ${D}`, 3],
    ["unclosed flow sequence", `id: ${S}\ntrace_to: [${D}`, 3],
  ];
  for (const [name, yaml, errorLine] of cases) {
    const result = extractRelationsFromText(`---\n${yaml}\n---\n`, "a.md");
    assertEquals(
      [
        name,
        result.declarations.map((d) => d.target),
        result.issues.map((i) => [i.kind, i.lineNumber]),
      ],
      [name, [D], [["InvalidYaml", errorLine]]],
    );
  }
});

Deno.test("invalid YAML - no warning when the region declares no relation", () => {
  const result = extractRelationsFromText("---\ntitle: `x` y\n---\n", "a.md");
  assertEquals(result.issues, []);
});

// ── fenced code blocks ──

Deno.test("yamlRegions - fences: ~~~, info strings, case, nesting, inline code", () => {
  const body = (text: string) => yamlRegions(text, "include").map((r) => [r.firstLine, r.lines]);
  assertEquals(body("~~~yaml\na: 1\n~~~\n"), [[2, ["a: 1"]]]);
  assertEquals(body('```yaml title="x"\na: 1\n```\n'), [[2, ["a: 1"]]]);
  assertEquals(body("```YAML\na: 1\n```\n"), [[2, ["a: 1"]]]);
  assertEquals(body("```yml {.class}\na: 1\n```\n"), [[2, ["a: 1"]]]);
  assertEquals(body("````yaml\na: 1\n```\nb: 2\n````\n"), [[2, ["a: 1", "```", "b: 2"]]]);
  assertEquals(body("````markdown\n```yaml\na: 1\n```\n````\n"), []);
  assertEquals(body("~~~\n```yaml\na: 1\n```\n~~~\n"), []);
  assertEquals(body("```yamlx\na: 1\n```\n"), []);
  assertEquals(body("```yaml` inline\n```yaml\na: 1\n```\n"), [[3, ["a: 1"]]]);
  assertEquals(body("  ```yaml\n  a: 1\n  ```\n"), [[2, ["  a: 1"]]]);
  assertEquals(body("```yaml\na: 1\n"), []);
});

Deno.test("relations - a yaml example inside a longer fence is not read", () => {
  const text =
    `# how to write\n\`\`\`\`markdown\n\`\`\`yaml\nid: ${S}\ntrace_to: [${D}]\n\`\`\`\n\`\`\`\`\n`;
  assertEquals(extractRelationsFromText(text, "a.md"), {
    declarations: [],
    referenceLines: [],
    issues: [],
  });
});
