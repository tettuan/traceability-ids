import { assertEquals, assertThrows } from "jsr:@std/assert@^1.0.0";
import { createDistanceCalculator } from "./distance-factory.ts";

Deno.test("createDistanceCalculator - levenshtein", () => {
  const calc = createDistanceCalculator("levenshtein");
  assertEquals(calc.name, "levenshtein");
  assertEquals(typeof calc.calculate, "function");
});

Deno.test("createDistanceCalculator - jaro-winkler", () => {
  const calc = createDistanceCalculator("jaro-winkler");
  assertEquals(calc.name, "jaro-winkler");
  assertEquals(typeof calc.calculate, "function");
});

Deno.test("createDistanceCalculator - cosine", () => {
  const calc = createDistanceCalculator("cosine");
  assertEquals(calc.name, "cosine");
  assertEquals(typeof calc.calculate, "function");
});

Deno.test("createDistanceCalculator - structural", () => {
  const calc = createDistanceCalculator("structural");
  assertEquals(calc.name, "structural");
  assertEquals(typeof calc.calculate, "function");
});

Deno.test("createDistanceCalculator - unknown throws", () => {
  assertThrows(
    () => createDistanceCalculator("unknown"),
    Error,
    "Unknown distance calculator",
  );
});

Deno.test("createDistanceCalculator - calculators produce valid output", () => {
  const names = ["levenshtein", "jaro-winkler", "cosine", "structural"];
  for (const name of names) {
    const calc = createDistanceCalculator(name);
    const d = calc.calculate("abc", "abd");
    assertEquals(typeof d, "number");
    assertEquals(d >= 0, true);
  }
});
