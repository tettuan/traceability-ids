import { assertEquals } from "@std/assert";
import {
  compareVersionsDesc,
  findIds,
  hasVersion,
  parseId,
  uniqueKeyOf,
  withVersion,
} from "./id.ts";

Deno.test("parseId - versioned and versionless", () => {
  assertEquals(parseId("req:a:login-form-abc#v2"), {
    fullId: "req:a:login-form-abc#v2",
    level: "req",
    scope: "a",
    semantic: "login-form",
    hash: "abc",
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
