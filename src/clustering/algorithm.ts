import type { Cluster, TraceabilityId } from "../core/types.ts";

/**
 * クラスタリングアルゴリズムインターフェース
 */
export interface ClusteringAlgorithm {
  /**
   * クラスタリングを実行
   * @param items クラスタリング対象のID
   * @param distanceMatrix 距離行列
   * @returns クラスタの配列
   */
  cluster(items: TraceabilityId[], distanceMatrix: number[][]): Cluster[];

  /**
   * アルゴリズムの名前
   */
  readonly name: string;
}
