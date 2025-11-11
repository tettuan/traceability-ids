import type {
  ClusteringResult,
  SimilaritySearchResult,
} from "../core/types.ts";
import { formatAsSimple, formatAsSimpleWithClusters } from "./simple.ts";

// Re-export simple formatters
export { formatAsSimple, formatAsSimpleWithClusters };

/**
 * 結果をJSON形式でフォーマット
 * @param result クラスタリング結果
 * @returns JSON文字列
 */
export function formatAsJson(result: ClusteringResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * 結果をMarkdown形式でフォーマット
 * @param result クラスタリング結果
 * @returns Markdown文字列
 */
export function formatAsMarkdown(result: ClusteringResult): string {
  let md = `# Traceability ID Clustering Results\n\n`;
  md += `- Algorithm: ${result.algorithm}\n`;
  md += `- Distance Calculator: ${result.distanceCalculator}\n`;
  md += `- Total Clusters: ${result.clusters.length}\n`;
  md += `- Total IDs: ${result.clusters.reduce(
    (sum, c) => sum + c.items.length,
    0,
  )}\n\n`;

  result.clusters.forEach((cluster) => {
    md += `## Cluster ${cluster.id} (${cluster.items.length} items)\n\n`;

    if (cluster.centroid) {
      md +=
        `**Representative:** \`${cluster.centroid.fullId}\` (${cluster.centroid.filePath}:${cluster.centroid.lineNumber})\n\n`;
    }

    md += `### Items\n\n`;
    cluster.items.forEach((item) => {
      md += `- \`${item.fullId}\`\n`;
      md += `  - File: ${item.filePath}:${item.lineNumber}\n`;
      md +=
        `  - Components: level=\`${item.level}\`, scope=\`${item.scope}\`, semantic=\`${item.semantic}\`, hash=\`${item.hash}\`, version=\`${item.version}\`\n`;
    });
    md += `\n`;
  });

  return md;
}

/**
 * 結果をCSV形式でフォーマット
 * @param result クラスタリング結果
 * @returns CSV文字列
 */
export function formatAsCsv(result: ClusteringResult): string {
  let csv =
    "ClusterID,TraceabilityID,FilePath,LineNumber,Level,Scope,Semantic,Hash,Version\n";

  result.clusters.forEach((cluster) => {
    cluster.items.forEach((item) => {
      csv += `${cluster.id},"${item.fullId}","${item.filePath}",${item.lineNumber},"${item.level}","${item.scope}","${item.semantic}","${item.hash}","${item.version}"\n`;
    });
  });

  return csv;
}

/**
 * 結果を指定された形式でフォーマット
 * @param result クラスタリング結果
 * @param format 出力形式
 * @returns フォーマット済み文字列
 */
export function formatResult(
  result: ClusteringResult,
  format: "json" | "markdown" | "csv" | "simple" | "simple-clustered",
): string {
  switch (format) {
    case "json":
      return formatAsJson(result);
    case "markdown":
      return formatAsMarkdown(result);
    case "csv":
      return formatAsCsv(result);
    case "simple":
      return formatAsSimple(result);
    case "simple-clustered":
      return formatAsSimpleWithClusters(result);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/**
 * 類似度検索結果をシンプル形式でフォーマット
 * @param result 類似度検索結果
 * @param showDistance 距離スコアを表示するか
 * @returns フォーマット済み文字列
 */
export function formatSearchResultAsSimple(
  result: SimilaritySearchResult,
  showDistance = false,
): string {
  const lines: string[] = [];

  // ヘッダー
  lines.push(`# Query: ${result.query}`);
  lines.push(`# Distance calculator: ${result.distanceCalculator}`);
  lines.push(`# Results: ${result.items.length} IDs`);
  lines.push("");

  // 各ID
  result.items.forEach((item) => {
    if (showDistance) {
      lines.push(
        `${item.id.fullId} (distance: ${item.distance.toFixed(3)})`,
      );
    } else {
      lines.push(item.id.fullId);
    }
  });

  return lines.join("\n") + "\n";
}

/**
 * 類似度検索結果をJSON形式でフォーマット
 * @param result 類似度検索結果
 * @returns JSON文字列
 */
export function formatSearchResultAsJson(
  result: SimilaritySearchResult,
): string {
  return JSON.stringify(result, null, 2);
}

/**
 * 類似度検索結果をMarkdown形式でフォーマット
 * @param result 類似度検索結果
 * @returns Markdown文字列
 */
export function formatSearchResultAsMarkdown(
  result: SimilaritySearchResult,
): string {
  let md = `# Similarity Search Results\n\n`;
  md += `- Query: \`${result.query}\`\n`;
  md += `- Distance Calculator: ${result.distanceCalculator}\n`;
  md += `- Total Results: ${result.items.length}\n\n`;

  md += `## Results (sorted by similarity)\n\n`;

  result.items.forEach((item, index) => {
    md += `### ${index + 1}. \`${item.id.fullId}\`\n\n`;
    md += `- **Distance**: ${item.distance.toFixed(3)}\n`;
    md += `- **File**: ${item.id.filePath}:${item.id.lineNumber}\n`;
    md +=
      `- **Components**: level=\`${item.id.level}\`, scope=\`${item.id.scope}\`, semantic=\`${item.id.semantic}\`, hash=\`${item.id.hash}\`, version=\`${item.id.version}\`\n\n`;
  });

  return md;
}

/**
 * 類似度検索結果をCSV形式でフォーマット
 * @param result 類似度検索結果
 * @returns CSV文字列
 */
export function formatSearchResultAsCsv(
  result: SimilaritySearchResult,
): string {
  let csv =
    "Rank,Distance,TraceabilityID,FilePath,LineNumber,Level,Scope,Semantic,Hash,Version\n";

  result.items.forEach((item, index) => {
    csv += `${index + 1},${item.distance},"${item.id.fullId}","${item.id.filePath}",${item.id.lineNumber},"${item.id.level}","${item.id.scope}","${item.id.semantic}","${item.id.hash}","${item.id.version}"\n`;
  });

  return csv;
}

/**
 * 類似度検索結果を指定された形式でフォーマット
 * @param result 類似度検索結果
 * @param format 出力形式
 * @param showDistance 距離スコアを表示するか（simple形式のみ）
 * @returns フォーマット済み文字列
 */
export function formatSearchResult(
  result: SimilaritySearchResult,
  format: "json" | "markdown" | "csv" | "simple",
  showDistance = false,
): string {
  switch (format) {
    case "json":
      return formatSearchResultAsJson(result);
    case "markdown":
      return formatSearchResultAsMarkdown(result);
    case "csv":
      return formatSearchResultAsCsv(result);
    case "simple":
      return formatSearchResultAsSimple(result, showDistance);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}
