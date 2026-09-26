/**
 * Totality: every public function returns a value inside its codomain or throws a
 * typed error, for inputs at the edges of its domain.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { DBSCANClustering } from "../clustering/dbscan.ts";
import { HierarchicalClustering } from "../clustering/hierarchical.ts";
import { KMeansClustering } from "../clustering/kmeans.ts";
import { CosineDistance } from "../distance/cosine.ts";
import { JaroWinklerDistance } from "../distance/jaro_winkler.ts";
import { buildLocationContext } from "../extract/context.ts";
import { aggregateOccurrences, splitBatches } from "../list/aggregator.ts";
import { searchSimilar } from "../search/similarity.ts";
import { TraceabilityError } from "./errors.ts";
import { extractIdsFromText } from "./extractor.ts";
import { COMPLETE, lookupOutcome } from "./outcome.ts";
import { requireParameter } from "./params.ts";

const IDS = extractIdsFromText("req:a:b-1#v1 req:a:c-2#v1", "/f");

Deno.test("parameters - NaN, infinities and out-of-range values are InvalidParameter", () => {
  const constructors: [string, () => unknown][] = [
    ["cosine NaN", () => new CosineDistance(NaN)],
    ["cosine 1.5", () => new CosineDistance(1.5)],
    ["jaro NaN", () => new JaroWinklerDistance(NaN)],
    ["hierarchical NaN", () => new HierarchicalClustering(NaN)],
    ["hierarchical -1", () => new HierarchicalClustering(-1)],
    ["kmeans -1", () => new KMeansClustering(-1)],
    ["kmeans 1.5", () => new KMeansClustering(1.5)],
    ["dbscan Infinity", () => new DBSCANClustering(Infinity, 2)],
    ["dbscan minPoints 1.5", () => new DBSCANClustering(0.3, 1.5)],
  ];
  for (const [name, make] of constructors) {
    const error = assertThrows(make, TraceabilityError, undefined, name);
    assertEquals(error.kind, "InvalidParameter", name);
  }
  assertEquals(requireParameter("x", 0.25, { kind: "between", min: 0, max: 0.25 }), 0.25);
});

Deno.test("buildLocationContext - lines outside the file give an empty target", () => {
  for (const lineNumber of [0, -1, 5, 1.5, NaN]) {
    assertEquals(buildLocationContext(["a"], "/f", lineNumber, 3, 3), {
      filePath: "/f",
      lineNumber,
      targetLine: "",
      beforeLines: [],
      afterLines: [],
    });
  }
  const ctx = buildLocationContext(["a", "b", "c"], "/f", 2, -3, NaN);
  assertEquals([ctx.beforeLines.length, ctx.afterLines.length], [0, 0]);
});

Deno.test("searchSimilar - top outside 1.. never returns more than asked", () => {
  const calc = new CosineDistance();
  assertEquals(searchSimilar("a", IDS, calc).items.length, 2);
  for (const [top, expected] of [[0, 0], [-1, 0], [NaN, 0], [1.9, 1], [99, 2]]) {
    assertEquals(searchSimilar("a", IDS, calc, { top }).items.length, expected, `top=${top}`);
  }
});

Deno.test("splitBatches - non-positive or fractional size gives one batch", () => {
  const index = aggregateOccurrences(IDS);
  for (const size of [0, -1, 1.5, NaN]) assertEquals(splitBatches(index, size).length, 1);
  assertEquals(splitBatches(index, 1).length, 2);
});

Deno.test("lookupOutcome - partial always carries at least one missing ID", () => {
  assertEquals(lookupOutcome([]), COMPLETE);
  assertEquals(lookupOutcome(["x"]), { status: "partial", missing: ["x"] });
});
