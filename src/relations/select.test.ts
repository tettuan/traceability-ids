import { assertEquals } from "@std/assert";
import { RELATION_KINDS } from "../core/relations.ts";
import { extractIdsFromText } from "../core/extractor.ts";
import { formatRelations } from "../formatter/relations_formatter.ts";
import { extractRelationsFromText } from "./extract.ts";
import { itemsOf, resolveDeclarations } from "./resolve.ts";
import {
  type RelationFilter,
  type RelationSelection,
  type RelationSelectionResult,
  selectRelations,
} from "./select.ts";

const TEXT = `---
id: req:a:self-a1b2c3#v1
trace_to:
  - req:a:self-a1b2c3#v1
  - req:a:other-d4e5f6
derived_from:
  - req:a:gone-g7h8i9#v1
---
# req:a:other-d4e5f6#v2
`;

const RESOLVED_ONLY: RelationFilter = { kinds: RELATION_KINDS, status: "resolved" };

function select(
  selection: RelationSelection,
  filter: RelationFilter = RESOLVED_ONLY,
): RelationSelectionResult {
  const relations = extractRelationsFromText(TEXT, "a.md");
  const ids = extractIdsFromText(TEXT, "a.md");
  const resolved = resolveDeclarations(relations.declarations, relations.referenceLines, ids);
  return selectRelations(
    resolved,
    itemsOf(ids, relations.referenceLines),
    selection,
    filter,
    "latest",
  );
}

Deno.test("selectRelations - all: every declaration as out, filtered by status and kind", () => {
  assertEquals(
    select({ kind: "all" }).rows.map((r) => [r.direction, r.declaration.target]),
    [["out", "req:a:self-a1b2c3#v1"], ["out", "req:a:other-d4e5f6"]],
  );
  const broken = select({ kind: "all" }, { kinds: ["derived_from"], status: "broken" });
  assertEquals(broken.rows.map((r) => [r.declaration.target, r.resolution]), [
    ["req:a:gone-g7h8i9#v1", { status: "broken", reason: { kind: "NodeMissing" } }],
  ]);
  assertEquals(select({ kind: "all" }, { kinds: [], status: "resolved" }).rows, []);
});

Deno.test("selectRelations - a self reference is one out row; in follows resolved targets", () => {
  const both = select({ kind: "ids", ids: ["req:a:self-a1b2c3"], direction: "both" });
  assertEquals(both.rows.map((r) => [r.direction, r.declaration.target]), [
    ["out", "req:a:self-a1b2c3#v1"],
    ["out", "req:a:other-d4e5f6"],
  ]);
  const into = select({ kind: "ids", ids: ["req:a:other-d4e5f6#v2"], direction: "in" });
  assertEquals(into.rows.map((r) => [r.direction, r.declaration.target, r.resolution]), [
    ["in", "req:a:other-d4e5f6", { status: "resolved", targets: ["req:a:other-d4e5f6#v2"] }],
  ]);
  assertEquals(
    select({ kind: "ids", ids: ["req:a:other-d4e5f6"], direction: "out" }).rows,
    [],
  );
});

Deno.test("selectRelations - missing: requested IDs neither an item nor a declared target", () => {
  const brokenFilter: RelationFilter = { kinds: RELATION_KINDS, status: "broken" };
  const gone = select({ kind: "ids", ids: ["req:a:gone-g7h8i9"], direction: "in" }, brokenFilter);
  assertEquals([gone.rows.length, gone.missing], [1, []]);
  const nothing = select({
    kind: "ids",
    ids: ["req:a:none-000000", "req:a:self-a1b2c3"],
    direction: "both",
  });
  assertEquals(nothing.missing, ["req:a:none-000000"]);
});

Deno.test("formatRelations - simple, tsv (6 columns) and json", () => {
  const { rows } = select({ kind: "all" }, { kinds: RELATION_KINDS, status: "broken" });
  assertEquals(
    formatRelations(rows, "simple"),
    "a.md:7: req:a:self-a1b2c3#v1 -derived_from-> req:a:gone-g7h8i9#v1 (node not found)\n",
  );
  assertEquals(
    formatRelations(rows, "tsv"),
    "out\tderived_from\treq:a:self-a1b2c3#v1\treq:a:gone-g7h8i9#v1\ta.md:7\tNodeMissing\n",
  );
  assertEquals(JSON.parse(formatRelations(rows, "json")).rows[0].resolution, {
    status: "broken",
    reason: { kind: "NodeMissing" },
  });
  assertEquals(formatRelations([], "simple"), "");
});
