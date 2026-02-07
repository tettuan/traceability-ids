import { assertEquals } from "jsr:@std/assert@^1.0.0";
import {
  formatListAsCsv,
  formatListAsJson,
  formatListAsSimple,
  formatListResult,
} from "./list_formatter.ts";
import type { IdIndex } from "../core/types.ts";

const index: IdIndex = {
  totalUniqueIds: 2,
  totalOccurrences: 3,
  entries: [
    {
      fullId: "req:auth:login-aaa#v1",
      level: "req",
      scope: "auth",
      semantic: "login",
      hash: "aaa",
      version: "v1",
      occurrences: [
        { filePath: "a.md", lineNumber: 1 },
        { filePath: "b.md", lineNumber: 5 },
      ],
    },
    {
      fullId: "req:api:key-bbb#v1",
      level: "req",
      scope: "api",
      semantic: "key",
      hash: "bbb",
      version: "v1",
      occurrences: [
        { filePath: "a.md", lineNumber: 10 },
      ],
    },
  ],
};

Deno.test("formatListAsJson - valid JSON output", () => {
  const json = formatListAsJson(index);
  const parsed = JSON.parse(json);
  assertEquals(parsed.totalUniqueIds, 2);
  assertEquals(parsed.totalOccurrences, 3);
  assertEquals(parsed.entries.length, 2);
  assertEquals(parsed.entries[0].occurrences.length, 2);
});

Deno.test("formatListAsSimple - one ID per line", () => {
  const result = formatListAsSimple(index);
  const lines = result.trim().split("\n");
  assertEquals(lines.length, 2);
  assertEquals(lines[0], "req:auth:login-aaa#v1");
  assertEquals(lines[1], "req:api:key-bbb#v1");
});

Deno.test("formatListAsCsv - header and rows", () => {
  const csv = formatListAsCsv(index);
  const lines = csv.trim().split("\n");
  // Header + 3 occurrence rows (2 for first entry, 1 for second)
  assertEquals(lines.length, 4);
  assertEquals(lines[0].startsWith("FullId,"), true);
});

Deno.test("formatListResult - dispatches correctly", () => {
  const json = formatListResult(index, "json");
  assertEquals(json.startsWith("{"), true);

  const simple = formatListResult(index, "simple");
  assertEquals(simple.includes("req:auth:login-aaa#v1"), true);

  const csv = formatListResult(index, "csv");
  assertEquals(csv.includes("FullId,"), true);
});

Deno.test("formatListAsJson - empty index", () => {
  const empty: IdIndex = { totalUniqueIds: 0, totalOccurrences: 0, entries: [] };
  const json = formatListAsJson(empty);
  const parsed = JSON.parse(json);
  assertEquals(parsed.entries.length, 0);
});
