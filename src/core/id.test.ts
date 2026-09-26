import { assertEquals } from "@std/assert";
import {
  compareVersionsDesc,
  compileHashRule,
  DEFAULT_HASH_RULE,
  findIds,
  hasHash,
  hasVersion,
  parseId,
  uniqueKeyOf,
  withVersion,
} from "./id.ts";

Deno.test("parseId - versioned and versionless", () => {
  assertEquals(parseId("req:a:login-form-a1b2c3#v2"), {
    fullId: "req:a:login-form-a1b2c3#v2",
    level: "req",
    scope: "a",
    semantic: "login-form",
    hash: "a1b2c3",
    version: "v2",
  });
  assertEquals(parseId("req:a:login-abc")?.version, "");
  assertEquals(parseId("req:a:login-abc#"), null);
  assertEquals(parseId("not an id"), null);
});

Deno.test("findIds - skips bare # and words continuing after the hash", () => {
  assertEquals(
    findIds("x req:a:b-1f, req:a:b-2f#v1 req:a:b-3f# req:a:b-4f_x").map((c) => c.fullId),
    ["req:a:b-1f", "req:a:b-2f#v1"],
  );
});

Deno.test("unique key helpers", () => {
  assertEquals(hasVersion("a:b:c-1#v1"), true);
  assertEquals(hasVersion("a:b:c-1"), false);
  assertEquals(uniqueKeyOf("a:b:c-1#v1"), "a:b:c-1");
  assertEquals(withVersion("a:b:c-1", "v1"), "a:b:c-1#v1");
  assertEquals(withVersion("a:b:c-1", ""), "a:b:c-1");
});

Deno.test("compareVersionsDesc - numeric-aware, newest first", () => {
  assertEquals(
    ["v2", "20251111a", "v10", "20260810", "20251111b"].sort(compareVersionsDesc),
    ["v10", "v2", "20260810", "20251111b", "20251111a"],
  );
});

Deno.test("parseId - a last segment not in hash form is part of the semantic (Issue #10)", () => {
  const id = parseId("req:auth:login-flow");
  assertEquals([id?.semantic, id?.hash, id && hasHash(id)], ["login-flow", "", false]);
  const hashed = parseId("req:auth:login-flow-1a2b3c");
  assertEquals([hashed?.semantic, hashed?.hash, hashed && hasHash(hashed)], [
    "login-flow",
    "1a2b3c",
    true,
  ]);
  assertEquals(parseId("req:auth:login-flow#v1")?.semantic, "login-flow");
  assertEquals(parseId("req:auth:login")?.fullId, undefined);
});

Deno.test("hash rule - default: 6 lowercase letters or digits with a digit", () => {
  const cases: [string, boolean][] = [
    ["1a2b3c", true],
    ["000000", true],
    ["4f7b2e", true],
    ["layout", false],
    ["abc", false],
    ["1a2b3", false],
    ["1a2b3c4", false],
    ["1A2B3C", false],
  ];
  for (const [segment, expected] of cases) {
    assertEquals([segment, DEFAULT_HASH_RULE.test(segment)], [segment, expected]);
  }
});

Deno.test("hash rule - a custom pattern matches the whole segment", () => {
  const rule = compileHashRule("[0-9a-f]{3}|x+");
  assertEquals(rule !== null && [rule.test("abc"), rule.test("abcd"), rule.test("xx")], [
    true,
    false,
    true,
  ]);
  assertEquals(rule && parseId("req:a:b-abc", rule)?.hash, "abc");
  assertEquals(rule && findIds("req:a:b-flow", rule)[0].semantic, "b-flow");
  assertEquals(compileHashRule("("), null);
});
