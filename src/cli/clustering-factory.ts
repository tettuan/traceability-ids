import { DBSCANClustering } from "../clustering/dbscan.ts";
import { HierarchicalClustering } from "../clustering/hierarchical.ts";
import { KMeansClustering } from "../clustering/kmeans.ts";
import type { ClusteringAlgorithm } from "../clustering/algorithm.ts";

export interface ClusteringOptions {
  threshold: number;
  k: number;
  epsilon: number;
  minPoints: number;
}

/**
 * クラスタリングアルゴリズムを取得するファクトリー関数
 */
export function createClusteringAlgorithm(
  name: string,
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
      throw new Error(
        `Unknown clustering algorithm: ${name}. Available: hierarchical, kmeans, dbscan`,
      );
  }
}
