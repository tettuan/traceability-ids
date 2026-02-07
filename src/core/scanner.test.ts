import { assertEquals, assertRejects } from "jsr:@std/assert@^1.0.0";
import { scanFiles } from "./scanner.ts";

Deno.test("scanFiles - finds markdown files in data directory", async () => {
  const files = await scanFiles("./data");
  assertEquals(files.length > 0, true);
  for (const file of files) {
    assertEquals(file.endsWith(".md"), true);
  }
});

Deno.test("scanFiles - returns empty for directory without md files", async () => {
  // src/cli has only .ts files
  const files = await scanFiles("./src/cli");
  assertEquals(files.length, 0);
});

Deno.test("scanFiles - throws on non-existent directory", async () => {
  await assertRejects(
    () => scanFiles("./non-existent-dir-xyz"),
    Error,
    "Failed to scan directory",
  );
});

Deno.test("scanFiles - recursive scan includes subdirectories", async () => {
  const files = await scanFiles("./data");
  // data/ has subdirectories; should find files in them
  const hasSubdir = files.some((f) => f.includes("/"));
  assertEquals(hasSubdir, true);
});
