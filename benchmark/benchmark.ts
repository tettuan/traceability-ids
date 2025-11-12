/**
 * Performance benchmark tool
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-env benchmark/benchmark.ts <input-dir>
 */

import { scanFiles } from "../src/core/scanner.ts";
import { deduplicateIds, extractIds } from "../src/core/extractor.ts";
import { createDistanceMatrix } from "../src/distance/calculator.ts";
import { StructuralDistance } from "../src/distance/structural.ts";
import { CosineDistance } from "../src/distance/cosine.ts";
import { HierarchicalClustering } from "../src/clustering/hierarchical.ts";

interface BenchmarkResult {
  name: string;
  timeMs: number;
  details?: Record<string, unknown>;
}

function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

async function benchmark(
  name: string,
  fn: () => Promise<unknown>,
): Promise<BenchmarkResult> {
  // Warm up
  await fn();

  // Measure
  const start = performance.now();
  await fn();
  const end = performance.now();

  return {
    name,
    timeMs: end - start,
  };
}

async function main() {
  const inputDir = Deno.args[0];
  if (!inputDir) {
    console.error("Usage: deno run benchmark.ts <input-dir>");
    Deno.exit(1);
  }

  console.log("=".repeat(60));
  console.log("Performance Benchmark");
  console.log("=".repeat(60));
  console.log(`Input directory: ${inputDir}`);
  console.log();

  const results: BenchmarkResult[] = [];

  // 1. File scanning
  console.log("1. File Scanning...");
  let files: string[] = [];
  const scanResult = await benchmark("File scan", async () => {
    files = await scanFiles(inputDir);
  });
  scanResult.details = { files: files.length };
  results.push(scanResult);
  console.log(`   ✓ ${files.length} files in ${formatTime(scanResult.timeMs)}`);
  console.log();

  // 2. ID extraction
  console.log("2. ID Extraction...");
  let allIds: Awaited<ReturnType<typeof extractIds>> = [];
  const extractResult = await benchmark("ID extraction", async () => {
    allIds = await extractIds(files);
  });
  extractResult.details = { ids: allIds.length };
  results.push(extractResult);
  console.log(
    `   ✓ ${allIds.length} IDs in ${formatTime(extractResult.timeMs)}`,
  );
  console.log(
    `   → ${(allIds.length / (extractResult.timeMs / 1000)).toFixed(0)} IDs/sec`,
  );
  console.log();

  // 3. Deduplication
  console.log("3. Deduplication...");
  let uniqueIds: Awaited<ReturnType<typeof deduplicateIds>> = [];
  const dedupResult = await benchmark("Deduplication", async () => {
    uniqueIds = deduplicateIds(allIds);
  });
  dedupResult.details = {
    unique: uniqueIds.length,
    duplicates: allIds.length - uniqueIds.length,
  };
  results.push(dedupResult);
  console.log(
    `   ✓ ${uniqueIds.length} unique IDs in ${formatTime(dedupResult.timeMs)}`,
  );
  console.log(`   → ${allIds.length - uniqueIds.length} duplicates removed`);
  console.log();

  // 4. Distance matrix calculation (Structural)
  console.log("4. Distance Matrix (Structural Distance)...");
  const structuralCalc = new StructuralDistance();
  let structuralMatrix: number[][] = [];
  const matrixResult = await benchmark(
    "Distance matrix (structural)",
    async () => {
      structuralMatrix = createDistanceMatrix(
        uniqueIds.map((id) => id.fullId),
        structuralCalc,
      );
    },
  );
  const calculations = uniqueIds.length * (uniqueIds.length - 1) / 2;
  matrixResult.details = {
    size: `${structuralMatrix.length}x${structuralMatrix.length}`,
    calculations,
  };
  results.push(matrixResult);
  console.log(
    `   ✓ ${structuralMatrix.length}x${structuralMatrix.length} matrix in ${
      formatTime(matrixResult.timeMs)
    }`,
  );
  console.log(
    `   → ${calculations} calculations, ${
      (calculations / (matrixResult.timeMs / 1000)).toFixed(0)
    } calc/sec`,
  );
  console.log();

  // 5. Distance matrix calculation (Cosine)
  console.log("5. Distance Matrix (Cosine Distance)...");
  const cosineCalc = new CosineDistance();
  let cosineMatrix: number[][] = [];
  const cosineMatrixResult = await benchmark(
    "Distance matrix (cosine)",
    async () => {
      cosineMatrix = createDistanceMatrix(
        uniqueIds.map((id) => id.fullId),
        cosineCalc,
      );
    },
  );
  cosineMatrixResult.details = {
    size: `${cosineMatrix.length}x${cosineMatrix.length}`,
    calculations,
  };
  results.push(cosineMatrixResult);
  console.log(
    `   ✓ ${cosineMatrix.length}x${cosineMatrix.length} matrix in ${
      formatTime(cosineMatrixResult.timeMs)
    }`,
  );
  console.log(
    `   → ${calculations} calculations, ${
      (calculations / (cosineMatrixResult.timeMs / 1000)).toFixed(0)
    } calc/sec`,
  );
  console.log();

  // 6. Clustering
  console.log("6. Hierarchical Clustering...");
  const clustering = new HierarchicalClustering(0.3);
  let clusters: Awaited<ReturnType<typeof clustering.cluster>> = [];
  const clusterResult = await benchmark("Clustering", async () => {
    clusters = clustering.cluster(uniqueIds, structuralMatrix);
  });
  clusterResult.details = { clusters: clusters.length };
  results.push(clusterResult);
  console.log(
    `   ✓ ${clusters.length} clusters in ${formatTime(clusterResult.timeMs)}`,
  );
  console.log();

  // Summary
  console.log("=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));

  const totalTime = results.reduce((sum, r) => sum + r.timeMs, 0);
  console.log(`Total time: ${formatTime(totalTime)}`);
  console.log();

  console.log("Breakdown:");
  results.forEach((result) => {
    const percentage = ((result.timeMs / totalTime) * 100).toFixed(1);
    console.log(
      `  ${result.name.padEnd(30)} ${formatTime(result.timeMs).padStart(10)} (${
        percentage.padStart(5)
      }%)`,
    );
  });
  console.log();

  // Bottleneck analysis
  const slowest = results.reduce((prev, curr) =>
    curr.timeMs > prev.timeMs ? curr : prev
  );
  console.log("🐌 Bottleneck:");
  console.log(
    `  ${slowest.name} (${((slowest.timeMs / totalTime) * 100).toFixed(1)}% of total time)`,
  );
  console.log();

  // Memory usage
  const memUsage = Deno.memoryUsage();
  console.log("💾 Memory Usage:");
  console.log(`  RSS: ${formatBytes(memUsage.rss)}`);
  console.log(`  Heap Total: ${formatBytes(memUsage.heapTotal)}`);
  console.log(`  Heap Used: ${formatBytes(memUsage.heapUsed)}`);
  console.log(`  External: ${formatBytes(memUsage.external)}`);
  console.log();

  // Recommendations
  console.log("💡 Optimization Recommendations:");
  if (extractResult.timeMs > totalTime * 0.3) {
    console.log("  • ID extraction is slow - consider parallelization");
  }
  if (matrixResult.timeMs > totalTime * 0.4) {
    console.log("  • Distance matrix calculation is slow - consider:");
    console.log("    - Caching/memoization");
    console.log("    - Algorithm optimization");
    console.log("    - Using ripgrep for ID extraction");
  }
  if (uniqueIds.length > 1000) {
    console.log(
      "  • Large number of IDs - consider pre-indexing for repeated searches",
    );
  }
  console.log();

  // Export results as JSON
  const reportPath = "./benchmark/results.json";
  await Deno.writeTextFile(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        inputDir,
        summary: {
          files: files.length,
          totalIds: allIds.length,
          uniqueIds: uniqueIds.length,
          clusters: clusters.length,
          totalTimeMs: totalTime,
        },
        results,
        memory: memUsage,
      },
      null,
      2,
    ),
  );
  console.log(`📊 Results exported to: ${reportPath}`);
}

if (import.meta.main) {
  await main();
}
