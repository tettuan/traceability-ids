import { assertEquals } from "jsr:@std/assert";
import { KMeansClustering } from "./kmeans.ts";
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

Deno.test("KMeansClustering - single item", () => {
  const algorithm = new KMeansClustering(1);
  const items = [createTestId("req:test:item1-abc123#v1", 1)];
  const distanceMatrix = [[0]];

  const clusters = algorithm.cluster(items, distanceMatrix);

  assertEquals(clusters.length, 1);
  assertEquals(clusters[0].items.length, 1);
});

Deno.test("KMeansClustering - k larger than items", () => {
  const algorithm = new KMeansClustering(5);
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("req:test:item2-abc124#v1", 2),
  ];
  const distanceMatrix = [
    [0, 2],
    [2, 0],
  ];

  const clusters = algorithm.cluster(items, distanceMatrix);

  // Should create 2 clusters (one per item) since k > n
  assertEquals(clusters.length, 2);
});

Deno.test("KMeansClustering - two clusters", () => {
  const algorithm = new KMeansClustering(2, 100, 42); // Fixed seed for reproducibility
  const items = [
    createTestId("req:test:item1-abc123#v1", 1),
    createTestId("req:test:item1-abc124#v1", 2),
    createTestId("des:other:item2-xyz789#v2", 3),
    createTestId("des:other:item2-xyz790#v2", 4),
  ];

  // Two distinct groups: {0,1} and {2,3}
  const distanceMatrix = [
    [0, 2, 30, 32],
    [2, 0, 32, 30],
    [30, 32, 0, 2],
    [32, 30, 2, 0],
  ];

  const clusters = algorithm.cluster(items, distanceMatrix);

  assertEquals(clusters.length, 2);

  // Both clusters should have 2 items each
  const sizes = clusters.map((c) => c.items.length).sort();
  assertEquals(sizes, [2, 2]);
});

Deno.test("KMeansClustering - auto k estimation", () => {
  const algorithm = new KMeansClustering(0); // Auto estimate k
  const items = Array.from(
    { length: 10 },
    (_, i) => createTestId(`req:test:item${i}-abc123#v1`, i),
  );

  // Create a simple distance matrix
  const distanceMatrix = items.map((_, i) =>
    items.map((_, j) => (i === j ? 0 : Math.abs(i - j)))
  );

  const clusters = algorithm.cluster(items, distanceMatrix);

  // Should auto-estimate k (sqrt(n/2) = sqrt(5) ≈ 2-3)
  assertEquals(clusters.length >= 2, true);
  assertEquals(clusters.length <= 4, true);

  // All items should be assigned to some cluster
  const totalItems = clusters.reduce((sum, c) => sum + c.items.length, 0);
  assertEquals(totalItems, 10);
});

Deno.test("KMeansClustering - convergence", () => {
  const algorithm = new KMeansClustering(2, 10, 42); // Only 10 iterations max
  const items = Array.from(
    { length: 6 },
    (_, i) => createTestId(`req:test:item${i}-abc123#v1`, i),
  );

  // Two clear groups: {0,1,2} and {3,4,5}
  const distanceMatrix = items.map((_, i) =>
    items.map((_, j) => {
      if (i === j) return 0;
      if (Math.floor(i / 3) === Math.floor(j / 3)) return 2; // Same group
      return 20; // Different group
    })
  );

  const clusters = algorithm.cluster(items, distanceMatrix);

  assertEquals(clusters.length, 2);
  // Each cluster should have 3 items
  const sizes = clusters.map((c) => c.items.length).sort();
  assertEquals(sizes, [3, 3]);
});

Deno.test("KMeansClustering - empty input", () => {
  const algorithm = new KMeansClustering(3);
  const items: TraceabilityId[] = [];
  const distanceMatrix: number[][] = [];

  const clusters = algorithm.cluster(items, distanceMatrix);

  assertEquals(clusters.length, 0);
});

Deno.test("KMeansClustering - reproducibility with seed", () => {
  const items = Array.from(
    { length: 10 },
    (_, i) => createTestId(`req:test:item${i}-abc123#v1`, i),
  );

  const distanceMatrix = items.map((_, i) =>
    items.map((_, j) => (i === j ? 0 : Math.abs(i - j) + Math.random() * 0.1))
  );

  // Same seed should produce same results
  const algo1 = new KMeansClustering(3, 100, 12345);
  const algo2 = new KMeansClustering(3, 100, 12345);

  const clusters1 = algo1.cluster(items, distanceMatrix);
  const clusters2 = algo2.cluster(items, distanceMatrix);

  // Should produce same number of clusters
  assertEquals(clusters1.length, clusters2.length);

  // Cluster sizes should be the same
  const sizes1 = clusters1.map((c) => c.items.length).sort();
  const sizes2 = clusters2.map((c) => c.items.length).sort();
  assertEquals(sizes1, sizes2);
});
