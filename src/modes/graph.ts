import { createClusteringAlgorithm } from "../cli/clustering-factory.ts";
import { createDistanceCalculator } from "../cli/distance-factory.ts";
import { consoleIO, type ModeIO } from "../core/events.ts";
import { deduplicateIds } from "../core/extractor.ts";
import type {
  AlgorithmName,
  ClusteringOptions,
  ColorMode,
  DistanceName,
  Layout,
} from "../core/options.ts";
import { createDistanceMatrix } from "../distance/calculator.ts";
import { buildGraphData } from "../visualization/graph_data.ts";
import { generateHTML } from "../visualization/html_template.ts";
import { classicalMDS } from "../visualization/mds.ts";
import { collectIds, emitResult, type InputSpec } from "./pipeline.ts";

/** Options of graph mode */
export interface GraphModeOptions extends InputSpec {
  /** Output HTML file */
  outputFile: string;
  /** Distance calculator */
  distance: DistanceName;
  /** Clustering algorithm */
  algorithm: AlgorithmName;
  /** Algorithm parameters */
  clusteringOptions: ClusteringOptions;
  /** Distance below which an edge is drawn */
  edgeThreshold: number;
  /** Node coloring */
  colorBy: ColorMode;
  /** Initial layout */
  layout: Layout;
}

/**
 * グラフ可視化モードを実行
 *
 * Events: ModeStarted → CalculatorSelected → AlgorithmSelected → (collectIds)
 * → DistanceMatrixBuilt → ClustersFormed → GraphBuilt → OutputWritten
 */
export async function runGraphMode(
  options: GraphModeOptions,
  io: ModeIO = consoleIO,
): Promise<void> {
  io.report({ type: "ModeStarted", mode: "graph" });
  const calculator = createDistanceCalculator(options.distance);
  io.report({ type: "CalculatorSelected", name: options.distance });
  const algorithm = createClusteringAlgorithm(options.algorithm, options.clusteringOptions);
  io.report({ type: "AlgorithmSelected", name: options.algorithm });

  const collected = await collectIds(options, io);
  if (!collected) return;
  const ids = deduplicateIds(collected.rawIds);

  const matrix = createDistanceMatrix(ids.map((id) => id.fullId), calculator);
  io.report({ type: "DistanceMatrixBuilt", size: ids.length });

  const clusters = algorithm.cluster(ids, matrix);
  io.report({ type: "ClustersFormed", count: clusters.length });

  const mdsCoordinates = options.layout === "mds" ? classicalMDS(matrix, 3).coordinates : undefined;
  const graphData = buildGraphData(ids, matrix, clusters, options.edgeThreshold, mdsCoordinates);
  io.report({ type: "GraphBuilt", nodes: graphData.nodes.length, links: graphData.links.length });

  const html = generateHTML(graphData, { colorBy: options.colorBy, layout: options.layout });
  await emitResult(io, html, options.outputFile);
}
