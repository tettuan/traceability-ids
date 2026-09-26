import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { describeEvent } from "./events.ts";
import {
  describeBrokenRelation,
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

Deno.test("relations - every issue kind is described with its position and relation", () => {
  for (const issue of Object.values(ISSUES)) {
    const text = describeRelationIssue(issue);
    assertStringIncludes(text, positionKey(AT));
    assertStringIncludes(text, issue.relation);
    assertStringIncludes(describeEvent({ type: "RelationIssueFound", issue }), text);
  }
});

Deno.test("relations - broken relation line names source, kind and target", () => {
  const text = describeBrokenRelation(DECLARATION);
  for (const part of [positionKey(AT), DECLARATION.source, DECLARATION.kind, DECLARATION.target]) {
    assertStringIncludes(text, part);
  }
  assertStringIncludes(describeEvent({ type: "BrokenRelationFound", relation: DECLARATION }), text);
});
