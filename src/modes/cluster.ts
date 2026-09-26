import { createClusteringAlgorithm } from "../cli/clustering-factory.ts";
import { createDistanceCalculator } from "../cli/distance-factory.ts";
import { consoleIO, type ModeIO } from "../core/events.ts";
import { COMPLETE, type ModeOutcome } from "../core/outcome.ts";
import type {
  AlgorithmName,
  ClusterFormat,
  ClusteringOptions,
  DistanceName,
} from "../core/options.ts";
import type { ClusteringResult } from "../core/types.ts";
import { createDistanceMatrix } from "../distance/calculator.ts";
import { formatResult } from "../formatter/formatter.ts";
import { collectIds, emitResult, type InputSpec } from "./pipeline.ts";

/** Options of cluster mode */
export interface ClusterModeOptions extends InputSpec {
  /** Output file (default: STDOUT) */
  outputFile?: string;
  /** Clustering algorithm */
  algorithm: AlgorithmName;
  /** Distance calculator */
  distance: DistanceName;
  /** Output format */
  format: ClusterFormat;
  /** Algorithm parameters */
  clusteringOptions: ClusteringOptions;
}

/**
 * クラスタリングモードを実行
 *
 * Events: ModeStarted → CalculatorSelected → AlgorithmSelected → (collectIds)
 * → DistanceMatrixBuilt → ClustersFormed → Output*
 */
export async function runClusterMode(
  options: ClusterModeOptions,
  io: ModeIO = consoleIO,
): Promise<ModeOutcome> {
  io.report({ type: "ModeStarted", mode: "cluster" });
  const calculator = createDistanceCalculator(options.distance);
  io.report({ type: "CalculatorSelected", name: options.distance });
  const algorithm = createClusteringAlgorithm(options.algorithm, options.clusteringOptions);
  io.report({ type: "AlgorithmSelected", name: options.algorithm });

  const collected = await collectIds(options, io);
  if (!collected) return COMPLETE;
  const ids = collected.rawIds;

  const matrix = createDistanceMatrix(ids.map((id) => id.fullId), calculator);
  io.report({ type: "DistanceMatrixBuilt", size: ids.length });

  const clusters = algorithm.cluster(ids, matrix);
  io.report({ type: "ClustersFormed", count: clusters.length });

  const result: ClusteringResult = {
    clusters,
    algorithm: algorithm.name,
    distanceCalculator: calculator.name,
  };
  await emitResult(io, formatResult(result, options.format), options.outputFile);
  return COMPLETE;
}
