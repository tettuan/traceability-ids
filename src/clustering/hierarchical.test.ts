import { assertEquals } from "jsr:@std/assert";
import { HierarchicalClustering } from "./hierarchical.ts";
import type { TraceabilityId } from "../core/types.ts";

// テスト用のTraceabilityIDを作成
function createTestId(id: string, index: number): TraceabilityId {
  return {
    fullId: id,
    level: "req",
    scope: "test",
    semantic: `item${index}`,
    hash: "abc123",
    version: "v1",
    filePath: "test.md",
    lineNumber: index,
  };
}

Deno.test("HierarchicalClustering - single item", () => {
  const algorithm = new HierarchicalClustering(10);
  const items = [createTestId("req:test:item1-abc123#v1", 1)];
  const distanceMatrix = [[0]];

  const clusters = algorithm.cluster(items, distanceMatrix);

  assertEquals(clusters.length, 1);
  assertEquals(clusters[0].items.length, 1);
  assertEquals(clusters[0].items[0], items[0]);
});

Deno.test("HierarchicalClustering - two identical items", () => {
  const algorithm = new HierarchicalClustering(10);
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("req:test:item1-abc123#v1", 2),
  ];
  const distanceMatrix = [
    [0, 0],
    [0, 0],
  ];

  const clusters = algorithm.cluster(items, distanceMatrix);

  // Should be merged into one cluster (distance = 0 <= threshold)
  assertEquals(clusters.length, 1);
  assertEquals(clusters[0].items.length, 2);
});

Deno.test("HierarchicalClustering - two very different items", () => {
  const algorithm = new HierarchicalClustering(5);
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("des:other:item2-xyz789#v2", 2),
  ];
  const distanceMatrix = [
    [0, 30],
    [30, 0],
  ];

  const clusters = algorithm.cluster(items, distanceMatrix);

  // Should remain as separate clusters (distance = 30 > threshold = 5)
  assertEquals(clusters.length, 2);
  assertEquals(clusters[0].items.length, 1);
  assertEquals(clusters[1].items.length, 1);
});

Deno.test("HierarchicalClustering - three items with groups", () => {
  const algorithm = new HierarchicalClustering(5);
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("req:test:item1-abc124#v1", 2), // Similar to item 1
    createTestId("des:other:item2-xyz789#v2", 3), // Different
  ];

  // Distance matrix: items 0 and 1 are close, item 2 is far
  const distanceMatrix = [
    [0, 2, 30],
    [2, 0, 30],
    [30, 30, 0],
  ];

  const clusters = algorithm.cluster(items, distanceMatrix);

  // Should create 2 clusters: {0, 1} and {2}
  assertEquals(clusters.length, 2);

  // Find the cluster with 2 items
  const largeCluster = clusters.find((c) => c.items.length === 2);
  const smallCluster = clusters.find((c) => c.items.length === 1);

  assertEquals(largeCluster !== undefined, true);
  assertEquals(smallCluster !== undefined, true);
  if (largeCluster) assertEquals(largeCluster.items.length, 2);
  if (smallCluster) assertEquals(smallCluster.items.length, 1);
});

Deno.test("HierarchicalClustering - threshold controls merging", () => {
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("req:test:item2-abc124#v1", 2),
  ];

  const distanceMatrix = [
    [0, 10],
    [10, 0],
  ];

  // With low threshold, items remain separate
  const algo1 = new HierarchicalClustering(5);
  const clusters1 = algo1.cluster(items, distanceMatrix);
  assertEquals(clusters1.length, 2);

  // With high threshold, items are merged
  const algo2 = new HierarchicalClustering(15);
  const clusters2 = algo2.cluster(items, distanceMatrix);
  assertEquals(clusters2.length, 1);
  assertEquals(clusters2[0].items.length, 2);
});

Deno.test("HierarchicalClustering - empty input", () => {
  const algorithm = new HierarchicalClustering(10);
  const items: TraceabilityId[] = [];
  const distanceMatrix: number[][] = [];

  const clusters = algorithm.cluster(items, distanceMatrix);

  assertEquals(clusters.length, 0);
});
