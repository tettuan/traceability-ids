import type { Cluster, TraceabilityId } from "../core/types.ts";
import type { ClusteringAlgorithm } from "./algorithm.ts";

/**
 * K-Means クラスタリング
 */
export class KMeansClustering implements ClusteringAlgorithm {
  readonly name = "kmeans";

  /**
   * コンストラクタ
   * @param k クラスタ数（0の場合は自動推定）
   * @param maxIterations 最大イテレーション数（デフォルト: 100）
   * @param seed ランダムシード（再現性のため、デフォルト: 42）
   */
  constructor(
    private k: number,
    private maxIterations: number = 100,
    private seed: number = 42,
  ) {}

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

    // クラスタ数を自動推定（Kが0の場合）
    let k = this.k;
    if (k <= 0) {
      k = this.estimateK(items.length);
    }

    // クラスタ数が項目数以上の場合は、各項目を個別のクラスタに
    if (k >= items.length) {
      return items.map((item, index) => ({
        id: index + 1,
        items: [item],
        centroid: item,
      }));
    }

    // 初期中心をランダムに選択（K-Means++）
    const centroids = this.initializeCentroidsKMeansPlusPlus(
      items.length,
      k,
      distanceMatrix,
    );

    // K-Meansアルゴリズム
    let assignments = new Array(items.length).fill(0);
    let iteration = 0;

    while (iteration < this.maxIterations) {
      // 各アイテムを最も近い中心に割り当て
      const newAssignments = new Array(items.length);
      for (let i = 0; i < items.length; i++) {
        let minDistance = Infinity;
        let closestCentroid = 0;

        for (let c = 0; c < centroids.length; c++) {
          const distance = distanceMatrix[i][centroids[c]];
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroid = c;
          }
        }

        newAssignments[i] = closestCentroid;
      }

      // 収束チェック
      if (this.hasConverged(assignments, newAssignments)) {
        assignments = newAssignments;
        break;
      }

      assignments = newAssignments;

      // 新しい中心を計算
      for (let c = 0; c < k; c++) {
        const clusterIndices = assignments
          .map((a, i) => (a === c ? i : -1))
          .filter((i) => i >= 0);

        if (clusterIndices.length > 0) {
          // クラスタ内で最も中心に近いアイテムを新しい中心とする（medoid）
          centroids[c] = this.findMedoid(clusterIndices, distanceMatrix);
        }
      }

      iteration++;
    }

    // 結果をCluster型に変換
    const clusters: Cluster[] = [];
    for (let c = 0; c < k; c++) {
      const clusterIndices = assignments
        .map((a, i) => (a === c ? i : -1))
        .filter((i) => i >= 0);

      if (clusterIndices.length > 0) {
        const clusterItems = clusterIndices.map((i) => items[i]);
        const centroidIndex = centroids[c];

        clusters.push({
          id: c + 1,
          items: clusterItems,
          centroid: items[centroidIndex],
        });
      }
    }

    return clusters;
  }

  /**
   * K-Means++法で初期中心を選択
   * @param n アイテム数
   * @param k クラスタ数
   * @param distanceMatrix 距離行列
   * @returns 初期中心のインデックス配列
   */
  private initializeCentroidsKMeansPlusPlus(
    n: number,
    k: number,
    distanceMatrix: number[][],
  ): number[] {
    const centroids: number[] = [];
    const random = this.seededRandom(this.seed);

    // 最初の中心をランダムに選択
    centroids.push(Math.floor(random() * n));

    // 残りの中心を選択
    while (centroids.length < k) {
      // 各点について、最も近い既存の中心までの距離を計算
      const distances = new Array(n).fill(Infinity);
      for (let i = 0; i < n; i++) {
        for (const centroid of centroids) {
          const distance = distanceMatrix[i][centroid];
          if (distance < distances[i]) {
            distances[i] = distance;
          }
        }
      }

      // 距離の二乗に比例する確率で次の中心を選択
      const distanceSquares = distances.map((d) => d * d);
      const totalDistance = distanceSquares.reduce((sum, d) => sum + d, 0);

      let r = random() * totalDistance;
      let nextCentroid = 0;

      for (let i = 0; i < n; i++) {
        r -= distanceSquares[i];
        if (r <= 0) {
          nextCentroid = i;
          break;
        }
      }

      centroids.push(nextCentroid);
    }

    return centroids;
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

  /**
   * 収束判定
   * @param oldAssignments 前回の割り当て
   * @param newAssignments 新しい割り当て
   * @returns 収束していればtrue
   */
  private hasConverged(
    oldAssignments: number[],
    newAssignments: number[],
  ): boolean {
    for (let i = 0; i < oldAssignments.length; i++) {
      if (oldAssignments[i] !== newAssignments[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * クラスタ数を自動推定（エルボー法の簡易版）
   * @param n アイテム数
   * @returns 推定されたクラスタ数
   */
  private estimateK(n: number): number {
    // 平方根法を使用（一般的な経験則）
    return Math.max(2, Math.floor(Math.sqrt(n / 2)));
  }

  /**
   * シード付き擬似乱数生成器
   * @param seed シード値
   * @returns 乱数生成関数（0-1の範囲）
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      // 線形合同法
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }
}
