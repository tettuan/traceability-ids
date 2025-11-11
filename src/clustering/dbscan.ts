import type { Cluster, TraceabilityId } from "../core/types.ts";
import type { ClusteringAlgorithm } from "./algorithm.ts";

/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 */
export class DBSCANClustering implements ClusteringAlgorithm {
  readonly name = "dbscan";

  /**
   * コンストラクタ
   * @param epsilon 近傍の半径
   * @param minPoints 密度の閾値（最小ポイント数）
   */
  constructor(
    private epsilon: number,
    private minPoints: number,
  ) {
    if (epsilon <= 0) {
      throw new Error("Epsilon must be positive");
    }
    if (minPoints < 1) {
      throw new Error("MinPoints must be at least 1");
    }
  }

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

    const n = items.length;
    const labels = new Array(n).fill(-1); // -1: 未訪問, -2: ノイズ, >= 0: クラスタID
    let clusterId = 0;

    // 各点について処理
    for (let i = 0; i < n; i++) {
      // 既に訪問済みの点はスキップ
      if (labels[i] !== -1) continue;

      // 近傍を取得
      const neighbors = this.getNeighbors(i, distanceMatrix);

      // 密度が閾値未満の場合はノイズとしてマーク
      if (neighbors.length < this.minPoints) {
        labels[i] = -2; // ノイズ
        continue;
      }

      // 新しいクラスタを作成
      this.expandCluster(i, neighbors, clusterId, labels, distanceMatrix);
      clusterId++;
    }

    // 結果をCluster型に変換
    const clusters: Cluster[] = [];
    for (let c = 0; c < clusterId; c++) {
      const clusterIndices = labels
        .map((label, i) => (label === c ? i : -1))
        .filter((i) => i >= 0);

      if (clusterIndices.length > 0) {
        const clusterItems = clusterIndices.map((i) => items[i]);

        // クラスタの中心（medoid）を見つける
        const centroidIndex = this.findMedoid(clusterIndices, distanceMatrix);

        clusters.push({
          id: c + 1,
          items: clusterItems,
          centroid: items[centroidIndex],
        });
      }
    }

    // ノイズポイントを個別のクラスタとして追加（オプション）
    const noiseIndices = labels
      .map((label, i) => (label === -2 ? i : -1))
      .filter((i) => i >= 0);

    if (noiseIndices.length > 0) {
      // ノイズポイントを1つのクラスタにまとめる
      clusters.push({
        id: clusterId + 1,
        items: noiseIndices.map((i) => items[i]),
        centroid: items[noiseIndices[0]],
      });
    }

    return clusters;
  }

  /**
   * クラスタを拡張
   * @param pointIndex 開始点のインデックス
   * @param neighbors 近傍点のインデックス配列
   * @param clusterId クラスタID
   * @param labels ラベル配列
   * @param distanceMatrix 距離行列
   */
  private expandCluster(
    pointIndex: number,
    neighbors: number[],
    clusterId: number,
    labels: number[],
    distanceMatrix: number[][],
  ): void {
    // 開始点をクラスタに追加
    labels[pointIndex] = clusterId;

    // 近傍点を処理（キュー）
    const queue = [...neighbors];
    let i = 0;

    while (i < queue.length) {
      const neighborIndex = queue[i];
      i++;

      // ノイズポイントの場合はクラスタに追加
      if (labels[neighborIndex] === -2) {
        labels[neighborIndex] = clusterId;
        continue;
      }

      // 既に訪問済みの場合はスキップ
      if (labels[neighborIndex] !== -1) continue;

      // クラスタに追加
      labels[neighborIndex] = clusterId;

      // 近傍を取得
      const neighborNeighbors = this.getNeighbors(
        neighborIndex,
        distanceMatrix,
      );

      // 密度が閾値以上の場合は近傍をキューに追加
      if (neighborNeighbors.length >= this.minPoints) {
        for (const nn of neighborNeighbors) {
          if (!queue.includes(nn)) {
            queue.push(nn);
          }
        }
      }
    }
  }

  /**
   * 指定した点の近傍を取得
   * @param pointIndex 点のインデックス
   * @param distanceMatrix 距離行列
   * @returns 近傍点のインデックス配列
   */
  private getNeighbors(
    pointIndex: number,
    distanceMatrix: number[][],
  ): number[] {
    const neighbors: number[] = [];
    const n = distanceMatrix.length;

    for (let i = 0; i < n; i++) {
      if (distanceMatrix[pointIndex][i] <= this.epsilon) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  /**
   * クラスタのmedoid（中央値）を見つける
   * @param indices クラスタ内のアイテムインデックス
   * @param distanceMatrix 距離行列
   * @returns medoidのインデックス
   */
  private findMedoid(indices: number[], distanceMatrix: number[][]): number {
    let minTotalDistance = Infinity;
    let medoid = indices[0];

    for (const i of indices) {
      let totalDistance = 0;
      for (const j of indices) {
        totalDistance += distanceMatrix[i][j];
      }

      if (totalDistance < minTotalDistance) {
        minTotalDistance = totalDistance;
        medoid = i;
      }
    }

    return medoid;
  }
}
