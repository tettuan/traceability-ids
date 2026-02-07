import { assertEquals } from "jsr:@std/assert";
import { deduplicateIds, extractIdsFromFile } from "./extractor.ts";
import type { TraceabilityId } from "./types.ts";

Deno.test("extractIdsFromFile - valid ID extraction", async () => {
  // Create a temporary test file
  const testFile = await Deno.makeTempFile({ suffix: ".md" });

  try {
    const content = `# Test Document

This is a test file with traceability IDs.

ID: req:apikey:hierarchy-9a2f4d#20251111a

Another ID: req:dashboard:login-display-a1b2c3#20251111

End of file.
`;

    await Deno.writeTextFile(testFile, content);

    const ids = await extractIdsFromFile(testFile);

    assertEquals(ids.length, 2);

    // First ID
    assertEquals(ids[0].fullId, "req:apikey:hierarchy-9a2f4d#20251111a");
    assertEquals(ids[0].level, "req");
    assertEquals(ids[0].scope, "apikey");
    assertEquals(ids[0].semantic, "hierarchy");
    assertEquals(ids[0].hash, "9a2f4d");
    assertEquals(ids[0].version, "20251111a");
    assertEquals(ids[0].filePath, testFile);
    assertEquals(ids[0].lineNumber, 5);

    // Second ID
    assertEquals(ids[1].fullId, "req:dashboard:login-display-a1b2c3#20251111");
    assertEquals(ids[1].level, "req");
    assertEquals(ids[1].scope, "dashboard");
    assertEquals(ids[1].semantic, "login-display");
    assertEquals(ids[1].hash, "a1b2c3");
    assertEquals(ids[1].version, "20251111");
    assertEquals(ids[1].lineNumber, 7);
  } finally {
    await Deno.remove(testFile);
  }
});

Deno.test("extractIdsFromFile - multiple IDs on same line", async () => {
  const testFile = await Deno.makeTempFile({ suffix: ".md" });

  try {
    const content = "Multiple IDs: req:test:id1-abc123#v1 and req:test:id2-xyz789#v2\n";

    await Deno.writeTextFile(testFile, content);

    const ids = await extractIdsFromFile(testFile);

    assertEquals(ids.length, 2);
    assertEquals(ids[0].fullId, "req:test:id1-abc123#v1");
    assertEquals(ids[1].fullId, "req:test:id2-xyz789#v2");
    assertEquals(ids[0].lineNumber, 1);
    assertEquals(ids[1].lineNumber, 1);
  } finally {
    await Deno.remove(testFile);
  }
});

Deno.test("extractIdsFromFile - no IDs in file", async () => {
  const testFile = await Deno.makeTempFile({ suffix: ".md" });

  try {
    const content = `# Test Document

This file has no traceability IDs.
Just regular text.
`;

    await Deno.writeTextFile(testFile, content);

    const ids = await extractIdsFromFile(testFile);

    assertEquals(ids.length, 0);
  } finally {
    await Deno.remove(testFile);
  }
});

Deno.test("extractIdsFromFile - IDs with various formats", async () => {
  const testFile = await Deno.makeTempFile({ suffix: ".md" });

  try {
    const content = `# Test Various Formats

req:scope1:semantic1-hash1#v1
design:scope-name:semantic-name-abc123#version1
REQ:SCOPE:SEMANTIC-HASH#VERSION
req:a:b-c#d
req:test_scope:test_semantic-test123#20250101a
`;

    await Deno.writeTextFile(testFile, content);

    const ids = await extractIdsFromFile(testFile);

    assertEquals(ids.length, 5);

    // Check various formats are captured
    assertEquals(ids[0].fullId, "req:scope1:semantic1-hash1#v1");
    assertEquals(
      ids[1].fullId,
      "design:scope-name:semantic-name-abc123#version1",
    );
    assertEquals(ids[2].fullId, "REQ:SCOPE:SEMANTIC-HASH#VERSION");
    assertEquals(ids[3].fullId, "req:a:b-c#d");
    assertEquals(
      ids[4].fullId,
      "req:test_scope:test_semantic-test123#20250101a",
    );
  } finally {
    await Deno.remove(testFile);
  }
});

Deno.test("extractIdsFromFile - IDs in markdown code blocks", async () => {
  const testFile = await Deno.makeTempFile({ suffix: ".md" });

  try {
    const content = `# Test Code Blocks

\`\`\`
req:test:in-code-block-abc123#v1
\`\`\`

Regular text: req:test:regular-text-xyz789#v1

Inline code: \`req:test:inline-code-def456#v1\`
`;

    await Deno.writeTextFile(testFile, content);

    const ids = await extractIdsFromFile(testFile);

    // Should extract from all locations (code blocks, regular text, inline code)
    assertEquals(ids.length, 3);
  } finally {
    await Deno.remove(testFile);
  }
});

Deno.test("extractIdsFromFile - empty file", async () => {
  const testFile = await Deno.makeTempFile({ suffix: ".md" });

  try {
    await Deno.writeTextFile(testFile, "");

    const ids = await extractIdsFromFile(testFile);

    assertEquals(ids.length, 0);
  } finally {
    await Deno.remove(testFile);
  }
});

Deno.test("extractIdsFromFile - duplicate IDs", async () => {
  const testFile = await Deno.makeTempFile({ suffix: ".md" });

  try {
    const content = `# Test Duplicates

req:test:duplicate-abc123#v1

Same ID again: req:test:duplicate-abc123#v1
`;

    await Deno.writeTextFile(testFile, content);

    const ids = await extractIdsFromFile(testFile);

    // Should extract both occurrences
    assertEquals(ids.length, 2);
    assertEquals(ids[0].fullId, "req:test:duplicate-abc123#v1");
    assertEquals(ids[1].fullId, "req:test:duplicate-abc123#v1");
    assertEquals(ids[0].lineNumber, 3);
    assertEquals(ids[1].lineNumber, 5);
  } finally {
    await Deno.remove(testFile);
  }
});

Deno.test("deduplicateIds - removes duplicate IDs", () => {
  const ids: TraceabilityId[] = [
    {
      fullId: "req:test:id1-abc123#v1",
      level: "req",
      scope: "test",
      semantic: "id1",
      hash: "abc123",
      version: "v1",
      filePath: "file1.md",
      lineNumber: 1,
    },
    {
      fullId: "req:test:id1-abc123#v1",
      level: "req",
      scope: "test",
      semantic: "id1",
      hash: "abc123",
      version: "v1",
      filePath: "file2.md",
      lineNumber: 5,
    },
    {
      fullId: "req:test:id2-xyz789#v1",
      level: "req",
      scope: "test",
      semantic: "id2",
      hash: "xyz789",
      version: "v1",
      filePath: "file1.md",
      lineNumber: 10,
    },
    {
      fullId: "req:test:id1-abc123#v1",
      level: "req",
      scope: "test",
      semantic: "id1",
      hash: "abc123",
      version: "v1",
      filePath: "file3.md",
      lineNumber: 20,
    },
  ];

  const deduplicated = deduplicateIds(ids);

  // Should keep only 2 unique IDs
  assertEquals(deduplicated.length, 2);
  assertEquals(deduplicated[0].fullId, "req:test:id1-abc123#v1");
  assertEquals(deduplicated[1].fullId, "req:test:id2-xyz789#v1");

  // Should keep the first occurrence of each
  assertEquals(deduplicated[0].filePath, "file1.md");
  assertEquals(deduplicated[0].lineNumber, 1);
});

Deno.test("deduplicateIds - empty input", () => {
  const ids: TraceabilityId[] = [];
  const deduplicated = deduplicateIds(ids);
  assertEquals(deduplicated.length, 0);
});

Deno.test("deduplicateIds - no duplicates", () => {
  const ids: TraceabilityId[] = [
    {
      fullId: "req:test:id1-abc123#v1",
      level: "req",
      scope: "test",
      semantic: "id1",
      hash: "abc123",
      version: "v1",
      filePath: "file1.md",
      lineNumber: 1,
    },
    {
      fullId: "req:test:id2-xyz789#v1",
      level: "req",
      scope: "test",
      semantic: "id2",
      hash: "xyz789",
      version: "v1",
      filePath: "file2.md",
      lineNumber: 5,
    },
  ];

  const deduplicated = deduplicateIds(ids);

  // Should return all IDs unchanged
  assertEquals(deduplicated.length, 2);
  assertEquals(deduplicated[0].fullId, "req:test:id1-abc123#v1");
  assertEquals(deduplicated[1].fullId, "req:test:id2-xyz789#v1");
});
