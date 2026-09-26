import { assertEquals, assertThrows } from "@std/assert";
import { TraceabilityError } from "./errors.ts";
import { DISTANCE_NAMES, parseChoice, parseInteger, parseNumber } from "./options.ts";

function detailOf(fn: () => unknown): unknown {
  return assertThrows(fn, TraceabilityError).detail;
}

Deno.test("parseChoice - accepts only listed values", () => {
  assertEquals(parseChoice("--distance", "cosine", DISTANCE_NAMES), "cosine");
  assertEquals(detailOf(() => parseChoice("--distance", "euclid", DISTANCE_NAMES)), {
    kind: "InvalidOptionValue",
    option: "--distance",
    value: "euclid",
    expected: "one of levenshtein, jaro-winkler, cosine, structural",
  });
});

Deno.test("parseInteger - rejects NaN, fractions and values below min", () => {
  assertEquals(parseInteger("--k", "3"), 3);
  for (const bad of ["abc", "1.5", "", "-1"]) {
    assertThrows(() => parseInteger("--k", bad), TraceabilityError, "--k");
  }
  assertThrows(() => parseInteger("--top", "0", 1), TraceabilityError, ">= 1");
});

Deno.test("parseNumber - accepts finite numbers >= min", () => {
  assertEquals(parseNumber("--threshold", "0.25"), 0.25);
  assertThrows(() => parseNumber("--threshold", "x"), TraceabilityError);
  assertThrows(() => parseNumber("--threshold", "-0.1"), TraceabilityError);
});
