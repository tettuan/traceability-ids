import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { buildGraphData } from "./graph_data.ts";
import type { Cluster, TraceabilityId } from "../core/types.ts";

function makeId(fullId: string, opts?: Partial<TraceabilityId>): TraceabilityId {
  const parts = fullId.split(/[:# -]/);
  return {
    fullId,
    level: parts[0] || "req",
    scope: parts[1] || "test",
    semantic: parts[2] || "item",
    hash: parts[3] || "abc",
    version: parts[4] || "v1",
    filePath: opts?.filePath || "test.md",
    lineNumber: opts?.lineNumber || 1,
  };
}

const ids: TraceabilityId[] = [
  makeId("req:auth:login-aaa#v1"),
  makeId("req:auth:signup-bbb#v1"),
  makeId("req:api:key-ccc#v1"),
];

const matrix: number[][] = [
  [0, 0.2, 0.8],
  [0.2, 0, 0.7],
  [0.8, 0.7, 0],
];

const clusters: Cluster[] = [
  { id: 0, items: [ids[0], ids[1]] },
  { id: 1, items: [ids[2]] },
];

Deno.test("buildGraphData - creates correct number of nodes", () => {
  const data = buildGraphData(ids, matrix, clusters, 0.5);
  assertEquals(data.nodes.length, 3);
});

Deno.test("buildGraphData - nodes have correct cluster IDs", () => {
  const data = buildGraphData(ids, matrix, clusters, 0.5);
  const nodeMap = new Map(data.nodes.map((n) => [n.fullId, n]));
  assertEquals(nodeMap.get("req:auth:login-aaa#v1")?.clusterId, 0);
  assertEquals(nodeMap.get("req:auth:signup-bbb#v1")?.clusterId, 0);
  assertEquals(nodeMap.get("req:api:key-ccc#v1")?.clusterId, 1);
});

Deno.test("buildGraphData - edge threshold filters links", () => {
  // threshold 0.5 → only distance ≤ 0.5 → edge 0-1 (0.2)
  const data = buildGraphData(ids, matrix, clusters, 0.5);
  assertEquals(data.links.length, 1);
  assertEquals(data.links[0].distance, 0.2);
});

Deno.test("buildGraphData - high threshold includes all links", () => {
  const data = buildGraphData(ids, matrix, clusters, 1.0);
  assertEquals(data.links.length, 3);
});

Deno.test("buildGraphData - zero threshold includes no links", () => {
  const data = buildGraphData(ids, matrix, clusters, 0.0);
  // Only self-distance 0 pairs, but i < j loop means diagonal is excluded
  assertEquals(data.links.length, 0);
});

Deno.test("buildGraphData - nodes have tabId assigned", () => {
  const data = buildGraphData(ids, matrix, clusters, 0.5);
  const tabIds = data.nodes.map((n) => n.tabId).sort();
  assertEquals(tabIds, [0, 1, 2]);
});

Deno.test("buildGraphData - MDS coordinates applied as fixed positions", () => {
  const mdsCoords = [
    [1.0, 2.0, 3.0],
    [4.0, 5.0, 6.0],
    [7.0, 8.0, 9.0],
  ];
  const data = buildGraphData(ids, matrix, clusters, 0.5, mdsCoords);
  const nodeMap = new Map(data.nodes.map((n) => [n.fullId, n]));
  const node0 = nodeMap.get("req:auth:login-aaa#v1");
  assertEquals(node0?.fx, 100);
  assertEquals(node0?.fy, 200);
  assertEquals(node0?.fz, 300);
});

Deno.test("buildGraphData - nodes sorted by tabId", () => {
  const data = buildGraphData(ids, matrix, clusters, 0.5);
  for (let i = 0; i < data.nodes.length - 1; i++) {
    assertEquals(data.nodes[i].tabId <= data.nodes[i + 1].tabId, true);
  }
});

Deno.test("buildGraphData - empty input", () => {
  const data = buildGraphData([], [], [], 0.5);
  assertEquals(data.nodes.length, 0);
  assertEquals(data.links.length, 0);
});

Deno.test("buildGraphData - node properties preserved", () => {
  const data = buildGraphData(ids, matrix, clusters, 0.5);
  const node = data.nodes.find((n) => n.fullId === "req:auth:login-aaa#v1");
  assertEquals(node?.level, "req");
  assertEquals(node?.scope, "auth");
  assertEquals(node?.filePath, "test.md");
});
