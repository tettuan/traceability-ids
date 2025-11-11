import { assertEquals } from "jsr:@std/assert";
import { DBSCANClustering } from "./dbscan.ts";
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

Deno.test("DBSCANClustering - single item becomes noise", () => {
  const algorithm = new DBSCANClustering(5, 2);
  const items = [createTestId("req:test:item1-abc123#v1", 1)];
  const distanceMatrix = [[0]];

  const clusters = algorithm.cluster(items, distanceMatrix);

  // Single item with minPoints=2 becomes noise cluster
  assertEquals(clusters.length, 1);
  assertEquals(clusters[0].items.length, 1);
});

Deno.test("DBSCANClustering - dense cluster", () => {
  const algorithm = new DBSCANClustering(5, 2);
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("req:test:item2-abc124#v1", 2),
    createTestId("req:test:item3-abc125#v1", 3),
  ];

  // All items within epsilon distance of each other
  const distanceMatrix = [
    [0, 2, 3],
    [2, 0, 2],
    [3, 2, 0],
  ];

  const clusters = algorithm.cluster(items, distanceMatrix);

  // Should form one cluster (all within epsilon=5)
  assertEquals(clusters.length, 1);
  assertEquals(clusters[0].items.length, 3);
});

Deno.test("DBSCANClustering - two separate clusters", () => {
  const algorithm = new DBSCANClustering(5, 2);
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("req:test:item2-abc124#v1", 2),
    createTestId("des:other:item3-xyz789#v2", 3),
    createTestId("des:other:item4-xyz790#v2", 4),
  ];

  // Two groups: {0,1} and {2,3}, far apart
  const distanceMatrix = [
    [0, 2, 30, 32],
    [2, 0, 32, 30],
    [30, 32, 0, 2],
    [32, 30, 2, 0],
  ];

  const clusters = algorithm.cluster(items, distanceMatrix);

  // Should create 2 clusters
  assertEquals(clusters.length, 2);

  // Each cluster should have 2 items
  const sizes = clusters.map((c) => c.items.length).sort();
  assertEquals(sizes, [2, 2]);
});

Deno.test("DBSCANClustering - noise points", () => {
  const algorithm = new DBSCANClustering(5, 2);
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("req:test:item2-abc124#v1", 2),
    createTestId("req:test:item3-abc125#v1", 3),
    createTestId("des:other:outlier-xyz789#v2", 4), // Outlier
  ];

  // Items 0,1,2 form a cluster; item 3 is far away
  const distanceMatrix = [
    [0, 2, 3, 50],
    [2, 0, 2, 50],
    [3, 2, 0, 50],
    [50, 50, 50, 0],
  ];

  const clusters = algorithm.cluster(items, distanceMatrix);

  // Should create 2 clusters: one with 3 items, one noise cluster with 1
  assertEquals(clusters.length, 2);

  const sizes = clusters.map((c) => c.items.length).sort();
  assertEquals(sizes, [1, 3]);
});

Deno.test("DBSCANClustering - epsilon controls clustering", () => {
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("req:test:item2-abc124#v1", 2),
    createTestId("req:test:item3-abc125#v1", 3),
  ];

  const distanceMatrix = [
    [0, 5, 10],
    [5, 0, 5],
    [10, 5, 0],
  ];

  // Small epsilon: items separate or noise
  const algo1 = new DBSCANClustering(3, 2);
  const clusters1 = algo1.cluster(items, distanceMatrix);
  // No pairs within epsilon=3, all become noise
  assertEquals(clusters1.length, 1); // Noise cluster

  // Large epsilon: all items in one cluster
  const algo2 = new DBSCANClustering(15, 2);
  const clusters2 = algo2.cluster(items, distanceMatrix);
  assertEquals(clusters2.length, 1); // All in one cluster
  assertEquals(clusters2[0].items.length, 3);
});

Deno.test("DBSCANClustering - minPoints controls density", () => {
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("req:test:item2-abc124#v1", 2),
    createTestId("req:test:item3-abc125#v1", 3),
  ];

  const distanceMatrix = [
    [0, 2, 3],
    [2, 0, 2],
    [3, 2, 0],
  ];

  // Low minPoints: forms cluster
  const algo1 = new DBSCANClustering(5, 2);
  const clusters1 = algo1.cluster(items, distanceMatrix);
  assertEquals(clusters1.length, 1);
  assertEquals(clusters1[0].items.length, 3);

  // High minPoints: no dense enough cluster, all noise
  const algo2 = new DBSCANClustering(5, 4);
  const clusters2 = algo2.cluster(items, distanceMatrix);
  assertEquals(clusters2.length, 1); // Noise cluster
  assertEquals(clusters2[0].items.length, 3);
});

Deno.test("DBSCANClustering - empty input", () => {
  const algorithm = new DBSCANClustering(5, 2);
  const items: TraceabilityId[] = [];
  const distanceMatrix: number[][] = [];

  const clusters = algorithm.cluster(items, distanceMatrix);

  assertEquals(clusters.length, 0);
});

Deno.test("DBSCANClustering - chain of points", () => {
  const algorithm = new DBSCANClustering(5, 2);
  const items = Array.from({ length: 5 }, (_, i) =>
    createTestId(`req:test:item${i}-abc123#v1`, i)
  );

  // Chain: 0-1-2-3-4, each 4 units apart
  const distanceMatrix = items.map((_, i) =>
    items.map((_, j) => Math.abs(i - j) * 4)
  );

  const clusters = algorithm.cluster(items, distanceMatrix);

  // All should be connected in one cluster (each has 2 neighbors within epsilon)
  assertEquals(clusters.length, 1);
  assertEquals(clusters[0].items.length, 5);
});
