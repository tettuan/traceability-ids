import { extractIds } from "../core/extractor.ts";
import { scanFiles } from "../core/scanner.ts";
import { createDistanceMatrix } from "../distance/calculator.ts";
import {
  createClusteringAlgorithm,
  type ClusteringOptions,
} from "../cli/clustering-factory.ts";
import { createDistanceCalculator } from "../cli/distance-factory.ts";
import { formatResult } from "../formatter/formatter.ts";
import type { ClusteringResult } from "../core/types.ts";

export interface ClusterModeOptions {
  inputDir: string;
  outputFile: string;
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
  // 距離計算器を選択
  console.log(`Distance calculator: ${options.distance}`);
  const calculator = createDistanceCalculator(options.distance);

  // クラスタリングアルゴリズムを選択
  console.log(`Clustering algorithm: ${options.algorithm}`);
  const algorithm = createClusteringAlgorithm(
    options.algorithm,
    options.clusteringOptions,
  );

  // 1. ファイルをスキャン
  console.log(`Scanning files in: ${options.inputDir}`);
  const files = await scanFiles(options.inputDir);
  console.log(`Found ${files.length} markdown files`);

  if (files.length === 0) {
    console.warn("No markdown files found");
    return;
  }

  // 2. IDを抽出
  console.log("Extracting traceability IDs...");
  const ids = await extractIds(files);
  console.log(`Extracted ${ids.length} IDs`);

  if (ids.length === 0) {
    console.warn("No traceability IDs found");
    return;
  }

  // 3. 距離行列を作成
  console.log(`Calculating distance matrix using: ${calculator.name}`);
  const matrix = createDistanceMatrix(
    ids.map((id) => id.fullId),
    calculator,
  );

  // 4. クラスタリング実行
  console.log(`Clustering using: ${algorithm.name}`);
  const clusters = algorithm.cluster(ids, matrix);
  console.log(`Created ${clusters.length} clusters`);

  // 結果を構造化
  const result: ClusteringResult = {
    clusters,
    algorithm: algorithm.name,
    distanceCalculator: calculator.name,
  };

  // 5. 結果を出力
  console.log(`Writing results to: ${options.outputFile}`);
  const content = formatResult(result, options.format);
  await Deno.writeTextFile(options.outputFile, content);

  console.log("Done!");
}
