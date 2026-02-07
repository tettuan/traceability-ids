import { deduplicateIds, extractIds } from "../core/extractor.ts";
import { scanFiles } from "../core/scanner.ts";
import { createDistanceMatrix } from "../distance/calculator.ts";
import { type ClusteringOptions, createClusteringAlgorithm } from "../cli/clustering-factory.ts";
import { createDistanceCalculator } from "../cli/distance-factory.ts";
import { buildGraphData } from "../visualization/graph_data.ts";
import { generateHTML } from "../visualization/html_template.ts";
import { classicalMDS } from "../visualization/mds.ts";

export interface GraphModeOptions {
  inputDir: string;
  outputFile: string;
  distance: string;
  algorithm: string;
  clusteringOptions: ClusteringOptions;
  edgeThreshold: number;
  colorBy: "cluster" | "scope" | "level";
  layout: "force" | "mds";
}

/**
 * グラフ可視化モードを実行
 */
export async function runGraphMode(options: GraphModeOptions): Promise<void> {
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

  // 2. IDを抽出・重複排除
  console.error("Extracting traceability IDs...");
  const rawIds = await extractIds(files);
  const ids = deduplicateIds(rawIds);
  console.error(`Extracted ${rawIds.length} IDs, deduplicated to ${ids.length}`);

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

  // 5. MDS座標を計算（layoutがmdsの場合）
  let mdsCoordinates: number[][] | undefined;
  if (options.layout === "mds") {
    console.error("Computing MDS coordinates...");
    const mdsResult = classicalMDS(matrix, 3);
    mdsCoordinates = mdsResult.coordinates;
  }

  // 6. グラフデータを構築
  console.error("Building graph data...");
  const graphData = buildGraphData(
    ids,
    matrix,
    clusters,
    options.edgeThreshold,
    mdsCoordinates,
  );
  console.error(
    `Graph: ${graphData.nodes.length} nodes, ${graphData.links.length} edges`,
  );

  // 7. HTML生成・出力
  console.error("Generating HTML...");
  const html = generateHTML(graphData, {
    colorBy: options.colorBy,
    layout: options.layout,
  });

  console.error(`Writing to: ${options.outputFile}`);
  await Deno.writeTextFile(options.outputFile, html);
  console.error("Done!");
}
