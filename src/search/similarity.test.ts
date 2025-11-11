import { assertEquals } from "jsr:@std/assert";
import { searchByKeyword, searchSimilar } from "./similarity.ts";
import type { TraceabilityId } from "../core/types.ts";
import { LevenshteinDistance } from "../distance/levenshtein.ts";
import { StructuralDistance } from "../distance/structural.ts";

// テスト用のIDを作成
function createTestId(fullId: string): TraceabilityId {
  const match = fullId.match(
    /^([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)-([a-zA-Z0-9]+)#([a-zA-Z0-9]+)$/,
  );

  if (!match) {
    throw new Error(`Invalid ID format: ${fullId}`);
  }

  return {
    fullId,
    level: match[1],
    scope: match[2],
    semantic: match[3],
    hash: match[4],
    version: match[5],
    filePath: "test.md",
    lineNumber: 1,
  };
}

Deno.test("searchSimilar - basic search with Levenshtein distance", () => {
  const ids: TraceabilityId[] = [
    createTestId("req:apikey:security-4f7b2e#20251111a"),
    createTestId("req:apikey:encryption-6d3a9c#20251111a"),
    createTestId("req:apikey:deletion-4e7c2d#20251111a"),
    createTestId("req:dashboard:login-display-a1b2c3#20251111"),
  ];

  const calculator = new LevenshteinDistance();
  const result = searchSimilar("security", ids, calculator);

  assertEquals(result.query, "security");
  assertEquals(result.items.length, 4);
  assertEquals(result.distanceCalculator, "levenshtein");

  // 最も近いのは "security" を含むID
  assertEquals(result.items[0].id.fullId, "req:apikey:security-4f7b2e#20251111a");
});

Deno.test("searchSimilar - with top N limit", () => {
  const ids: TraceabilityId[] = [
    createTestId("req:apikey:security-4f7b2e#20251111a"),
    createTestId("req:apikey:encryption-6d3a9c#20251111a"),
    createTestId("req:apikey:deletion-4e7c2d#20251111a"),
    createTestId("req:dashboard:login-display-a1b2c3#20251111"),
    createTestId("req:apikey:compliance-5a8d4b#20251111a"),
  ];

  const calculator = new LevenshteinDistance();
  const result = searchSimilar("security", ids, calculator, { top: 3 });

  assertEquals(result.items.length, 3);
});

Deno.test("searchSimilar - results are sorted by distance", () => {
  const ids: TraceabilityId[] = [
    createTestId("req:apikey:encryption-6d3a9c#20251111a"),
    createTestId("req:apikey:security-4f7b2e#20251111a"),
    createTestId("req:apikey:deletion-4e7c2d#20251111a"),
  ];

  const calculator = new LevenshteinDistance();
  const result = searchSimilar("security", ids, calculator);

  // 結果が距離順（近い順）にソートされているか確認
  for (let i = 0; i < result.items.length - 1; i++) {
    assertEquals(
      result.items[i].distance <= result.items[i + 1].distance,
      true,
      `Items should be sorted by distance: ${result.items[i].distance} <= ${result.items[i + 1].distance}`,
    );
  }
});

Deno.test("searchSimilar - with structural distance", () => {
  const ids: TraceabilityId[] = [
    createTestId("req:apikey:security-4f7b2e#20251111a"),
    createTestId("req:apikey:encryption-6d3a9c#20251111a"),
    createTestId("req:dashboard:security-a1b2c3#20251111"),
  ];

  const calculator = new StructuralDistance();
  const result = searchSimilar("security", ids, calculator);

  assertEquals(result.items.length, 3);
  assertEquals(result.distanceCalculator, "structural");
});

Deno.test("searchByKeyword - exact match in semantic", () => {
  const ids: TraceabilityId[] = [
    createTestId("req:apikey:security-4f7b2e#20251111a"),
    createTestId("req:apikey:encryption-6d3a9c#20251111a"),
    createTestId("req:apikey:deletion-4e7c2d#20251111a"),
  ];

  const result = searchByKeyword("security", ids);

  assertEquals(result.length, 1);
  assertEquals(result[0].fullId, "req:apikey:security-4f7b2e#20251111a");
});

Deno.test("searchByKeyword - partial match in semantic", () => {
  const ids: TraceabilityId[] = [
    createTestId("req:apikey:security-4f7b2e#20251111a"),
    createTestId("req:apikey:encryption-6d3a9c#20251111a"),
    createTestId("req:apikey:secure-backup-7a3e9c#20251111a"),
  ];

  const result = searchByKeyword("secur", ids);

  assertEquals(result.length, 2);
});

Deno.test("searchByKeyword - match in scope", () => {
  const ids: TraceabilityId[] = [
    createTestId("req:apikey:security-4f7b2e#20251111a"),
    createTestId("req:dashboard:login-a1b2c3#20251111"),
    createTestId("req:gemini-rag:search-p1q2r3#20251111"),
  ];

  const result = searchByKeyword("apikey", ids);

  assertEquals(result.length, 1);
  assertEquals(result[0].scope, "apikey");
});

Deno.test("searchByKeyword - case insensitive", () => {
  const ids: TraceabilityId[] = [
    createTestId("req:apikey:Security-4f7b2e#20251111a"),
    createTestId("req:apikey:ENCRYPTION-6d3a9c#20251111a"),
  ];

  const result = searchByKeyword("security", ids);

  assertEquals(result.length, 1);
  assertEquals(result[0].semantic, "Security");
});

Deno.test("searchByKeyword - no matches", () => {
  const ids: TraceabilityId[] = [
    createTestId("req:apikey:security-4f7b2e#20251111a"),
    createTestId("req:apikey:encryption-6d3a9c#20251111a"),
  ];

  const result = searchByKeyword("nonexistent", ids);

  assertEquals(result.length, 0);
});
