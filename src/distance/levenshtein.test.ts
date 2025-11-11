import { assertEquals } from "jsr:@std/assert";
import { LevenshteinDistance } from "./levenshtein.ts";

Deno.test("LevenshteinDistance - identical strings", () => {
  const calculator = new LevenshteinDistance();
  const distance = calculator.calculate("hello", "hello");
  assertEquals(distance, 0);
});

Deno.test("LevenshteinDistance - completely different strings", () => {
  const calculator = new LevenshteinDistance();
  const distance = calculator.calculate("abc", "xyz");
  assertEquals(distance, 3);
});

Deno.test("LevenshteinDistance - one insertion", () => {
  const calculator = new LevenshteinDistance();
  const distance = calculator.calculate("cat", "cats");
  assertEquals(distance, 1);
});

Deno.test("LevenshteinDistance - one deletion", () => {
  const calculator = new LevenshteinDistance();
  const distance = calculator.calculate("cats", "cat");
  assertEquals(distance, 1);
});

Deno.test("LevenshteinDistance - one substitution", () => {
  const calculator = new LevenshteinDistance();
  const distance = calculator.calculate("cat", "bat");
  assertEquals(distance, 1);
});

Deno.test("LevenshteinDistance - empty strings", () => {
  const calculator = new LevenshteinDistance();
  assertEquals(calculator.calculate("", ""), 0);
  assertEquals(calculator.calculate("", "abc"), 3);
  assertEquals(calculator.calculate("abc", ""), 3);
});

Deno.test("LevenshteinDistance - traceability IDs", () => {
  const calculator = new LevenshteinDistance();

  // Similar IDs (same scope and semantic)
  const id1 = "req:apikey:hierarchy-9a2f4d#20251111a";
  const id2 = "req:apikey:hierarchy-9a2f4d#20251111b";
  const distance1 = calculator.calculate(id1, id2);
  assertEquals(distance1, 1); // Only version differs by one character

  // Different IDs
  const id3 = "req:dashboard:login-display-a1b2c3#20251111";
  const distance2 = calculator.calculate(id1, id3);
  // Should be larger than similar IDs
  assertEquals(distance2 > distance1, true);
});
