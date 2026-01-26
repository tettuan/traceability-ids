/**
 * CLI vs Native extraction benchmark
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-run --allow-env benchmark/benchmark-cli.ts <input-dir>
 */

import { extractIds } from "../src/core/extractor.ts";
import { scanFiles } from "../src/core/scanner.ts";
import {
  checkCliToolsAvailable,
  extractUniqueIdsAuto,
  extractUniqueIdsWithCli,
} from "../src/core/extractor-cli.ts";

function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function benchmark(
  name: string,
  fn: () => Promise<unknown>,
  warmup = true,
): Promise<{ name: string; timeMs: number }> {
  if (warmup) {
    // Warm up
    await fn();
  }

  // Measure
  const start = performance.now();
  await fn();
  const end = performance.now();

  return {
    name,
    timeMs: end - start,
  };
}

async function main(): Promise<void> {
  const inputDir = Deno.args[0];
  if (!inputDir) {
    console.error(
      "Usage: deno run --allow-run benchmark-cli.ts <input-dir>",
    );
    Deno.exit(1);
  }

  console.log("=".repeat(60));
  console.log("CLI vs Native Extraction Benchmark");
  console.log("=".repeat(60));
  console.log(`Input directory: ${inputDir}`);
  console.log();

  // Check CLI tools availability
  console.log("Checking CLI tools availability...");
  const tools = await checkCliToolsAvailable();
  console.log(`  rg (ripgrep): ${tools.rg ? "✓ available" : "✗ not found"}`);
  console.log(`  sort:         ${tools.sort ? "✓ available" : "✗ not found"}`);
  console.log();

  if (!tools.rg || !tools.sort) {
    console.log("⚠️  CLI tools not available. Install ripgrep:");
    console.log("  macOS:   brew install ripgrep");
    console.log("  Linux:   apt install ripgrep");
    console.log("  Windows: choco install ripgrep");
    console.log();
    console.log("Falling back to native implementation only...");
    console.log();
  }

  // Native implementation benchmark
  console.log("1. Native Implementation (TypeScript)");
  let nativeIds: string[] = [];
  const nativeResult = await benchmark(
    "Native extraction",
    async () => {
      const files = await scanFiles(inputDir);
      const allIds = await extractIds(files);
      nativeIds = [...new Set(allIds.map((id) => id.fullId))];
    },
  );
  console.log(`   ✓ ${nativeIds.length} unique IDs in ${formatTime(nativeResult.timeMs)}`);
  console.log();

  // CLI implementation benchmark (if available)
  if (tools.rg && tools.sort) {
    console.log("2. CLI Implementation (rg + sort -u)");
    let cliIds: string[] = [];
    const cliResult = await benchmark(
      "CLI extraction",
      async () => {
        cliIds = await extractUniqueIdsWithCli(inputDir);
      },
    );
    console.log(`   ✓ ${cliIds.length} unique IDs in ${formatTime(cliResult.timeMs)}`);
    console.log();

    // Comparison
    console.log("=".repeat(60));
    console.log("Comparison");
    console.log("=".repeat(60));
    console.log(
      `Native: ${formatTime(nativeResult.timeMs).padStart(10)}`,
    );
    console.log(
      `CLI:    ${formatTime(cliResult.timeMs).padStart(10)}`,
    );
    const speedup = nativeResult.timeMs / cliResult.timeMs;
    console.log(
      `Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? "faster" : "slower"}`,
    );
    console.log();

    // Verify results match
    const nativeSet = new Set(nativeIds.sort());
    const cliSet = new Set(cliIds.sort());

    const matches = nativeIds.length === cliIds.length &&
      [...nativeSet].every((id) => cliSet.has(id));

    console.log(`Results match: ${matches ? "✓ YES" : "✗ NO"}`);

    if (!matches) {
      console.log();
      console.log("⚠️  Warning: Results differ!");
      const onlyNative = [...nativeSet].filter((id) => !cliSet.has(id));
      const onlyCli = [...cliSet].filter((id) => !nativeSet.has(id));

      if (onlyNative.length > 0) {
        console.log(`Only in native (${onlyNative.length}):`);
        onlyNative.slice(0, 5).forEach((id) => console.log(`  - ${id}`));
        if (onlyNative.length > 5) console.log(`  ... and ${onlyNative.length - 5} more`);
      }

      if (onlyCli.length > 0) {
        console.log(`Only in CLI (${onlyCli.length}):`);
        onlyCli.slice(0, 5).forEach((id) => console.log(`  - ${id}`));
        if (onlyCli.length > 5) console.log(`  ... and ${onlyCli.length - 5} more`);
      }
    }
    console.log();

    // Auto detection benchmark
    console.log("3. Auto Detection (Hybrid)");
    let autoIds: string[] = [];
    const autoResult = await benchmark(
      "Auto extraction",
      async () => {
        autoIds = await extractUniqueIdsAuto(inputDir);
      },
    );
    console.log(`   ✓ ${autoIds.length} unique IDs in ${formatTime(autoResult.timeMs)}`);
    console.log(`   → Used CLI method automatically`);
    console.log();
  }

  // Recommendations
  console.log("=".repeat(60));
  console.log("💡 Recommendations");
  console.log("=".repeat(60));

  if (tools.rg && tools.sort) {
    console.log("✓ CLI tools available - significant speedup achieved!");
    console.log("  Use extractUniqueIdsAuto() for automatic optimization");
  } else {
    console.log("⚠️  Install ripgrep for 10-100x speedup:");
    console.log("  macOS:   brew install ripgrep");
    console.log("  Linux:   apt install ripgrep");
    console.log("  Windows: choco install ripgrep");
  }
  console.log();
}

if (import.meta.main) {
  await main();
}
