import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { aggregateOccurrences, splitBatches } from "./aggregator.ts";
import type { TraceabilityId } from "../core/types.ts";

function makeId(
  fullId: string,
  filePath: string,
  lineNumber: number,
): TraceabilityId {
  const parts = fullId.split(/[:# -]/);
  return {
    fullId,
    level: parts[0] || "req",
    scope: parts[1] || "test",
    semantic: parts[2] || "item",
    hash: parts[3] || "abc",
    version: parts[4] || "v1",
    filePath,
    lineNumber,
  };
}

const rawIds: TraceabilityId[] = [
  makeId("req:auth:login-aaa#v1", "a.md", 1),
  makeId("req:auth:login-aaa#v1", "b.md", 5),
  makeId("req:api:key-bbb#v1", "a.md", 10),
  makeId("req:auth:login-aaa#v1", "c.md", 20),
];

Deno.test("aggregateOccurrences - groups by fullId", () => {
  const index = aggregateOccurrences(rawIds);
  assertEquals(index.totalUniqueIds, 2);
  assertEquals(index.totalOccurrences, 4);
});

Deno.test("aggregateOccurrences - collects all occurrences", () => {
  const index = aggregateOccurrences(rawIds);
  const login = index.entries.find((e) => e.fullId === "req:auth:login-aaa#v1");
  assertEquals(login?.occurrences.length, 3);
  assertEquals(login?.occurrences[0].filePath, "a.md");
  assertEquals(login?.occurrences[1].filePath, "b.md");
  assertEquals(login?.occurrences[2].filePath, "c.md");
});

Deno.test("aggregateOccurrences - preserves components", () => {
  const index = aggregateOccurrences(rawIds);
  const entry = index.entries.find((e) => e.fullId === "req:api:key-bbb#v1");
  assertEquals(entry?.level, "req");
  assertEquals(entry?.scope, "api");
  assertEquals(entry?.semantic, "key");
});

Deno.test("aggregateOccurrences - sort by fullId (default)", () => {
  const index = aggregateOccurrences(rawIds, "fullId");
  assertEquals(index.entries[0].fullId, "req:api:key-bbb#v1");
  assertEquals(index.entries[1].fullId, "req:auth:login-aaa#v1");
});

Deno.test("aggregateOccurrences - sort by count", () => {
  const index = aggregateOccurrences(rawIds, "count");
  // login has 3 occurrences, key has 1
  assertEquals(index.entries[0].fullId, "req:auth:login-aaa#v1");
  assertEquals(index.entries[1].fullId, "req:api:key-bbb#v1");
});

Deno.test("aggregateOccurrences - empty input", () => {
  const index = aggregateOccurrences([]);
  assertEquals(index.totalUniqueIds, 0);
  assertEquals(index.totalOccurrences, 0);
  assertEquals(index.entries.length, 0);
});

Deno.test("splitBatches - no split when batchSize is 0", () => {
  const index = aggregateOccurrences(rawIds);
  const batches = splitBatches(index, 0);
  assertEquals(batches.length, 1);
  assertEquals(batches[0].totalUniqueIds, 2);
});

Deno.test("splitBatches - splits correctly", () => {
  const index = aggregateOccurrences(rawIds);
  const batches = splitBatches(index, 1);
  assertEquals(batches.length, 2);
  assertEquals(batches[0].entries.length, 1);
  assertEquals(batches[1].entries.length, 1);
});

Deno.test("splitBatches - batch totalOccurrences is correct", () => {
  const index = aggregateOccurrences(rawIds, "fullId");
  const batches = splitBatches(index, 1);
  // First batch: req:api:key-bbb#v1 (1 occurrence)
  assertEquals(batches[0].totalOccurrences, 1);
  // Second batch: req:auth:login-aaa#v1 (3 occurrences)
  assertEquals(batches[1].totalOccurrences, 3);
});
