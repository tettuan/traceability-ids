import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { TraceabilityError } from "./errors.ts";
import { parseExtensions, scanFiles } from "./scanner.ts";

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
    TraceabilityError,
    "Path not found",
  );
});

Deno.test("scanFiles - recursive scan includes subdirectories", async () => {
  const files = await scanFiles("./data");
  // data/ has subdirectories; should find files in them
  const hasSubdir = files.some((f) => f.includes("/"));
  assertEquals(hasSubdir, true);
});

async function withTempTree(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir();
  await Deno.mkdir(`${dir}/docs`);
  await Deno.mkdir(`${dir}/src`);
  await Deno.writeTextFile(`${dir}/docs/a.md`, "");
  await Deno.writeTextFile(`${dir}/src/b.rs`, "");
  await Deno.writeTextFile(`${dir}/src/c.ts`, "");
  await Deno.writeTextFile(`${dir}/src/d.json`, "");
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

function names(files: string[]): string[] {
  return files.map((f) => f.substring(f.lastIndexOf("/") + 1)).sort();
}

Deno.test("scanFiles - scans only given extensions", async () => {
  await withTempTree(async (dir) => {
    assertEquals(names(await scanFiles(dir)), ["a.md"]);
    assertEquals(names(await scanFiles(dir, ["md", ".rs", "ts"])), ["a.md", "b.rs", "c.ts"]);
  });
});

Deno.test("scanFiles - accepts multiple paths and explicit files without duplicates", async () => {
  await withTempTree(async (dir) => {
    const files = await scanFiles(
      [`${dir}/docs`, `${dir}/src/d.json`, `${dir}/docs/a.md`],
      ["md"],
    );
    assertEquals(names(files), ["a.md", "d.json"]);
  });
});

Deno.test("scanFiles - names the missing path among several", async () => {
  await withTempTree(async (dir) => {
    await assertRejects(
      () => scanFiles([`${dir}/docs`, `${dir}/publish`]),
      Error,
      `${dir}/publish`,
    );
  });
});

Deno.test("parseExtensions - parses comma-separated list", () => {
  assertEquals(parseExtensions(undefined), ["md"]);
  assertEquals(parseExtensions("md,rs, .ts,,md"), ["md", "rs", "ts"]);
  assertThrows(() => parseExtensions(" , "), Error, "Invalid --ext");
});
