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

/**
 * クラスタリングオプション（アルゴリズムごとに異なる）
 */
export interface ClusteringOptions {
  /** K-Means: クラスタ数 */
  k?: number;
  /** 階層的: 結合の閾値 */
  threshold?: number;
  /** DBSCAN: 近傍の半径 */
  epsilon?: number;
  /** DBSCAN: 最小ポイント数 */
  minPoints?: number;
}
