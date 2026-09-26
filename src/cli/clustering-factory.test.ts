import { assertEquals } from "@std/assert";
import { ALGORITHM_NAMES } from "../core/options.ts";
import { createClusteringAlgorithm } from "./clustering-factory.ts";
import type { ClusteringOptions } from "./clustering-factory.ts";

const defaultOptions: ClusteringOptions = {
  threshold: 0.3,
  k: 3,
  epsilon: 0.3,
  minPoints: 2,
};

Deno.test("createClusteringAlgorithm - hierarchical", () => {
  const algo = createClusteringAlgorithm("hierarchical", defaultOptions);
  assertEquals(algo.name, "hierarchical");
  assertEquals(typeof algo.cluster, "function");
});

Deno.test("createClusteringAlgorithm - kmeans", () => {
  const algo = createClusteringAlgorithm("kmeans", defaultOptions);
  assertEquals(algo.name, "kmeans");
  assertEquals(typeof algo.cluster, "function");
});

Deno.test("createClusteringAlgorithm - dbscan", () => {
  const algo = createClusteringAlgorithm("dbscan", defaultOptions);
  assertEquals(algo.name, "dbscan");
  assertEquals(typeof algo.cluster, "function");
});

Deno.test("createClusteringAlgorithm - algorithms cluster empty input", () => {
  for (const name of ALGORITHM_NAMES) {
    const algo = createClusteringAlgorithm(name, defaultOptions);
    const result = algo.cluster([], []);
    assertEquals(Array.isArray(result), true);
  }
});
