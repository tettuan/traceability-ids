import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import {
  formatAsCsv,
  formatAsJson,
  formatAsMarkdown,
  formatResult,
} from "./formatter.ts";
import type { ClusteringResult, TraceabilityId } from "../core/types.ts";

// テスト用のデータを作成
function createTestResult(): ClusteringResult {
  const item1: TraceabilityId = {
    fullId: "req:apikey:hierarchy-9a2f4d#20251111a",
    level: "req",
    scope: "apikey",
    semantic: "hierarchy",
    hash: "9a2f4d",
    version: "20251111a",
    filePath: "test1.md",
    lineNumber: 10,
  };

  const item2: TraceabilityId = {
    fullId: "req:apikey:vendor-mgmt-3b7e5c#20251111a",
    level: "req",
    scope: "apikey",
    semantic: "vendor-mgmt",
    hash: "3b7e5c",
    version: "20251111a",
    filePath: "test1.md",
    lineNumber: 20,
  };

  const item3: TraceabilityId = {
    fullId: "req:dashboard:login-display-a1b2c3#20251111",
    level: "req",
    scope: "dashboard",
    semantic: "login-display",
    hash: "a1b2c3",
    version: "20251111",
    filePath: "test2.md",
    lineNumber: 5,
  };

  return {
    clusters: [
      {
        id: 1,
        items: [item1, item2],
        centroid: item1,
      },
      {
        id: 2,
        items: [item3],
        centroid: item3,
      },
    ],
    algorithm: "hierarchical",
    distanceCalculator: "levenshtein",
  };
}

Deno.test("formatAsJson - valid JSON output", () => {
  const result = createTestResult();
  const json = formatAsJson(result);

  // Should be valid JSON
  const parsed = JSON.parse(json);

  assertEquals(parsed.algorithm, "hierarchical");
  assertEquals(parsed.distanceCalculator, "levenshtein");
  assertEquals(parsed.clusters.length, 2);
  assertEquals(parsed.clusters[0].items.length, 2);
  assertEquals(parsed.clusters[1].items.length, 1);
});

Deno.test("formatAsJson - includes all fields", () => {
  const result = createTestResult();
  const json = formatAsJson(result);
  const parsed = JSON.parse(json);

  // Check first item details
  const firstItem = parsed.clusters[0].items[0];
  assertEquals(firstItem.fullId, "req:apikey:hierarchy-9a2f4d#20251111a");
  assertEquals(firstItem.level, "req");
  assertEquals(firstItem.scope, "apikey");
  assertEquals(firstItem.semantic, "hierarchy");
  assertEquals(firstItem.hash, "9a2f4d");
  assertEquals(firstItem.version, "20251111a");
  assertEquals(firstItem.filePath, "test1.md");
  assertEquals(firstItem.lineNumber, 10);
});

Deno.test("formatAsMarkdown - contains headers", () => {
  const result = createTestResult();
  const markdown = formatAsMarkdown(result);

  assertStringIncludes(markdown, "# Traceability ID Clustering Results");
  assertStringIncludes(markdown, "## Cluster 1");
  assertStringIncludes(markdown, "## Cluster 2");
});

Deno.test("formatAsMarkdown - contains metadata", () => {
  const result = createTestResult();
  const markdown = formatAsMarkdown(result);

  assertStringIncludes(markdown, "Algorithm: hierarchical");
  assertStringIncludes(markdown, "Distance Calculator: levenshtein");
  assertStringIncludes(markdown, "Total Clusters: 2");
  assertStringIncludes(markdown, "Total IDs: 3");
});

Deno.test("formatAsMarkdown - contains IDs", () => {
  const result = createTestResult();
  const markdown = formatAsMarkdown(result);

  assertStringIncludes(markdown, "req:apikey:hierarchy-9a2f4d#20251111a");
  assertStringIncludes(markdown, "req:apikey:vendor-mgmt-3b7e5c#20251111a");
  assertStringIncludes(markdown, "req:dashboard:login-display-a1b2c3#20251111");
});

Deno.test("formatAsMarkdown - contains file paths", () => {
  const result = createTestResult();
  const markdown = formatAsMarkdown(result);

  assertStringIncludes(markdown, "test1.md:10");
  assertStringIncludes(markdown, "test1.md:20");
  assertStringIncludes(markdown, "test2.md:5");
});

Deno.test("formatAsCsv - contains header row", () => {
  const result = createTestResult();
  const csv = formatAsCsv(result);

  const lines = csv.split("\n");
  const header = lines[0];

  assertStringIncludes(
    header,
    "ClusterID,TraceabilityID,FilePath,LineNumber,Level,Scope,Semantic,Hash,Version",
  );
});

Deno.test("formatAsCsv - contains data rows", () => {
  const result = createTestResult();
  const csv = formatAsCsv(result);

  const lines = csv.split("\n").filter((l) => l.trim() !== "");

  // Header + 3 data rows
  assertEquals(lines.length, 4);

  // Check first data row
  assertStringIncludes(lines[1], '1,"req:apikey:hierarchy-9a2f4d#20251111a"');
  assertStringIncludes(lines[1], '"test1.md",10');
  assertStringIncludes(
    lines[1],
    '"req","apikey","hierarchy","9a2f4d","20251111a"',
  );
});

Deno.test("formatAsCsv - proper CSV escaping", () => {
  const result = createTestResult();
  const csv = formatAsCsv(result);

  // All string fields should be quoted
  assertStringIncludes(csv, '"req:apikey:hierarchy-9a2f4d#20251111a"');
  assertStringIncludes(csv, '"test1.md"');
  assertStringIncludes(csv, '"req"');
});

Deno.test("formatResult - json format", () => {
  const result = createTestResult();
  const output = formatResult(result, "json");

  // Should be valid JSON
  const parsed = JSON.parse(output);
  assertEquals(parsed.algorithm, "hierarchical");
});

Deno.test("formatResult - markdown format", () => {
  const result = createTestResult();
  const output = formatResult(result, "markdown");

  assertStringIncludes(output, "# Traceability ID Clustering Results");
});

Deno.test("formatResult - csv format", () => {
  const result = createTestResult();
  const output = formatResult(result, "csv");

  assertStringIncludes(output, "ClusterID,TraceabilityID");
});

Deno.test("formatAsMarkdown - empty clusters", () => {
  const emptyResult: ClusteringResult = {
    clusters: [],
    algorithm: "hierarchical",
    distanceCalculator: "levenshtein",
  };

  const markdown = formatAsMarkdown(emptyResult);

  assertStringIncludes(markdown, "Total Clusters: 0");
  assertStringIncludes(markdown, "Total IDs: 0");
});

Deno.test("formatAsCsv - empty clusters", () => {
  const emptyResult: ClusteringResult = {
    clusters: [],
    algorithm: "hierarchical",
    distanceCalculator: "levenshtein",
  };

  const csv = formatAsCsv(emptyResult);

  const lines = csv.split("\n").filter((l) => l.trim() !== "");

  // Only header row
  assertEquals(lines.length, 1);
});
