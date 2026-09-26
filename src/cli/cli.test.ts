import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { DEFAULT_VERSION_MATCH, VERSION_MATCH_MODES } from "../core/options.ts";
import { TraceabilityError } from "../core/errors.ts";
import { DEFAULT_HASH_RULE } from "../core/id.ts";
import {
  parseAnalyzeArgs,
  parseClusterArgs,
  parseExtractArgs,
  parseGraphArgs,
  parseListArgs,
  parseRelationsArgs,
  parseSearchArgs,
} from "./args.ts";
import { COMPLETE, type ModeOutcome } from "../core/outcome.ts";
import { type CommandSpec, runCommand } from "./runner.ts";

function detailOf(fn: () => unknown): unknown {
  return assertThrows(fn, TraceabilityError).detail;
}

Deno.test("args - help wins over missing arguments", () => {
  for (const parse of [parseClusterArgs, parseSearchArgs, parseExtractArgs, parseListArgs]) {
    assertEquals(parse(["--help"]), { kind: "help" });
  }
});

Deno.test("args - extract builds typed options", () => {
  assertEquals(
    parseExtractArgs(["--ids", "a:b:c-1 a:b:c-2", "--ext", "md,rs", "--versions", "all", "d", "s"]),
    {
      kind: "run",
      options: {
        inputDir: ["d", "s"],
        extensions: ["md", "rs"],
        frontmatter: "include",
        hashRule: DEFAULT_HASH_RULE,
        hashes: "any",
        outputFile: undefined,
        ids: { kind: "inline", text: "a:b:c-1 a:b:c-2" },
        before: 3,
        after: 10,
        format: "markdown",
        versions: "all",
        allowMissing: false,
      },
    },
  );
  const fromFile = parseExtractArgs(["--ids-file", "ids.txt", "d"]);
  assertEquals(fromFile.kind === "run" && fromFile.options.ids, { kind: "file", path: "ids.txt" });
  const hash = parseListArgs(["--hash-pattern", "[0-9a-f]{4}", "--require-hash", "d"]);
  assertEquals(
    hash.kind === "run" && [hash.options.hashRule?.test("beef"), hash.options.hashes],
    [true, "required"],
  );
  const skip = parseListArgs(["--skip-frontmatter", "d"]);
  assertEquals(skip.kind === "run" && skip.options.frontmatter, "skip");
  const allow = parseExtractArgs(["--ids", "x", "--allow-missing", "d"]);
  assertEquals(allow.kind === "run" && allow.options.allowMissing, true);
  for (
    const parse of [(argv: string[]) => parseExtractArgs(["--ids", "x", ...argv]), parseGraphArgs]
  ) {
    for (const mode of VERSION_MATCH_MODES) {
      const parsed = parse(["--versions", mode, "--allow-missing", "d"]);
      assertEquals(
        parsed.kind === "run" && [parsed.options.versions, parsed.options.allowMissing],
        [mode, true],
      );
    }
    const defaults = parse(["d"]);
    assertEquals(
      defaults.kind === "run" && [defaults.options.versions, defaults.options.allowMissing],
      [DEFAULT_VERSION_MATCH, false],
    );
  }
});

Deno.test("args - relations builds typed options", () => {
  const parsed = parseRelationsArgs([
    "--ids",
    "req:a:x-a1b2c3",
    "--direction",
    "in",
    "--kind",
    "trace_to",
    "--kind",
    "derived_from,trace_to",
    "--broken",
    "--format",
    "tsv",
    "d",
  ]);
  assertEquals(
    parsed.kind === "run" &&
      [
        parsed.options.direction,
        parsed.options.kinds,
        parsed.options.status,
        parsed.options.format,
      ],
    ["in", ["trace_to", "derived_from"], "broken", "tsv"],
  );
  const defaults = parseRelationsArgs(["d"]);
  assertEquals(
    defaults.kind === "run" &&
      [
        defaults.options.ids,
        defaults.options.direction,
        defaults.options.kinds,
        defaults.options.status,
      ],
    [undefined, undefined, ["derived_from", "trace_to"], "resolved"],
  );
  assertEquals(detailOf(() => parseRelationsArgs(["--direction", "in", "d"])), {
    kind: "MissingArgument",
    argument: "--ids or --ids-file (required by --direction)",
  });
  const list = parseListArgs([
    "--ids-file",
    "ids.txt",
    "--versions",
    "all",
    "--allow-missing",
    "d",
  ]);
  assertEquals(
    list.kind === "run" && [list.options.ids, list.options.versions, list.options.allowMissing],
    [{ kind: "file", path: "ids.txt" }, "all", true],
  );
});

Deno.test("args - missing arguments are MissingArgument", () => {
  assertEquals(detailOf(() => parseListArgs([])), {
    kind: "MissingArgument",
    argument: "<input-path...>",
  });
  assertEquals(detailOf(() => parseExtractArgs(["d"])), {
    kind: "MissingArgument",
    argument: "--ids or --ids-file",
  });
  assertEquals(detailOf(() => parseSearchArgs(["d"])), {
    kind: "MissingArgument",
    argument: "--query",
  });
});

Deno.test("args - an option the command does not accept is UnknownOption (exit 2)", () => {
  const parsers = [
    parseRelationsArgs,
    parseClusterArgs,
    parseSearchArgs,
    parseExtractArgs,
    parseGraphArgs,
    parseAnalyzeArgs,
    parseListArgs,
  ];
  for (const parse of parsers) {
    for (
      const [argv, option] of [
        [["--unknown-flag", "d"], "--unknown-flag"],
        [["d", "--x=1"], "--x"],
        [["-x", "d"], "-x"],
      ] as const
    ) {
      assertEquals(detailOf(() => parse([...argv])), { kind: "UnknownOption", option });
    }
    assertEquals(parse(["-h"]), { kind: "help" });
  }
  assertEquals(new TraceabilityError({ kind: "UnknownOption", option: "--x" }).exitCode, 2);
});

Deno.test("args - invalid values name the option", () => {
  const cases: [() => unknown, string][] = [
    [() => parseClusterArgs(["d", "--algorithm", "x"]), "--algorithm"],
    [() => parseClusterArgs(["d", "--format", "x"]), "--format"],
    [() => parseClusterArgs(["d", "--k", "two"]), "--k"],
    [() => parseSearchArgs(["d", "--query", "q", "--top", "0"]), "--top"],
    [() => parseExtractArgs(["d", "--ids", "x", "--versions", "newest"]), "--versions"],
    [() => parseExtractArgs(["d", "--ids", "x", "--before=-1"]), "--before"],
    [() => parseGraphArgs(["d", "--layout", "grid"]), "--layout"],
    [() => parseGraphArgs(["d", "--versions", "newest"]), "--versions"],
    [() => parseAnalyzeArgs(["d", "--edge-threshold", "x"]), "--edge-threshold"],
    [() => parseListArgs(["d", "--sort", "name"]), "--sort"],
    [() => parseListArgs(["d", "--ext", ","]), "--ext"],
    [() => parseListArgs(["d", "--format", "tree"]), "--format"],
    [() => parseRelationsArgs(["d", "--ids", "x", "--direction", "up"]), "--direction"],
    [() => parseRelationsArgs(["d", "--kind", "parent"]), "--kind"],
    [() => parseRelationsArgs(["d", "--format", "csv"]), "--format"],
    [() => parseListArgs(["d", "--hash-pattern", "("]), "--hash-pattern"],
    [() => parseListArgs(["d", "--hash-pattern="]), "--hash-pattern"],
  ];
  for (const [fn, option] of cases) {
    const detail = detailOf(fn) as { kind: string; option: string };
    assertEquals([detail.kind, detail.option], ["InvalidOptionValue", option]);
  }
});

function recorder(): { out: string[]; err: string[]; out_: (t: string) => void } {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, out_: (t) => out.push(t) };
}

function spec(run: () => Promise<ModeOutcome>): CommandSpec<unknown> {
  return {
    usage: "USAGE",
    parse: (argv) => argv.includes("--help") ? { kind: "help" } : { kind: "run", options: {} },
    run,
  };
}

async function exitOf(run: () => Promise<ModeOutcome>, argv: string[] = []): Promise<{
  code: number;
  out: string[];
  err: string[];
}> {
  const rec = recorder();
  const code = await runCommand(spec(run), argv, {
    out: rec.out_,
    err: (t) => rec.err.push(t),
  });
  return { code, out: rec.out, err: rec.err };
}

Deno.test("runCommand - help prints usage and exit codes, exits 0", async () => {
  const { code, out } = await exitOf(() => Promise.resolve(COMPLETE), ["--help"]);
  assertEquals(code, 0);
  assertStringIncludes(out[0], "USAGE");
  assertStringIncludes(out[0], "3  input    PathNotFound");
  assertStringIncludes(out[0], "70 unexpected error");
});

Deno.test("runCommand - outcomes map to 0 (complete) and 1 (partial)", async () => {
  assertEquals((await exitOf(() => Promise.resolve(COMPLETE))).code, 0);
  const partial = await exitOf(() => Promise.resolve({ status: "partial", missing: ["x"] }));
  assertEquals([partial.code, partial.err], [1, []]);
});

Deno.test("runCommand - each error category has its own exit code", async () => {
  const cases: [TraceabilityError, number][] = [
    [new TraceabilityError({ kind: "MissingArgument", argument: "x" }), 2],
    [new TraceabilityError({ kind: "PathNotFound", path: "/p" }), 3],
    [new TraceabilityError({ kind: "FileWriteFailed", path: "/p", cause: "c" }), 4],
    [new TraceabilityError({ kind: "ExternalCommandFailed", command: "rg", cause: "c" }), 5],
  ];
  for (const [error, expected] of cases) {
    const { code, err } = await exitOf(() => Promise.reject(error));
    assertEquals(code, expected);
    assertStringIncludes(err[0], `Error [${error.kind}]`);
  }
  const unexpected = await exitOf(() => Promise.reject(new Error("bug")));
  assertEquals(unexpected.code, 70);
  assertEquals(unexpected.err, ["Error: bug"]);
});

Deno.test("runCommand - usage errors point to --help", async () => {
  const { err } = await exitOf(() =>
    Promise.reject(new TraceabilityError({ kind: "MissingArgument", argument: "x" }))
  );
  assertEquals(err[1], "Run with --help for usage.");
});
