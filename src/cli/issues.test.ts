/**
 * Acceptance criteria of issues, run as the CLI commands written in the issues
 * against their reproduction files.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { describeEvent } from "../core/events.ts";
import type { IdIndexEntry } from "../core/types.ts";
import { recordingIO } from "../testing/scenario.ts";
import { type CommandSpec, runCommand } from "./runner.ts";
import { command as graphCommand } from "../../graph.ts";
import { command as listCommand } from "../../list.ts";
import { command as relationsCommand } from "../../relations.ts";
import { command as searchCommand } from "../../search.ts";
import { command as extractCommand } from "../../extract.ts";
import { command as analyzeCommand } from "../../analyze.ts";
import { command as clusterCommand } from "../cli.ts";

/** Reproduction files shared by issues #10–#14 */
const ISSUE_FILES = {
  "docs/a.md": `---
traceability:
  - id:
      full: req:auth:login-flow-1a2b3c#20260101
---
# Login flow
Hash-less mention: req:auth:login-flow
`,
  "docs/b.md": `---
traceability:
  - id:
      full: req:auth:session-timeout-4d5e6f#20260201
    derived_from:
      - req:auth:login-flow-1a2b3c
    trace_to:
      - req:auth:login-flow-1a2b3c#20251201
      - req:auth:missing-node-000000
---
# Session timeout
See req:auth:login-flow-1a2b3c and again req:auth:login-flow-1a2b3c.
`,
} as const;

interface CliRun {
  /** Exit code */
  code: number;
  /** Standard output */
  stdout: string;
  /** Standard error: progress lines and error messages */
  stderr: string[];
}

/**
 * Run a command in a directory holding the reproduction files
 */
async function cli<T>(
  spec: CommandSpec<T>,
  argv: string[],
  files: Readonly<Record<string, string>> = ISSUE_FILES,
): Promise<CliRun> {
  const root = await Deno.makeTempDir();
  const cwd = Deno.cwd();
  try {
    for (const [path, content] of Object.entries(files)) {
      await Deno.mkdir(`${root}/${path.substring(0, path.lastIndexOf("/"))}`, { recursive: true });
      await Deno.writeTextFile(`${root}/${path}`, content);
    }
    Deno.chdir(root);
    const io = recordingIO();
    const errors: string[] = [];
    const out: string[] = [];
    const code = await runCommand(
      spec,
      argv,
      { out: (t) => out.push(t), err: (t) => errors.push(t) },
      io,
    );
    return {
      code,
      stdout: [...out, ...io.printed].join(""),
      stderr: [...io.events.map(describeEvent), ...errors],
    };
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(root, { recursive: true });
  }
}

function lines(text: string): string[] {
  return text.split("\n").filter((line) => line !== "");
}

// ── #10 hash-less IDs ──

Deno.test("#10 req:auth:login-flow is split as semantic=login-flow, hash=empty", async () => {
  const run = await cli(listCommand, ["--format", "json", "./docs"]);
  assertEquals(run.code, 0);
  const entries = JSON.parse(run.stdout).entries as IdIndexEntry[];
  const parts = (fullId: string) => {
    const entry = entries.find((e) => e.fullId === fullId);
    return [entry?.semantic, entry?.hash];
  };
  assertEquals(parts("req:auth:login-flow"), ["login-flow", ""]);
  assertEquals(parts("req:auth:login-flow-1a2b3c"), ["login-flow", "1a2b3c"]);
});

Deno.test("#10 search: hash-less IDs are distinguished (json) and excluded (--require-hash)", async () => {
  const json = await cli(searchCommand, [
    "--query",
    "login flow",
    "--top",
    "3",
    "--format",
    "json",
    "./docs",
  ]);
  const items = JSON.parse(json.stdout).items as { id: { fullId: string; hash: string } }[];
  for (const { id } of items) {
    assertEquals([id.fullId, id.hash === ""], [id.fullId, id.fullId === "req:auth:login-flow"]);
  }
  const required = await cli(searchCommand, [
    "--query",
    "login flow",
    "--top",
    "1",
    "--require-hash",
    "./docs",
  ]);
  assertEquals(required.code, 0);
  assert(lines(required.stdout)[0].startsWith("req:auth:login-flow-1a2b3c"), required.stdout);
  assert(required.stderr.some((line) => line.startsWith("Excluded 1 occurrences")));
});

// ── #13 search simple ──

Deno.test("#13 search simple: stdout holds only IDs, the first line is an ID", async () => {
  const run = await cli(searchCommand, ["--query", "login flow", "--top", "2", "./docs"]);
  assertEquals(run.code, 0);
  const out = lines(run.stdout);
  assertEquals(out.length, 2);
  for (const line of out) assert(/^req:auth:\S+$/.test(line), line);
  assert(run.stderr.some((line) => line.includes(`"login flow"`)));
});

// ── #12 broken reasons ──

Deno.test("#12 graph: VersionMissing (with existing versions) vs NodeMissing", async () => {
  const run = await cli(graphCommand, ["--output", "g.html", "./docs"]);
  assertEquals(run.code, 1);
  const broken = run.stderr.filter((line) => line.startsWith("Broken relation:"));
  assertEquals(broken.length, 2);
  assertStringIncludes(broken[0], "docs/b.md:8:");
  assertStringIncludes(broken[0], "-trace_to-> req:auth:login-flow-1a2b3c#20251201");
  assertStringIncludes(broken[0], "(version not found: node exists with 20260101, no version)");
  assertStringIncludes(broken[1], "docs/b.md:9:");
  assertStringIncludes(broken[1], "(node not found)");
});

// ── #11 relations ──

Deno.test("#11 relations --direction in: the derived_from from session-timeout, one line", async () => {
  const run = await cli(relationsCommand, [
    "--ids",
    "req:auth:login-flow-1a2b3c",
    "--direction",
    "in",
    "./docs",
  ]);
  assertEquals(run.code, 0);
  assertEquals(lines(run.stdout), [
    "docs/b.md:6: req:auth:session-timeout-4d5e6f#20260201 -derived_from-> req:auth:login-flow-1a2b3c",
  ]);
});

Deno.test("#11 relations --broken: both broken declarations with file:line", async () => {
  const run = await cli(relationsCommand, ["--broken", "./docs"]);
  assertEquals(run.code, 0);
  const out = lines(run.stdout);
  assertEquals(out.length, 2);
  assert(out[0].startsWith("docs/b.md:8: "), out[0]);
  assert(out[1].startsWith("docs/b.md:9: "), out[1]);
});

Deno.test("#11 relations tsv and json", async () => {
  const tsv = await cli(relationsCommand, [
    "--ids",
    "req:auth:session-timeout-4d5e6f",
    "--direction",
    "out",
    "--format",
    "tsv",
    "./docs",
  ]);
  assertEquals(lines(tsv.stdout), [
    [
      "out",
      "derived_from",
      "req:auth:session-timeout-4d5e6f#20260201",
      "req:auth:login-flow-1a2b3c",
      "docs/b.md:6",
      "",
    ].join("\t"),
  ]);
  const json = await cli(relationsCommand, [
    "--format",
    "json",
    "--kind",
    "trace_to",
    "--broken",
    "./docs",
  ]);
  const rows = JSON.parse(json.stdout).rows as { resolution: { status: string } }[];
  assertEquals(rows.map((r) => r.resolution.status), ["broken", "broken"]);
});

Deno.test("#11 relations: a requested ID found nowhere is exit 1 (0 with --allow-missing)", async () => {
  const missing = await cli(relationsCommand, ["--ids", "req:x:nothing-000000", "./docs"]);
  assertEquals(missing.code, 1);
  const allowed = await cli(relationsCommand, [
    "--ids",
    "req:x:nothing-000000",
    "--allow-missing",
    "./docs",
  ]);
  assertEquals(allowed.code, 0);
  const pointedAt = await cli(relationsCommand, [
    "--ids",
    "req:auth:missing-node-000000",
    "--direction",
    "in",
    "--broken",
    "./docs",
  ]);
  assertEquals([pointedAt.code, lines(pointedAt.stdout).length], [0, 1]);
});

// ── #14 list --ids ──

Deno.test("#14 list --ids --format locations: occurrences per file", async () => {
  const latest = await cli(listCommand, [
    "--ids",
    "req:auth:login-flow-1a2b3c",
    "--format",
    "locations",
    "./docs",
  ]);
  assertEquals([latest.code, lines(latest.stdout)], [0, ["1 docs/a.md", "3 docs/b.md"]]);
  const all = await cli(listCommand, [
    "--ids",
    "req:auth:login-flow-1a2b3c",
    "--versions",
    "all",
    "--format",
    "locations",
    "./docs",
  ]);
  assertEquals(lines(all.stdout), ["1 docs/a.md", "4 docs/b.md"]);
  const count = await cli(listCommand, [
    "--ids",
    "req:auth:login-flow-1a2b3c",
    "--versions",
    "all",
    "--format",
    "count",
    "./docs",
  ]);
  assertEquals(lines(count.stdout), [
    "3 req:auth:login-flow-1a2b3c",
    "1 req:auth:login-flow-1a2b3c#20251201",
    "1 req:auth:login-flow-1a2b3c#20260101",
  ]);
  const missing = await cli(listCommand, ["--ids", "req:x:nothing-000000", "./docs"]);
  assertEquals(missing.code, 1);
});

Deno.test("#14 an unknown option is exit 2 in every command", async () => {
  const commands = [
    listCommand,
    searchCommand,
    extractCommand,
    graphCommand,
    analyzeCommand,
    clusterCommand,
    relationsCommand,
  ] as const;
  for (const spec of commands) {
    const run = await cli(spec as CommandSpec<unknown>, ["--unknown-flag", "./docs"]);
    assertEquals(run.code, 2);
    assert(run.stderr.some((line) => line.includes("UnknownOption")), run.stderr.join("\n"));
  }
});

// ── #17 YAML comments on relation keys ──

Deno.test("#17 relations: a comment on the key line keeps the list under it, no warning", async () => {
  const files = {
    "docs/a.md": `---
traceability:
  - id:
      full: us:x:y-1a2b3c#20260101
    derived_from:        # comment
      - req:x:z-4d5e6f#20260101
---
# z \`req:x:z-4d5e6f#20260101\`
`,
  };
  const run = await cli(relationsCommand, ["--format", "tsv", "./docs"], files);
  assertEquals(run.code, 0);
  assert(run.stderr.includes("Relations: 1 declared, 1 edges, 0 broken"), run.stderr.join("\n"));
  assertEquals(run.stderr.filter((line) => line.startsWith("Warning:")), []);
  assertEquals(lines(run.stdout), [
    "out\tderived_from\tus:x:y-1a2b3c#20260101\treq:x:z-4d5e6f#20260101\tdocs/a.md:6\t",
  ]);
});

Deno.test("#17 relations: trace_to: [] with a comment gives no warning", async () => {
  const files = {
    "docs/a.md": "---\nid: us:x:y-1a2b3c#20260101\ntrace_to: []   # comment\n---\n",
  };
  const run = await cli(relationsCommand, ["./docs"], files);
  assertEquals(run.code, 0);
  assertEquals(run.stderr.filter((line) => line.startsWith("Warning:")), []);
  assert(run.stderr.includes("Relations: 0 declared, 0 edges, 0 broken"));
});
