import { assertEquals } from "@std/assert";
import { parseId } from "../core/id.ts";
import type { TraceabilityId } from "../core/types.ts";
import { resolveTargetId } from "./resolver.ts";

function occ(fullId: string, lineNumber: number): TraceabilityId {
  const components = parseId(fullId);
  if (!components) throw new Error(`bad fixture ${fullId}`);
  return { ...components, filePath: "/f.md", lineNumber };
}

const IDS = [
  occ("req:a:b-1#v1", 1),
  occ("req:a:b-1#v10", 2),
  occ("req:a:b-1", 3),
  occ("req:a:b-1#v2", 4),
  occ("req:a:b-2#v1", 5),
];

function shape(groups: ReturnType<typeof resolveTargetId>): [string, number[]][] {
  return groups.map((g) => [g.fullId, g.matches.map((m) => m.lineNumber)]);
}

Deno.test("resolveTargetId - versioned is exact regardless of mode", () => {
  assertEquals(shape(resolveTargetId("req:a:b-1#v2", IDS, "all")), [["req:a:b-1#v2", [4]]]);
});

Deno.test("resolveTargetId - latest keeps the newest version plus versionless refs", () => {
  assertEquals(shape(resolveTargetId("req:a:b-1", IDS, "latest")), [
    ["req:a:b-1#v10", [2]],
    ["req:a:b-1", [3]],
  ]);
});

Deno.test("resolveTargetId - all keeps every version newest first", () => {
  assertEquals(shape(resolveTargetId("req:a:b-1", IDS, "all")).map(([id]) => id), [
    "req:a:b-1#v10",
    "req:a:b-1#v2",
    "req:a:b-1#v1",
    "req:a:b-1",
  ]);
});

Deno.test("resolveTargetId - no match gives no groups", () => {
  assertEquals(resolveTargetId("req:a:b-9", IDS, "latest"), []);
  assertEquals(resolveTargetId("req:a:b-9#v1", IDS, "latest"), []);
});
