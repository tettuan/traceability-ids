import { DBSCANClustering } from "../clustering/dbscan.ts";
import { HierarchicalClustering } from "../clustering/hierarchical.ts";
import { KMeansClustering } from "../clustering/kmeans.ts";
import type { ClusteringAlgorithm } from "../clustering/algorithm.ts";
import { assertNever } from "../core/errors.ts";
import type { AlgorithmName, ClusteringOptions } from "../core/options.ts";

export type { ClusteringOptions } from "../core/options.ts";

/**
 * クラスタリングアルゴリズムを取得するファクトリー関数
 *
 * @throws TraceabilityError `InvalidParameter`（アルゴリズムのパラメータが範囲外）
 */
export function createClusteringAlgorithm(
  name: AlgorithmName,
  options: ClusteringOptions,
): ClusteringAlgorithm {
  switch (name) {
    case "hierarchical":
      return new HierarchicalClustering(options.threshold);
    case "kmeans":
      return new KMeansClustering(options.k);
    case "dbscan":
      return new DBSCANClustering(options.epsilon, options.minPoints);
    default:
      return assertNever(name);
  }
}
