/**
 * Sequential behavior of the modes, written as typed scenarios.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { defineScenario, type ScenarioContext } from "../testing/scenario.ts";
import { runAnalyzeMode } from "./analyze.ts";
import { runClusterMode } from "./cluster.ts";
import { type ExtractModeOptions, runExtractMode } from "./extract.ts";
import { runGraphMode } from "./graph.ts";
import { runListMode } from "./list.ts";
import { runSearchMode } from "./search.ts";

const DOCS = {
  "docs/req.md": "# Req\nreq:auth:login-a1b2c3#20251111a\nreq:auth:login-a1b2c3#20260810\n",
  "docs/spec.md": "# Spec\nsee req:auth:login-a1b2c3 and spc:auth:session-d4e5f6#v1\n",
  "src/main.rs": "// implements req:auth:login-a1b2c3#20260810\n",
} as const;

const CLUSTERING = { threshold: 0.3, k: 0, epsilon: 0.3, minPoints: 2 };

function extractOptions(
  ctx: ScenarioContext,
  overrides: Partial<ExtractModeOptions> = {},
): ExtractModeOptions {
  return {
    inputDir: ctx.path("docs"),
    ids: { kind: "inline", text: "req:auth:login-a1b2c3" },
    before: 0,
    after: 0,
    format: "simple",
    ...overrides,
  };
}

// ── extract ──

defineScenario({
  name: "extract: versionless ID resolves to the latest version, then prints",
  given: DOCS,
  when: (ctx) => runExtractMode(extractOptions(ctx), ctx.io),
  then: {
    order: "exact",
    events: [
      { type: "ModeStarted", mode: "extract" },
      { type: "TargetsLoaded", count: 1 },
      { type: "ScanStarted", extensions: ["md"] },
      { type: "FilesScanned", count: 2 },
      { type: "IdsExtracted", total: 4, unique: 4 },
      { type: "ContextsResolved", found: 2, notFound: 0 },
      { type: "OutputPrinted" },
    ],
    outcome: { kind: "success", result: { status: "complete" } },
    verify: (ctx) => {
      const out = ctx.io.printed.join("");
      assertStringIncludes(out, "req:auth:login-a1b2c3#20260810");
      assert(!out.includes("#20251111a"));
    },
  },
});

defineScenario({
  name: "extract: --versions all from an ids file returns every version",
  given: { ...DOCS, "ids.txt": "req:auth:login-a1b2c3\n\n" },
  when: (ctx) =>
    runExtractMode(
      extractOptions(ctx, { ids: { kind: "file", path: ctx.path("ids.txt") }, versions: "all" }),
      ctx.io,
    ),
  then: {
    events: [
      { type: "TargetsLoaded", count: 1 },
      { type: "ContextsResolved", found: 3, notFound: 0 },
    ],
    outcome: { kind: "success" },
  },
});

defineScenario({
  name: "extract: --ext and several paths reach source code",
  given: DOCS,
  when: (ctx) =>
    runExtractMode(
      extractOptions(ctx, {
        inputDir: [ctx.path("docs"), ctx.path("src")],
        extensions: ["md", "rs"],
      }),
      ctx.io,
    ),
  then: {
    events: [{ type: "FilesScanned", count: 3 }, { type: "ContextsResolved", found: 2 }],
    outcome: { kind: "success" },
    verify: (ctx) => assertStringIncludes(ctx.io.printed.join(""), "main.rs:1"),
  },
});

defineScenario({
  name: "extract: a missing path fails after the scan starts, before any file is counted",
  given: DOCS,
  when: (ctx) =>
    runExtractMode(
      extractOptions(ctx, { inputDir: [ctx.path("docs"), ctx.path("publish")] }),
      ctx.io,
    ),
  then: {
    events: [{ type: "TargetsLoaded" }, { type: "ScanStarted" }],
    absent: ["FilesScanned", "OutputPrinted"],
    outcome: { kind: "error", error: { kind: "PathNotFound" } },
  },
});

defineScenario({
  name: "extract: a missing ids file fails before scanning",
  given: DOCS,
  when: (ctx) =>
    runExtractMode(
      extractOptions(ctx, { ids: { kind: "file", path: ctx.path("none.txt") } }),
      ctx.io,
    ),
  then: {
    events: [{ type: "ModeStarted", mode: "extract" }],
    absent: ["TargetsLoaded", "ScanStarted"],
    outcome: { kind: "error", error: { kind: "PathNotFound" } },
  },
});

defineScenario({
  name: "extract: an unwritable output fails after contexts are resolved",
  given: DOCS,
  when: (ctx) =>
    runExtractMode(extractOptions(ctx, { outputFile: ctx.path("docs/req.md/out.md") }), ctx.io),
  then: {
    events: [{ type: "ContextsResolved" }],
    absent: ["OutputWritten"],
    outcome: { kind: "error", error: { kind: "FileWriteFailed" } },
  },
});

defineScenario({
  name: "extract: IDs not found still print the found ones, then report partial",
  given: DOCS,
  when: (ctx) =>
    runExtractMode(
      extractOptions(ctx, {
        ids: { kind: "inline", text: "req:auth:login-a1b2c3 req:x:none-000#v1" },
      }),
      ctx.io,
    ),
  then: {
    events: [{ type: "ContextsResolved", found: 2, notFound: 1 }, { type: "OutputPrinted" }],
    outcome: { kind: "success", result: { status: "partial", missing: ["req:x:none-000#v1"] } },
  },
});

defineScenario({
  name: "extract: nothing to scan reports every requested ID as missing",
  given: { "docs/empty.md": "# none\n" },
  when: (ctx) => runExtractMode(extractOptions(ctx), ctx.io),
  then: {
    events: [{ type: "Stopped", reason: "NoIds" }],
    absent: ["ContextsResolved", "OutputPrinted"],
    outcome: {
      kind: "success",
      result: { status: "partial", missing: ["req:auth:login-a1b2c3"] },
    },
  },
});

// ── cluster ──

defineScenario({
  name: "cluster: no matching files stops right after the scan",
  given: { "src/main.rs": DOCS["src/main.rs"] },
  when: (ctx) =>
    runClusterMode({
      inputDir: ctx.path("src"),
      algorithm: "hierarchical",
      distance: "structural",
      format: "simple",
      clusteringOptions: CLUSTERING,
    }, ctx.io),
  then: {
    events: [
      { type: "CalculatorSelected", name: "structural" },
      { type: "AlgorithmSelected", name: "hierarchical" },
      { type: "FilesScanned", count: 0 },
      { type: "Stopped", reason: "NoFiles" },
    ],
    absent: ["IdsExtracted", "OutputPrinted"],
    outcome: { kind: "success" },
  },
});

defineScenario({
  name: "cluster: files without IDs stop after extraction",
  given: { "docs/empty.md": "# nothing here\n" },
  when: (ctx) =>
    runClusterMode({
      inputDir: ctx.path("docs"),
      algorithm: "hierarchical",
      distance: "structural",
      format: "simple",
      clusteringOptions: CLUSTERING,
    }, ctx.io),
  then: {
    events: [{ type: "IdsExtracted", total: 0 }, { type: "Stopped", reason: "NoIds" }],
    absent: ["DistanceMatrixBuilt"],
    outcome: { kind: "success" },
  },
});

defineScenario({
  name: "cluster: IDs go through matrix, clusters, then output",
  given: DOCS,
  when: (ctx) =>
    runClusterMode({
      inputDir: ctx.path("docs"),
      algorithm: "hierarchical",
      distance: "structural",
      format: "json",
      clusteringOptions: CLUSTERING,
    }, ctx.io),
  then: {
    events: [
      { type: "IdsExtracted", total: 4 },
      { type: "DistanceMatrixBuilt", size: 4 },
      { type: "ClustersFormed" },
      { type: "OutputPrinted" },
    ],
    outcome: { kind: "success" },
  },
});

defineScenario({
  name: "cluster: an invalid algorithm parameter fails before scanning",
  given: DOCS,
  when: (ctx) =>
    runClusterMode({
      inputDir: ctx.path("docs"),
      algorithm: "dbscan",
      distance: "structural",
      format: "simple",
      clusteringOptions: { ...CLUSTERING, epsilon: 0 },
    }, ctx.io),
  then: {
    events: [{ type: "CalculatorSelected" }],
    absent: ["AlgorithmSelected", "ScanStarted"],
    outcome: { kind: "error", error: { kind: "InvalidParameter", parameter: "epsilon" } },
  },
});

// ── search ──

defineScenario({
  name: "search: results are limited by top",
  given: DOCS,
  when: (ctx) =>
    runSearchMode({
      inputDir: ctx.path("docs"),
      query: "login",
      distance: "cosine",
      top: 2,
      showDistance: false,
      format: "simple",
    }, ctx.io),
  then: {
    events: [{ type: "IdsExtracted" }, { type: "SearchCompleted", results: 2 }, {
      type: "OutputPrinted",
    }],
    outcome: { kind: "success" },
  },
});

// ── list ──

defineScenario({
  name: "list: nothing found still outputs an empty index",
  given: { "src/main.rs": DOCS["src/main.rs"] },
  when: (ctx) =>
    runListMode(
      { inputDir: ctx.path("src"), format: "json", sort: "fullId", batchSize: 0 },
      ctx.io,
    ),
  then: {
    events: [{ type: "FilesScanned", count: 0 }, { type: "IdsExtracted", total: 0 }, {
      type: "OutputPrinted",
    }],
    absent: ["Stopped"],
    outcome: { kind: "success" },
    verify: (ctx) => assertEquals(JSON.parse(ctx.io.printed[0]).totalUniqueIds, 0),
  },
});

defineScenario({
  name: "list: batches are written one file after another",
  given: DOCS,
  when: (ctx) =>
    runListMode({
      inputDir: ctx.path("docs"),
      outputFile: ctx.path("out/ids.json"),
      format: "json",
      sort: "fullId",
      batchSize: 2,
    }, ctx.io),
  then: {
    events: [
      { type: "IdsExtracted", unique: 4 },
      { type: "OutputWritten" },
      { type: "OutputWritten" },
    ],
    absent: ["OutputPrinted"],
    outcome: { kind: "success" },
    verify: async (ctx) => {
      const written = ctx.io.events.flatMap((e) => e.type === "OutputWritten" ? [e.path] : []);
      assertEquals(written, [ctx.path("out/ids-001.json"), ctx.path("out/ids-002.json")]);
      assertEquals(JSON.parse(await Deno.readTextFile(written[1])).entries.length, 2);
    },
  },
});

// ── graph / analyze ──

defineScenario({
  name: "graph: builds the graph, then writes HTML",
  given: DOCS,
  when: (ctx) =>
    runGraphMode({
      inputDir: ctx.path("docs"),
      outputFile: ctx.path("out/graph.html"),
      distance: "structural",
      algorithm: "hierarchical",
      clusteringOptions: CLUSTERING,
      edgeThreshold: 0.5,
      colorBy: "cluster",
      layout: "mds",
    }, ctx.io),
  then: {
    events: [
      { type: "ClustersFormed" },
      { type: "GraphBuilt", nodes: 4 },
      { type: "OutputWritten" },
    ],
    outcome: { kind: "success" },
  },
});

defineScenario({
  name: "analyze: the four aspects run in order before the report is written",
  given: DOCS,
  when: (ctx) =>
    runAnalyzeMode({
      inputDir: ctx.path("docs"),
      outputFile: ctx.path("out/report.md"),
      distance: "structural",
      algorithm: "hierarchical",
      clusteringOptions: CLUSTERING,
      edgeThreshold: 0.5,
    }, ctx.io),
  then: {
    events: [
      { type: "ClustersFormed" },
      { type: "AnalysisCompleted", aspect: "structure" },
      { type: "AnalysisCompleted", aspect: "detail" },
      { type: "AnalysisCompleted", aspect: "duplication" },
      { type: "AnalysisCompleted", aspect: "gaps" },
      { type: "OutputWritten" },
    ],
    outcome: { kind: "success" },
  },
});

defineScenario({
  name: "extract: an empty ids file fails before scanning",
  given: { ...DOCS, "ids.txt": "\n  \n" },
  when: (ctx) =>
    runExtractMode(
      extractOptions(ctx, { ids: { kind: "file", path: ctx.path("ids.txt") } }),
      ctx.io,
    ),
  then: {
    events: [{ type: "ModeStarted" }],
    absent: ["TargetsLoaded", "ScanStarted"],
    outcome: { kind: "error", error: { kind: "EmptyIdList" } },
  },
});

// ── frontmatter ──

const WITH_FRONTMATTER = {
  "docs/a.md": "---\nderived_from:\n  - req:up:origin-9f9f9f#v1\n---\n# req:auth:login-a1b2c3#v1\n",
} as const;

defineScenario({
  name: "extract: --skip-frontmatter leaves IDs only in frontmatter missing",
  given: WITH_FRONTMATTER,
  when: (ctx) =>
    runExtractMode(
      extractOptions(ctx, {
        ids: { kind: "inline", text: "req:up:origin-9f9f9f req:auth:login-a1b2c3" },
        frontmatter: "skip",
      }),
      ctx.io,
    ),
  then: {
    events: [
      { type: "ScanStarted", frontmatter: "skip" },
      { type: "IdsExtracted", total: 1 },
      { type: "ContextsResolved", found: 1, notFound: 1 },
    ],
    outcome: { kind: "success", result: { status: "partial", missing: ["req:up:origin-9f9f9f"] } },
    verify: (ctx) => assertStringIncludes(ctx.io.printed.join(""), "a.md:5"),
  },
});

defineScenario({
  name: "list: frontmatter is included by default",
  given: WITH_FRONTMATTER,
  when: (ctx) =>
    runListMode(
      { inputDir: ctx.path("docs"), format: "simple", sort: "fullId", batchSize: 0 },
      ctx.io,
    ),
  then: {
    events: [{ type: "ScanStarted", frontmatter: "include" }, { type: "IdsExtracted", total: 2 }],
    outcome: { kind: "success", result: { status: "complete" } },
  },
});
