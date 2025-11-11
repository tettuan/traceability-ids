import { assertAlmostEquals, assertEquals } from "jsr:@std/assert";
import { CosineDistance } from "./cosine.ts";

Deno.test("CosineDistance - identical strings", () => {
  const calculator = new CosineDistance();
  const distance = calculator.calculate("hello", "hello");
  assertAlmostEquals(distance, 0, 0.01); // Should be very close to 0
});

Deno.test("CosineDistance - completely different strings", () => {
  const calculator = new CosineDistance();
  const distance = calculator.calculate("abc", "xyz");
  assertEquals(distance, 1); // No common n-grams = distance of 1
});

Deno.test("CosineDistance - similar strings", () => {
  const calculator = new CosineDistance();

  // Strings with many common bigrams
  const d1 = calculator.calculate("hello", "hallo");
  // Strings with few common bigrams
  const d2 = calculator.calculate("hello", "world");

  // hello and hallo share more bigrams than hello and world
  assertEquals(d1 < d2, true);
});

Deno.test("CosineDistance - anagram strings", () => {
  const calculator = new CosineDistance();

  // Anagrams have the same character frequencies
  const distance = calculator.calculate("listen", "silent");
  // Should have some distance (bigrams are different despite same letters)
  assertEquals(distance < 1, true);
  assertEquals(distance > 0, true);
});

Deno.test("CosineDistance - empty strings", () => {
  const calculator = new CosineDistance();
  assertEquals(calculator.calculate("", ""), 0);
  assertEquals(calculator.calculate("", "abc"), 1);
  assertEquals(calculator.calculate("abc", ""), 1);
});

Deno.test("CosineDistance - different n-gram sizes", () => {
  const calc2 = new CosineDistance(2); // bigrams
  const calc3 = new CosineDistance(3); // trigrams

  const str1 = "hello";
  const str2 = "hallo";

  const d2 = calc2.calculate(str1, str2);
  const d3 = calc3.calculate(str1, str2);

  // Both should indicate similarity, but values may differ
  assertEquals(d2 < 1, true);
  assertEquals(d3 < 1, true);
});

Deno.test("CosineDistance - traceability IDs", () => {
  const calculator = new CosineDistance();

  // IDs with similar patterns
  const id1 = "req:apikey:hierarchy-9a2f4d#20251111a";
  const id2 = "req:apikey:vendor-mgmt-3b7e5c#20251111a";

  // ID with different pattern
  const id3 = "des:dashboard:login-a1b2c3#20251111";

  const d1 = calculator.calculate(id1, id2);
  const d2 = calculator.calculate(id1, id3);

  // id1 and id2 share more patterns (req:apikey:, #20251111a)
  assertEquals(d1 < d2, true);
});
