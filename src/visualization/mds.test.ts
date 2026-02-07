import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { classicalMDS } from "./mds.ts";

Deno.test("classicalMDS - empty input", () => {
  const result = classicalMDS([], 3);
  assertEquals(result.coordinates.length, 0);
  assertEquals(result.eigenvalues.length, 0);
});

Deno.test("classicalMDS - single item", () => {
  const result = classicalMDS([[0]], 3);
  assertEquals(result.coordinates.length, 1);
  assertEquals(result.coordinates[0].length, 3);
  assertEquals(result.coordinates[0], [0, 0, 0]);
});

Deno.test("classicalMDS - two items produces separated points", () => {
  const matrix = [
    [0, 1],
    [1, 0],
  ];
  const result = classicalMDS(matrix, 2);
  assertEquals(result.coordinates.length, 2);
  // The two points should be separated (non-zero distance)
  const dx = result.coordinates[0][0] - result.coordinates[1][0];
  const dy = result.coordinates[0][1] - result.coordinates[1][1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  assertEquals(dist > 0, true);
});

Deno.test("classicalMDS - three equidistant items all separated", () => {
  const d = 1.0;
  const matrix = [
    [0, d, d],
    [d, 0, d],
    [d, d, 0],
  ];
  const result = classicalMDS(matrix, 2);
  assertEquals(result.coordinates.length, 3);
  // All pairwise distances should be positive (not collapsed to same point)
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const dx = result.coordinates[i][0] - result.coordinates[j][0];
      const dy = result.coordinates[i][1] - result.coordinates[j][1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      assertEquals(dist > 0.01, true);
    }
  }
});

Deno.test("classicalMDS - dimensions clamped to n", () => {
  const matrix = [
    [0, 0.5],
    [0.5, 0],
  ];
  const result = classicalMDS(matrix, 5);
  // With 2 items, effective dimensions is min(5, 2) = 2, but coordinates still have 5 dims
  assertEquals(result.coordinates[0].length, 5);
});

Deno.test("classicalMDS - eigenvalues descending", () => {
  const matrix = [
    [0, 0.1, 0.9],
    [0.1, 0, 0.8],
    [0.9, 0.8, 0],
  ];
  const result = classicalMDS(matrix, 3);
  for (let i = 0; i < result.eigenvalues.length - 1; i++) {
    assertEquals(result.eigenvalues[i] >= result.eigenvalues[i + 1], true);
  }
});

Deno.test("classicalMDS - preserves relative distances", () => {
  // Item 0 and 1 are close; item 2 is far
  const matrix = [
    [0, 0.1, 0.9],
    [0.1, 0, 0.85],
    [0.9, 0.85, 0],
  ];
  const result = classicalMDS(matrix, 3);

  const dist01 = Math.sqrt(
    result.coordinates[0].reduce(
      (s, v, d) => s + (v - result.coordinates[1][d]) ** 2,
      0,
    ),
  );
  const dist02 = Math.sqrt(
    result.coordinates[0].reduce(
      (s, v, d) => s + (v - result.coordinates[2][d]) ** 2,
      0,
    ),
  );

  // dist(0,1) should be much less than dist(0,2)
  assertEquals(dist01 < dist02, true);
});
