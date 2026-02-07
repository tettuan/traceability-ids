import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { extractContext } from "./context.ts";
import type { TraceabilityId } from "../core/types.ts";

// Create a temp file for testing
async function withTempFile(
  content: string,
  fn: (path: string) => Promise<void>,
): Promise<void> {
  const tmpDir = await Deno.makeTempDir();
  const tmpFile = `${tmpDir}/test.md`;
  await Deno.writeTextFile(tmpFile, content);
  try {
    await fn(tmpFile);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
}

function makeId(fullId: string, filePath: string, lineNumber: number): TraceabilityId {
  return {
    fullId,
    level: "req",
    scope: "test",
    semantic: "item",
    hash: "abc",
    version: "v1",
    filePath,
    lineNumber,
  };
}

Deno.test("extractContext - finds matching ID", async () => {
  const content = "line1\nline2\nreq:test:item-abc#v1\nline4\nline5";
  await withTempFile(content, async (path) => {
    const ids = [makeId("req:test:item-abc#v1", path, 3)];
    const result = await extractContext(
      { ids: ["req:test:item-abc#v1"], before: 2, after: 2 },
      ids,
    );
    assertEquals(result.contexts.length, 1);
    assertEquals(result.notFound.length, 0);
    assertEquals(result.contexts[0].id, "req:test:item-abc#v1");
    assertEquals(result.contexts[0].locations.length, 1);
    assertEquals(result.contexts[0].locations[0].lineNumber, 3);
  });
});

Deno.test("extractContext - reports not found IDs", async () => {
  const content = "line1\nline2";
  await withTempFile(content, async (path) => {
    const ids = [makeId("req:test:item-abc#v1", path, 1)];
    const result = await extractContext(
      { ids: ["req:other:missing-xyz#v1"], before: 1, after: 1 },
      ids,
    );
    assertEquals(result.contexts.length, 0);
    assertEquals(result.notFound.length, 1);
    assertEquals(result.notFound[0], "req:other:missing-xyz#v1");
  });
});

Deno.test("extractContext - extracts before and after lines", async () => {
  const lines = Array.from({ length: 10 }, (_, i) => `line${i + 1}`);
  const content = lines.join("\n");
  await withTempFile(content, async (path) => {
    const ids = [makeId("req:test:item-abc#v1", path, 5)];
    const result = await extractContext(
      { ids: ["req:test:item-abc#v1"], before: 2, after: 3 },
      ids,
    );
    const loc = result.contexts[0].locations[0];
    assertEquals(loc.beforeLines.length, 2);
    assertEquals(loc.afterLines.length, 3);
    assertEquals(loc.beforeLines[0].lineNumber, 3);
    assertEquals(loc.afterLines[0].lineNumber, 6);
  });
});

Deno.test("extractContext - clamps before/after to file boundaries", async () => {
  const content = "line1\ntarget\nline3";
  await withTempFile(content, async (path) => {
    const ids = [makeId("req:test:item-abc#v1", path, 2)];
    const result = await extractContext(
      { ids: ["req:test:item-abc#v1"], before: 10, after: 10 },
      ids,
    );
    const loc = result.contexts[0].locations[0];
    // Only 1 line before, 1 line after available
    assertEquals(loc.beforeLines.length, 1);
    assertEquals(loc.afterLines.length, 1);
  });
});

Deno.test("extractContext - handles multiple locations for same ID", async () => {
  const content = "first\nreq:test:item-abc#v1\nmiddle\nreq:test:item-abc#v1\nlast";
  await withTempFile(content, async (path) => {
    const ids = [
      makeId("req:test:item-abc#v1", path, 2),
      makeId("req:test:item-abc#v1", path, 4),
    ];
    const result = await extractContext(
      { ids: ["req:test:item-abc#v1"], before: 1, after: 1 },
      ids,
    );
    assertEquals(result.contexts.length, 1);
    assertEquals(result.contexts[0].locations.length, 2);
  });
});

Deno.test("extractContext - empty ids request", async () => {
  const result = await extractContext(
    { ids: [], before: 1, after: 1 },
    [],
  );
  assertEquals(result.contexts.length, 0);
  assertEquals(result.notFound.length, 0);
});
