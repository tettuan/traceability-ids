import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { describeEvent } from "./events.ts";
import {
  type BrokenReason,
  type BrokenRelation,
  describeBrokenRelation,
  describeDeclaration,
  describeRelationIssue,
  isRelationKind,
  positionKey,
  RELATION_KINDS,
  RELATION_LABELS,
  type RelationDeclaration,
  type RelationIssue,
} from "./relations.ts";

const AT = { filePath: "docs/a.md", lineNumber: 7 };

/** One sample per issue kind; the mapped type makes a missing kind a compile error */
const ISSUES: { [K in RelationIssue["kind"]]: Extract<RelationIssue, { kind: K }> } = {
  SourceMissing: {
    kind: "SourceMissing",
    relation: "trace_to",
    targets: ["req:a:b-abc#v1"],
    ...AT,
  },
  InvalidTarget: { kind: "InvalidTarget", relation: "derived_from", value: "us:a:b", ...AT },
  InvalidYaml: { kind: "InvalidYaml", reason: "bad indentation", ...AT },
};

const DECLARATION: RelationDeclaration = {
  kind: "trace_to",
  source: "req:a:x-abc#v1",
  target: "req:a:y-def#v1",
  ...AT,
};

Deno.test("relations - every kind is recognized and labeled", () => {
  for (const kind of RELATION_KINDS) {
    assert(isRelationKind(kind));
    assert(RELATION_LABELS[kind].length > 0);
  }
  assertEquals(isRelationKind("id"), false);
});

Deno.test("relations - every issue kind is described with its position (and relation)", () => {
  for (const issue of Object.values(ISSUES)) {
    const text = describeRelationIssue(issue);
    assertStringIncludes(text, positionKey(AT));
    if ("relation" in issue) assertStringIncludes(text, issue.relation);
    assertStringIncludes(describeEvent({ type: "RelationIssueFound", issue }), text);
  }
});

/** One sample per broken reason; the mapped type makes a missing kind a compile error */
const REASONS: { [K in BrokenReason["kind"]]: [Extract<BrokenReason, { kind: K }>, string] } = {
  NodeMissing: [{ kind: "NodeMissing" }, "(node not found)"],
  VersionMissing: [
    { kind: "VersionMissing", existing: ["req:a:y-def#v3", "req:a:y-def"] },
    "(version not found: node exists with v3, no version)",
  ],
};

Deno.test("relations - broken relation line names position, source, kind, target and reason", () => {
  for (const [reason, reasonText] of Object.values(REASONS)) {
    const relation: BrokenRelation = { ...DECLARATION, reason };
    const text = describeBrokenRelation(relation);
    assertEquals(text, `${describeDeclaration(DECLARATION)} ${reasonText}`);
    assertEquals(
      describeDeclaration(DECLARATION),
      "docs/a.md:7: req:a:x-abc#v1 -trace_to-> req:a:y-def#v1",
    );
    assertStringIncludes(describeEvent({ type: "BrokenRelationFound", relation }), text);
  }
});
