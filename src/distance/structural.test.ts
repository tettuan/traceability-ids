import { assertAlmostEquals, assertEquals } from "jsr:@std/assert";
import { StructuralDistance } from "./structural.ts";

Deno.test("StructuralDistance - identical IDs", () => {
  const calculator = new StructuralDistance();
  const id = "req:apikey:hierarchy-9a2f4d#20251111a";
  const distance = calculator.calculate(id, id);
  assertEquals(distance, 0);
});

Deno.test("StructuralDistance - same structure, different values", () => {
  const calculator = new StructuralDistance();

  const id1 = "req:apikey:hierarchy-9a2f4d#20251111a";
  const id2 = "req:apikey:hierarchy-9a2f4d#20251111b";

  const distance = calculator.calculate(id1, id2);

  // Only version differs slightly, should have low distance
  assertEquals(distance < 0.2, true);
});

Deno.test("StructuralDistance - same level and scope", () => {
  const calculator = new StructuralDistance();

  const id1 = "req:apikey:hierarchy-9a2f4d#20251111a";
  const id2 = "req:apikey:vendor-mgmt-3b7e5c#20251111a";

  const distance = calculator.calculate(id1, id2);

  // Same level, scope, and version; different semantic and hash
  // Should be more similar than completely different IDs
  assertEquals(distance < 0.5, true);
});

Deno.test("StructuralDistance - different level", () => {
  const calculator = new StructuralDistance();

  const id1 = "req:apikey:hierarchy-9a2f4d#20251111a";
  const id2 = "des:apikey:hierarchy-9a2f4d#20251111a";

  const distance = calculator.calculate(id1, id2);

  // Only level differs
  // Based on default weights, level has 0.2 weight
  assertAlmostEquals(distance, 0.2, 0.1);
});

Deno.test("StructuralDistance - completely different IDs", () => {
  const calculator = new StructuralDistance();

  const id1 = "req:apikey:hierarchy-9a2f4d#20251111a";
  const id2 = "des:dashboard:login-a1b2c3#20240101";

  const distance = calculator.calculate(id1, id2);

  // All components are different, should have high distance
  assertEquals(distance > 0.7, true);
});

Deno.test("StructuralDistance - custom weights", () => {
  // Emphasize semantic similarity
  const calculator = new StructuralDistance({
    level: 0.1,
    scope: 0.1,
    semantic: 0.6, // High weight for semantic
    hash: 0.1,
    version: 0.1,
  });

  const id1 = "req:apikey:hierarchy-9a2f4d#20251111a";
  const id2 = "req:apikey:hierarchy-xyz123#20251111b";

  const distance = calculator.calculate(id1, id2);

  // Same level, scope, semantic; different hash and version
  // With these weights, should have low distance
  assertEquals(distance < 0.3, true);
});

Deno.test("StructuralDistance - invalid ID format fallback", () => {
  const calculator = new StructuralDistance();

  // Invalid format should fall back to normalized Levenshtein
  const str1 = "not-a-valid-id";
  const str2 = "also-not-valid";

  const distance = calculator.calculate(str1, str2);

  // Should still return a valid distance
  assertEquals(distance >= 0 && distance <= 1, true);
});

Deno.test("StructuralDistance - one valid, one invalid", () => {
  const calculator = new StructuralDistance();

  const id1 = "req:apikey:hierarchy-9a2f4d#20251111a";
  const str2 = "not-a-valid-id";

  const distance = calculator.calculate(id1, str2);

  // Should fall back to Levenshtein, expect high distance
  assertEquals(distance > 0.5, true);
});
