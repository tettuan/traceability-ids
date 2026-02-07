import { extractIds } from "../core/extractor.ts";
import { scanFiles } from "../core/scanner.ts";
import { createDistanceMatrix } from "../distance/calculator.ts";
import { type ClusteringOptions, createClusteringAlgorithm } from "../cli/clustering-factory.ts";
import { createDistanceCalculator } from "../cli/distance-factory.ts";
import { formatResult } from "../formatter/formatter.ts";
import type { ClusteringResult } from "../core/types.ts";

export interface ClusterModeOptions {
  inputDir: string;
  outputFile?: string;
  algorithm: string;
  distance: string;
  format: "json" | "markdown" | "csv" | "simple" | "simple-clustered";
  clusteringOptions: ClusteringOptions;
}

/**
 * クラスタリングモードを実行
 */
export async function runClusterMode(
  options: ClusterModeOptions,
): Promise<void> {
  // Progress logs go to STDERR
  console.error(`Distance calculator: ${options.distance}`);
  const calculator = createDistanceCalculator(options.distance);

  console.error(`Clustering algorithm: ${options.algorithm}`);
  const algorithm = createClusteringAlgorithm(
    options.algorithm,
    options.clusteringOptions,
  );

  // 1. ファイルをスキャン
  console.error(`Scanning files in: ${options.inputDir}`);
  const files = await scanFiles(options.inputDir);
  console.error(`Found ${files.length} markdown files`);

  if (files.length === 0) {
    console.error("No markdown files found");
    return;
  }

  // 2. IDを抽出
  console.error("Extracting traceability IDs...");
  const ids = await extractIds(files);
  console.error(`Extracted ${ids.length} IDs`);

  if (ids.length === 0) {
    console.error("No traceability IDs found");
    return;
  }

  // 3. 距離行列を作成
  console.error(`Calculating distance matrix using: ${calculator.name}`);
  const matrix = createDistanceMatrix(
    ids.map((id) => id.fullId),
    calculator,
  );

  // 4. クラスタリング実行
  console.error(`Clustering using: ${algorithm.name}`);
  const clusters = algorithm.cluster(ids, matrix);
  console.error(`Created ${clusters.length} clusters`);

  // 結果を構造化
  const result: ClusteringResult = {
    clusters,
    algorithm: algorithm.name,
    distanceCalculator: calculator.name,
  };

  // 5. 結果を出力
  const content = formatResult(result, options.format);

  if (options.outputFile) {
    console.error(`Writing results to: ${options.outputFile}`);
    await Deno.writeTextFile(options.outputFile, content);
    console.error("Done!");
  } else {
    // Output to STDOUT
    console.log(content);
  }
}
