import type { Cluster, TraceabilityId } from "../core/types.ts";
import type { ClusteringAlgorithm } from "./algorithm.ts";

/**
 * 階層的クラスタリング（凝集型）
 */
export class HierarchicalClustering implements ClusteringAlgorithm {
  readonly name = "hierarchical";

  /**
   * コンストラクタ
   * @param threshold 結合の閾値（この距離以下なら結合）
   */
  constructor(private threshold: number) {}

  /**
   * クラスタリングを実行
   * @param items クラスタリング対象のID
   * @param distanceMatrix 距離行列
   * @returns クラスタの配列
   */
  cluster(items: TraceabilityId[], distanceMatrix: number[][]): Cluster[] {
    if (items.length === 0) {
      return [];
    }

    // 各アイテムを個別のクラスタとして初期化
    const clusters: Set<number>[] = items.map((_, i) => new Set([i]));

    // クラスタ間の距離を計算（最小距離法）
    while (true) {
      let minDistance = Infinity;
      let mergeI = -1;
      let mergeJ = -1;

      // 最も近い2つのクラスタを探す
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const distance = this.calculateClusterDistance(
            clusters[i],
            clusters[j],
            distanceMatrix,
          );

          if (distance < minDistance) {
            minDistance = distance;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      // 閾値を超えたら終了
      if (minDistance > this.threshold) {
        break;
      }

      // クラスタがこれ以上結合できない場合は終了
      if (mergeI === -1 || mergeJ === -1) {
        break;
      }

      // クラスタを結合
      const merged = new Set([...clusters[mergeI], ...clusters[mergeJ]]);
      clusters.splice(mergeJ, 1); // 後ろから削除
      clusters.splice(mergeI, 1);
      clusters.push(merged);
    }

    // 結果を Cluster 型に変換
    return clusters.map((clusterIndices, clusterId) => {
      const clusterItems = Array.from(clusterIndices).map((i) => items[i]);

      // クラスタの代表（最初のアイテム）
      const centroid = clusterItems[0];

      return {
        id: clusterId + 1,
        items: clusterItems,
        centroid,
      };
    });
  }

  /**
   * クラスタ間の距離を計算（最小距離法）
   * @param cluster1 クラスタ1のインデックス集合
   * @param cluster2 クラスタ2のインデックス集合
   * @param distanceMatrix 距離行列
   * @returns クラスタ間の距離
   */
  private calculateClusterDistance(
    cluster1: Set<number>,
    cluster2: Set<number>,
    distanceMatrix: number[][],
  ): number {
    let minDistance = Infinity;

    for (const i of cluster1) {
      for (const j of cluster2) {
        const distance = distanceMatrix[i][j];
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
    }

    return minDistance;
  }
}
