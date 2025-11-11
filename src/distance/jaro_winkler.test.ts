import { assertAlmostEquals, assertEquals } from "jsr:@std/assert";
import { JaroWinklerDistance } from "./jaro_winkler.ts";

Deno.test("JaroWinklerDistance - identical strings", () => {
  const calculator = new JaroWinklerDistance();
  const distance = calculator.calculate("hello", "hello");
  assertEquals(distance, 0); // Distance is 0 for identical strings
});

Deno.test("JaroWinklerDistance - completely different strings", () => {
  const calculator = new JaroWinklerDistance();
  const distance = calculator.calculate("abc", "xyz");
  assertEquals(distance, 1); // Distance is 1 for completely different strings
});

Deno.test("JaroWinklerDistance - similar strings", () => {
  const calculator = new JaroWinklerDistance();
  const distance = calculator.calculate("martha", "marhta");
  // Jaro-Winkler favors strings with matching prefixes
  // These two strings should be considered quite similar
  assertAlmostEquals(distance, 0.038, 0.01); // Low distance = high similarity
});

Deno.test("JaroWinklerDistance - prefix matching", () => {
  const calculator = new JaroWinklerDistance();

  // Strings with same prefix should have lower distance
  const d1 = calculator.calculate("prefix123", "prefix456");
  const d2 = calculator.calculate("abc123", "xyz456");

  // d1 should be smaller (more similar) due to common prefix
  assertEquals(d1 < d2, true);
});

Deno.test("JaroWinklerDistance - empty strings", () => {
  const calculator = new JaroWinklerDistance();
  assertEquals(calculator.calculate("", ""), 0); // Both empty = identical
  assertEquals(calculator.calculate("", "abc"), 1); // One empty = completely different
  assertEquals(calculator.calculate("abc", ""), 1);
});

Deno.test("JaroWinklerDistance - traceability IDs with same prefix", () => {
  const calculator = new JaroWinklerDistance();

  // IDs with very similar prefix
  const id1 = "req:apikey:hierarchy-9a2f4d#20251111a";
  const id2 = "req:apikey:hierarchy-9a2f4e#20251111a"; // Very similar

  // IDs with different prefix
  const id3 = "des:other:completely-different#v1";

  const d1 = calculator.calculate(id1, id2);
  const d2 = calculator.calculate(id1, id3);

  // id1 and id2 should be more similar due to common prefix
  assertEquals(d1 < d2, true);
});
