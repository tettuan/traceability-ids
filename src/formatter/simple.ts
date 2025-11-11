import type { ClusteringResult } from "../core/types.ts";

/**
 * シンプルなID一覧形式でフォーマット
 * ユニークなIDをクラスタリング順に出力
 * @param result クラスタリング結果
 * @returns ID一覧（1行1ID）
 */
export function formatAsSimple(result: ClusteringResult): string {
  const uniqueIds = new Set<string>();
  const lines: string[] = [];

  // クラスタ順にIDを収集（ユニーク化）
  for (const cluster of result.clusters) {
    for (const item of cluster.items) {
      if (!uniqueIds.has(item.fullId)) {
        uniqueIds.add(item.fullId);
        lines.push(item.fullId);
      }
    }
  }

  return lines.join("\n") + "\n";
}

/**
 * クラスタごとに区切られたシンプルなID一覧形式でフォーマット
 * @param result クラスタリング結果
 * @returns クラスタ区切りのID一覧
 */
export function formatAsSimpleWithClusters(
  result: ClusteringResult,
): string {
  const lines: string[] = [];
  const uniqueIds = new Set<string>();

  for (const cluster of result.clusters) {
    const clusterIds: string[] = [];

    for (const item of cluster.items) {
      if (!uniqueIds.has(item.fullId)) {
        uniqueIds.add(item.fullId);
        clusterIds.push(item.fullId);
      }
    }

    if (clusterIds.length > 0) {
      lines.push(`# Cluster ${cluster.id} (${clusterIds.length} unique IDs)`);
      lines.push(...clusterIds);
      lines.push(""); // 空行でクラスタを区切る
    }
  }

  return lines.join("\n");
}
