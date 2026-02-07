import { deduplicateIds, extractIds } from "../core/extractor.ts";
import { scanFiles } from "../core/scanner.ts";
import { createDistanceMatrix } from "../distance/calculator.ts";
import { type ClusteringOptions, createClusteringAlgorithm } from "../cli/clustering-factory.ts";
import { createDistanceCalculator } from "../cli/distance-factory.ts";
import type { Cluster, TraceabilityId } from "../core/types.ts";

export interface AnalyzeModeOptions {
  inputDir: string;
  outputFile: string;
  distance: string;
  algorithm: string;
  clusteringOptions: ClusteringOptions;
  edgeThreshold: number;
}

/** Level階層の定義 */
const UPPER_LEVELS = ["req", "nfr", "frq"];
const LOWER_LEVELS = ["us", "spc", "spec", "dsg"];
const INDEPENDENT_LEVELS = ["inv"];
const ALL_CHAIN_LEVELS = ["req", "us", "spc", "nfr", "dsg", "frq", "spec"];

/** 評価ランク */
function gradePercent(value: number, thresholds: number[]): string {
  if (value >= thresholds[0]) return "A";
  if (value >= thresholds[1]) return "B";
  if (value >= thresholds[2]) return "C";
  return "D";
}

/** 日付文字列をパース (YYYYMMDD[a-z]?) */
function parseVersionDate(version: string): Date | null {
  const m = version.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
}

// ─── 構成分析 ───

interface StructureAnalysis {
  levelScopeMatrix: Map<string, Map<string, number>>;
  allLevels: string[];
  allScopes: string[];
  coverageRate: number;
  coverageGrade: string;
  chainResults: { scope: string; levels: string[]; status: string }[];
  chainCompletionRate: number;
  chainGrade: string;
  fileDistribution: { high: string[]; normal: string[]; low: string[]; empty: string[] };
}

function analyzeStructure(
  uniqueIds: TraceabilityId[],
  rawIds: TraceabilityId[],
  files: string[],
): StructureAnalysis {
  // Level×Scope マトリクス
  const matrix = new Map<string, Map<string, number>>();
  const levelSet = new Set<string>();
  const scopeSet = new Set<string>();

  for (const id of uniqueIds) {
    levelSet.add(id.level);
    scopeSet.add(id.scope);
    if (!matrix.has(id.scope)) matrix.set(id.scope, new Map());
    const row = matrix.get(id.scope) ?? new Map();
    row.set(id.level, (row.get(id.level) || 0) + 1);
  }

  const allLevels = [...levelSet].sort();
  const allScopes = [...scopeSet].sort();

  // カバレッジ率 (invを除く)
  const chainLevels = allLevels.filter((l) => !INDEPENDENT_LEVELS.includes(l));
  let existingPairs = 0;
  for (const scope of allScopes) {
    const row = matrix.get(scope);
    if (!row) continue;
    for (const level of chainLevels) {
      if ((row.get(level) || 0) > 0) existingPairs++;
    }
  }
  const totalPairs = allScopes.length * chainLevels.length;
  const coverageRate = totalPairs > 0 ? existingPairs / totalPairs : 0;
  const coverageGrade = gradePercent(coverageRate, [0.8, 0.6, 0.4]);

  // チェーン完成率
  const chainResults: { scope: string; levels: string[]; status: string }[] = [];
  let chainScore = 0;
  let chainTargets = 0;

  for (const scope of allScopes) {
    const row = matrix.get(scope);
    if (!row) continue;
    const presentLevels = [...row.keys()].filter((l) => (row.get(l) || 0) > 0);
    if (presentLevels.every((l) => INDEPENDENT_LEVELS.includes(l))) continue;

    chainTargets++;
    const hasUpper = presentLevels.some((l) => UPPER_LEVELS.includes(l));
    const lowerCount = presentLevels.filter((l) => LOWER_LEVELS.includes(l)).length;

    let status: string;
    if (hasUpper && lowerCount >= 2) {
      status = "完全";
      chainScore += 1;
    } else if (hasUpper && lowerCount >= 1) {
      status = "部分";
      chainScore += 0.5;
    } else if (!hasUpper && lowerCount > 0) {
      status = "上位欠損";
    } else {
      status = "欠損";
    }
    chainResults.push({ scope, levels: presentLevels, status });
  }
  const chainCompletionRate = chainTargets > 0 ? chainScore / chainTargets : 0;
  const chainGrade = gradePercent(chainCompletionRate, [0.7, 0.5, 0.3]);

  // ファイル別ID分布
  const fileCounts = new Map<string, number>();
  for (const id of rawIds) {
    fileCounts.set(id.filePath, (fileCounts.get(id.filePath) || 0) + 1);
  }
  const high: string[] = [];
  const normal: string[] = [];
  const low: string[] = [];
  const empty: string[] = [];
  for (const f of files) {
    const count = fileCounts.get(f) || 0;
    if (count > 50) high.push(f);
    else if (count >= 3) normal.push(f);
    else if (count > 0) low.push(f);
    else empty.push(f);
  }

  return {
    levelScopeMatrix: matrix,
    allLevels,
    allScopes,
    coverageRate,
    coverageGrade,
    chainResults,
    chainCompletionRate,
    chainGrade,
    fileDistribution: { high, normal, low, empty },
  };
}

// ─── 詳細度分析 ───

interface DetailAnalysis {
  scopeRatios: { scope: string; upper: number; lower: number; ratio: number; grade: string }[];
  avgRatio: number;
  avgRatioGrade: string;
  versionFreshness: number;
  freshnessGrade: string;
  latestDate: string;
  thresholdDate: string;
  freshCount: number;
  staleCount: number;
  levelBalance: { level: string; count: number; ratio: number }[];
}

function analyzeDetail(uniqueIds: TraceabilityId[]): DetailAnalysis {
  // スコープ別展開率
  const scopeUpper = new Map<string, number>();
  const scopeLower = new Map<string, number>();

  for (const id of uniqueIds) {
    if (UPPER_LEVELS.includes(id.level)) {
      scopeUpper.set(id.scope, (scopeUpper.get(id.scope) || 0) + 1);
    } else if (LOWER_LEVELS.includes(id.level)) {
      scopeLower.set(id.scope, (scopeLower.get(id.scope) || 0) + 1);
    }
  }

  const allScopes = new Set([...scopeUpper.keys(), ...scopeLower.keys()]);
  const scopeRatios: DetailAnalysis["scopeRatios"] = [];
  let ratioSum = 0;
  let ratioCount = 0;

  for (const scope of [...allScopes].sort()) {
    const upper = scopeUpper.get(scope) || 0;
    const lower = scopeLower.get(scope) || 0;
    const ratio = upper > 0 ? lower / upper : (lower > 0 ? Infinity : 0);
    const grade = ratio === Infinity ? "A" : gradePercent(ratio, [0.7, 0.5, 0.3]);
    scopeRatios.push({ scope, upper, lower, ratio, grade });
    if (upper > 0) {
      ratioSum += lower / upper;
      ratioCount++;
    }
  }
  const avgRatio = ratioCount > 0 ? ratioSum / ratioCount : 0;
  const avgRatioGrade = gradePercent(avgRatio, [0.7, 0.5, 0.3]);

  // バージョン鮮度
  let latestMs = 0;
  const dates: number[] = [];
  for (const id of uniqueIds) {
    const d = parseVersionDate(id.version);
    if (d) {
      const ms = d.getTime();
      dates.push(ms);
      if (ms > latestMs) latestMs = ms;
    }
  }

  const thresholdMs = latestMs - 30 * 24 * 60 * 60 * 1000;
  let freshCount = 0;
  let staleCount = 0;
  for (const ms of dates) {
    if (ms >= thresholdMs) freshCount++;
    else staleCount++;
  }
  const versionFreshness = dates.length > 0 ? freshCount / dates.length : 0;
  const freshnessGrade = gradePercent(versionFreshness, [0.8, 0.6, 0.4]);

  const latestDate = latestMs > 0 ? new Date(latestMs).toISOString().slice(0, 10) : "N/A";
  const thresholdDate = latestMs > 0 ? new Date(thresholdMs).toISOString().slice(0, 10) : "N/A";

  // レベル別バランス
  const levelCounts = new Map<string, number>();
  for (const id of uniqueIds) {
    levelCounts.set(id.level, (levelCounts.get(id.level) || 0) + 1);
  }
  const reqCount = levelCounts.get("req") || 1;
  const levelBalance = [...levelCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([level, count]) => ({
      level,
      count,
      ratio: count / reqCount,
    }));

  return {
    scopeRatios,
    avgRatio,
    avgRatioGrade,
    versionFreshness,
    freshnessGrade,
    latestDate,
    thresholdDate,
    freshCount,
    staleCount,
    levelBalance,
  };
}

// ─── 重複度分析 ───

interface DuplicationAnalysis {
  nearDuplicates: { idA: string; idB: string; distance: number; pattern: string }[];
  nearDuplicateRate: number;
  nearDuplicateGrade: string;
  crossFileDuplicates: { fullId: string; files: string[] }[];
  mergeRecommendations: { priority: string; description: string }[];
}

function analyzeDuplication(
  uniqueIds: TraceabilityId[],
  rawIds: TraceabilityId[],
  matrix: number[][],
): DuplicationAnalysis {
  // 近似IDペア検出 (距離 < 0.1)
  const nearDuplicates: DuplicationAnalysis["nearDuplicates"] = [];
  const n = uniqueIds.length;
  const totalPairs = n * (n - 1) / 2;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (matrix[i][j] < 0.1) {
        const a = uniqueIds[i];
        const b = uniqueIds[j];
        let pattern: string;
        if (a.scope === b.scope && a.level === b.level) {
          pattern = "同scope同level";
        } else if (a.scope === b.scope) {
          pattern = "同scope異level";
        } else if (a.level === b.level) {
          pattern = "異scope同level";
        } else {
          pattern = "異scope異level";
        }
        nearDuplicates.push({
          idA: a.fullId,
          idB: b.fullId,
          distance: matrix[i][j],
          pattern,
        });
      }
    }
  }
  nearDuplicates.sort((a, b) => a.distance - b.distance);

  const nearDuplicateRate = totalPairs > 0 ? nearDuplicates.length / totalPairs : 0;
  const nearDuplicateGrade = nearDuplicateRate < 0.01
    ? "A"
    : nearDuplicateRate < 0.03
    ? "B"
    : nearDuplicateRate < 0.05
    ? "C"
    : "D";

  // ファイル横断重複
  const fileMap = new Map<string, Set<string>>();
  for (const id of rawIds) {
    if (!fileMap.has(id.fullId)) fileMap.set(id.fullId, new Set());
    const fset = fileMap.get(id.fullId);
    if (fset) fset.add(id.filePath);
  }
  const crossFileDuplicates: DuplicationAnalysis["crossFileDuplicates"] = [];
  for (const [fullId, fileSet] of fileMap) {
    if (fileSet.size > 1) {
      crossFileDuplicates.push({ fullId, files: [...fileSet] });
    }
  }
  crossFileDuplicates.sort((a, b) => b.files.length - a.files.length);

  // 統合推奨候補
  const mergeRecommendations: DuplicationAnalysis["mergeRecommendations"] = [];
  const highPriority = nearDuplicates.filter(
    (d) => d.pattern === "同scope同level" && d.distance < 0.05,
  );
  const medPriority = crossFileDuplicates.filter((d) => d.files.length >= 3);

  for (const d of highPriority.slice(0, 10)) {
    mergeRecommendations.push({
      priority: "HIGH",
      description: `\`${d.idA}\` と \`${d.idB}\` を統合 (距離: ${d.distance.toFixed(4)})`,
    });
  }
  for (const d of medPriority.slice(0, 10)) {
    mergeRecommendations.push({
      priority: "MEDIUM",
      description: `\`${d.fullId}\` が${d.files.length}ファイルに重複`,
    });
  }

  return {
    nearDuplicates,
    nearDuplicateRate,
    nearDuplicateGrade,
    crossFileDuplicates,
    mergeRecommendations,
  };
}

// ─── 抜け漏れ分析 ───

interface GapAnalysis {
  levelGaps: { scope: string; present: string[]; missing: string[]; severity: string }[];
  isolatedScopes: { scope: string; level: string; count: number }[];
  isolatedScopeRate: number;
  isolatedScopeGrade: string;
  lowConnectivityNodes: { id: string; degree: number; scope: string }[];
  lowConnectivityRate: number;
  gapMap: Map<string, Map<string, string>>;
  actions: { priority: string; description: string }[];
}

function analyzeGaps(
  uniqueIds: TraceabilityId[],
  matrix: number[][],
  edgeThreshold: number,
): GapAnalysis {
  // スコープ別レベル集計
  const scopeLevels = new Map<string, Map<string, number>>();
  for (const id of uniqueIds) {
    if (!scopeLevels.has(id.scope)) scopeLevels.set(id.scope, new Map());
    const row = scopeLevels.get(id.scope) ?? new Map();
    row.set(id.level, (row.get(id.level) || 0) + 1);
  }

  const allScopes = [...scopeLevels.keys()].sort();

  // レベル欠損
  const levelGaps: GapAnalysis["levelGaps"] = [];
  for (const scope of allScopes) {
    const levels = scopeLevels.get(scope) ?? new Map();
    const present = [...levels.keys()];
    if (present.every((l) => INDEPENDENT_LEVELS.includes(l))) continue;

    const hasReq = levels.has("req");
    const hasSpc = levels.has("spc");
    const hasDsg = levels.has("dsg");
    const hasUs = levels.has("us");
    const hasNfr = levels.has("nfr");

    const missing: string[] = [];
    let severity = "LOW";

    if (!hasReq && (hasSpc || hasDsg || hasUs)) {
      missing.push("req");
      severity = "CRITICAL";
    }
    if (hasReq && !hasSpc && !hasUs) {
      missing.push("us/spc");
      severity = "HIGH";
    }
    if (hasSpc && !hasDsg) {
      missing.push("dsg");
      if (severity !== "CRITICAL" && severity !== "HIGH") severity = "MEDIUM";
    }
    if (hasNfr && !levels.has("spec")) {
      missing.push("spec");
      if (severity !== "CRITICAL" && severity !== "HIGH") severity = "MEDIUM";
    }

    if (missing.length > 0) {
      levelGaps.push({ scope, present, missing, severity });
    }
  }
  // ソート: CRITICAL > HIGH > MEDIUM > LOW
  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  levelGaps.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  // 孤立スコープ
  const isolatedScopes: GapAnalysis["isolatedScopes"] = [];
  for (const scope of allScopes) {
    const levels = scopeLevels.get(scope) ?? new Map();
    const nonInvLevels = [...levels.keys()].filter((l) => !INDEPENDENT_LEVELS.includes(l));
    if (nonInvLevels.length === 1) {
      isolatedScopes.push({
        scope,
        level: nonInvLevels[0],
        count: levels.get(nonInvLevels[0]) || 0,
      });
    } else if (levels.size === 1 && [...levels.keys()][0] === "inv") {
      // inv only scope - OK, not isolated
    }
  }
  const nonInvScopes = allScopes.filter((s) => {
    const levels = scopeLevels.get(s) ?? new Map();
    return ![...levels.keys()].every((l) => INDEPENDENT_LEVELS.includes(l));
  });
  const isolatedScopeRate = nonInvScopes.length > 0
    ? isolatedScopes.length / nonInvScopes.length
    : 0;
  const isolatedScopeGrade = isolatedScopeRate === 0
    ? "A"
    : gradePercent(1 - isolatedScopeRate, [0.9, 0.8, 0.7]);

  // 低連結ノード
  const n = uniqueIds.length;
  const degrees: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (matrix[i][j] <= edgeThreshold) {
        degrees[i]++;
        degrees[j]++;
      }
    }
  }
  const sortedDegrees = [...degrees].sort((a, b) => a - b);
  const medianDegree = sortedDegrees[Math.floor(n / 2)] || 0;
  const lowThreshold = Math.floor(medianDegree * 0.25);

  const lowConnectivityNodes: GapAnalysis["lowConnectivityNodes"] = [];
  for (let i = 0; i < n; i++) {
    if (degrees[i] <= lowThreshold) {
      lowConnectivityNodes.push({
        id: uniqueIds[i].fullId,
        degree: degrees[i],
        scope: uniqueIds[i].scope,
      });
    }
  }
  lowConnectivityNodes.sort((a, b) => a.degree - b.degree);
  const lowConnectivityRate = n > 0 ? lowConnectivityNodes.length / n : 0;

  // ギャップマップ
  const gapMap = new Map<string, Map<string, string>>();
  for (const scope of allScopes) {
    const row = new Map<string, string>();
    const levels = scopeLevels.get(scope) ?? new Map();
    for (const level of ALL_CHAIN_LEVELS) {
      const count = levels.get(level) || 0;
      if (count >= 3) row.set(level, "●");
      else if (count > 0) row.set(level, "◐");
      else row.set(level, "○");
    }
    gapMap.set(scope, row);
  }

  // 改善アクション
  const actions: GapAnalysis["actions"] = [];
  for (const gap of levelGaps) {
    actions.push({
      priority: gap.severity,
      description: `\`${gap.scope}\` scope: ${gap.missing.join(", ")} の作成が必要 (現在: ${
        gap.present.join(", ")
      })`,
    });
  }
  for (const iso of isolatedScopes.slice(0, 5)) {
    actions.push({
      priority: "MEDIUM",
      description: `\`${iso.scope}\` scope: ${iso.level}のみ → 他レベルへの展開を推奨`,
    });
  }
  if (lowConnectivityNodes.length > 10) {
    actions.push({
      priority: "LOW",
      description: `低連結ノード${lowConnectivityNodes.length}件: 命名・分類の見直しを検討`,
    });
  }

  return {
    levelGaps,
    isolatedScopes,
    isolatedScopeRate,
    isolatedScopeGrade,
    lowConnectivityNodes,
    lowConnectivityRate,
    gapMap,
    actions,
  };
}

// ─── レポート生成 ───

function generateReport(
  options: AnalyzeModeOptions,
  files: string[],
  rawIds: TraceabilityId[],
  uniqueIds: TraceabilityId[],
  clusters: Cluster[],
  structure: StructureAnalysis,
  detail: DetailAnalysis,
  duplication: DuplicationAnalysis,
  gaps: GapAnalysis,
): string {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const lines: string[] = [];
  const ln = (s = ""): void => {
    lines.push(s);
  };

  // ── ヘッダー ──
  ln("# トレーサビリティID 文書改善レポート");
  ln();
  ln(`- **生成日時**: ${now}`);
  ln(`- **対象ディレクトリ**: ${options.inputDir}`);
  ln(`- **ファイル数**: ${files.length}`);
  ln(`- **総ID数(重複込み)**: ${rawIds.length}`);
  ln(`- **ユニークID数**: ${uniqueIds.length}`);
  ln(`- **クラスタ数**: ${clusters.length}`);
  ln(`- **距離計算**: ${options.distance} / クラスタリング: ${options.algorithm}`);
  ln();

  // ── 1. サマリー ──
  ln("## 1. サマリー");
  ln();
  ln("| 観点 | 主要メトリクス | 値 | 評価 |");
  ln("| ---- | -------------- | -- | ---- |");
  ln(
    `| 構成 | カバレッジ率 | ${
      (structure.coverageRate * 100).toFixed(1)
    }% | ${structure.coverageGrade} |`,
  );
  ln(
    `| 構成 | チェーン完成率 | ${
      (structure.chainCompletionRate * 100).toFixed(1)
    }% | ${structure.chainGrade} |`,
  );
  ln(`| 詳細度 | 平均仕様化率 | ${detail.avgRatio.toFixed(2)} | ${detail.avgRatioGrade} |`);
  ln(
    `| 詳細度 | バージョン鮮度 | ${
      (detail.versionFreshness * 100).toFixed(1)
    }% | ${detail.freshnessGrade} |`,
  );
  ln(
    `| 重複度 | 近似ID率 | ${
      (duplication.nearDuplicateRate * 100).toFixed(2)
    }% | ${duplication.nearDuplicateGrade} |`,
  );
  ln(
    `| 抜け漏れ | 孤立スコープ率 | ${
      (gaps.isolatedScopeRate * 100).toFixed(1)
    }% | ${gaps.isolatedScopeGrade} |`,
  );
  ln();

  // ── 2. 構成分析 ──
  ln("## 2. 構成分析");
  ln();
  ln("### Level×Scope カバレッジマトリクス");
  ln();

  const matLevels = structure.allLevels;
  ln("| scope | " + matLevels.join(" | ") + " | 計 |");
  ln("| ----- | " + matLevels.map(() => "---").join(" | ") + " | --- |");
  for (const scope of structure.allScopes) {
    const row = structure.levelScopeMatrix.get(scope);
    let total = 0;
    const cells = matLevels.map((l) => {
      const v = row?.get(l) || 0;
      total += v;
      return v > 0 ? String(v) : "-";
    });
    ln(`| ${scope} | ${cells.join(" | ")} | ${total} |`);
  }
  ln();
  ln(
    `**カバレッジ率**: ${
      (structure.coverageRate * 100).toFixed(1)
    }% (評価: ${structure.coverageGrade})`,
  );
  ln();

  ln("### トレーサビリティチェーン");
  ln();
  ln("| scope | 存在レベル | 判定 |");
  ln("| ----- | ---------- | ---- |");
  for (const r of structure.chainResults) {
    ln(`| ${r.scope} | ${r.levels.join(", ")} | ${r.status} |`);
  }
  ln();
  ln(
    `**チェーン完成率**: ${
      (structure.chainCompletionRate * 100).toFixed(1)
    }% (評価: ${structure.chainGrade})`,
  );
  ln();

  ln("### ファイル別ID分布");
  ln();
  ln(`- 高密度ファイル (>50 IDs): ${structure.fileDistribution.high.length}件`);
  ln(`- 標準ファイル (3-50 IDs): ${structure.fileDistribution.normal.length}件`);
  ln(`- 低密度ファイル (<3 IDs): ${structure.fileDistribution.low.length}件`);
  ln(`- ID無しファイル: ${structure.fileDistribution.empty.length}件`);
  ln();

  // ── 3. 詳細度分析 ──
  ln("## 3. 詳細度分析");
  ln();
  ln("### スコープ別展開率");
  ln();
  ln("| scope | 上位(req等) | 下位(spc等) | 仕様化率 | 評価 |");
  ln("| ----- | ----------- | ----------- | -------- | ---- |");
  for (const r of detail.scopeRatios) {
    const ratioStr = r.ratio === Infinity ? "∞" : r.ratio.toFixed(2);
    ln(`| ${r.scope} | ${r.upper} | ${r.lower} | ${ratioStr} | ${r.grade} |`);
  }
  ln();
  ln(`**平均仕様化率**: ${detail.avgRatio.toFixed(2)} (評価: ${detail.avgRatioGrade})`);
  ln();

  ln("### バージョン鮮度");
  ln();
  ln(`- 最新日付: ${detail.latestDate}`);
  ln(`- 鮮度閾値: ${detail.thresholdDate}（最新から30日以内）`);
  ln(`- 最新ID: ${detail.freshCount}件 (${(detail.versionFreshness * 100).toFixed(1)}%)`);
  ln(`- 古いID: ${detail.staleCount}件`);
  ln();
  ln(
    `**バージョン鮮度**: ${
      (detail.versionFreshness * 100).toFixed(1)
    }% (評価: ${detail.freshnessGrade})`,
  );
  ln();

  ln("### レベル別バランス");
  ln();
  ln("| level | ID数 | 比率(対req) |");
  ln("| ----- | ---- | ----------- |");
  for (const r of detail.levelBalance) {
    ln(`| ${r.level} | ${r.count} | ${r.ratio.toFixed(2)} |`);
  }
  ln();

  // ── 4. 重複度分析 ──
  ln("## 4. 重複度分析");
  ln();

  ln("### 近似IDペア（距離 < 0.1）");
  ln();
  if (duplication.nearDuplicates.length > 0) {
    ln("| ID-A | ID-B | 距離 | パターン |");
    ln("| ---- | ---- | ---- | -------- |");
    for (const d of duplication.nearDuplicates.slice(0, 30)) {
      ln(`| \`${d.idA}\` | \`${d.idB}\` | ${d.distance.toFixed(4)} | ${d.pattern} |`);
    }
    if (duplication.nearDuplicates.length > 30) {
      ln(`| ... | ... | ... | 他${duplication.nearDuplicates.length - 30}件 |`);
    }
  } else {
    ln("近似IDペアはありません。");
  }
  ln();
  ln(
    `**近似ID率**: ${
      (duplication.nearDuplicateRate * 100).toFixed(2)
    }% (評価: ${duplication.nearDuplicateGrade})`,
  );
  ln(`**近似ペア数**: ${duplication.nearDuplicates.length}件`);
  ln();

  ln("### ファイル横断重複");
  ln();
  if (duplication.crossFileDuplicates.length > 0) {
    ln("| ID | 出現ファイル数 |");
    ln("| -- | -------------- |");
    for (const d of duplication.crossFileDuplicates.slice(0, 20)) {
      ln(`| \`${d.fullId}\` | ${d.files.length} |`);
    }
    if (duplication.crossFileDuplicates.length > 20) {
      ln(`| ... | 他${duplication.crossFileDuplicates.length - 20}件 |`);
    }
  } else {
    ln("ファイル横断重複はありません。");
  }
  ln();
  ln(`**重複ID数**: ${duplication.crossFileDuplicates.length}件`);
  ln();

  if (duplication.mergeRecommendations.length > 0) {
    ln("### 統合推奨アクション");
    ln();
    for (let i = 0; i < duplication.mergeRecommendations.length; i++) {
      const r = duplication.mergeRecommendations[i];
      ln(`${i + 1}. **[${r.priority}]** ${r.description}`);
    }
    ln();
  }

  // ── 5. 抜け漏れ分析 ──
  ln("## 5. 抜け漏れ分析");
  ln();

  ln("### レベル欠損");
  ln();
  if (gaps.levelGaps.length > 0) {
    ln("| scope | 存在レベル | 欠損 | 深刻度 |");
    ln("| ----- | ---------- | ---- | ------ |");
    for (const g of gaps.levelGaps) {
      ln(`| ${g.scope} | ${g.present.join(", ")} | ${g.missing.join(", ")} | ${g.severity} |`);
    }
  } else {
    ln("レベル欠損はありません。");
  }
  ln();

  ln("### 孤立スコープ（1レベルのみ）");
  ln();
  if (gaps.isolatedScopes.length > 0) {
    ln("| scope | 唯一のlevel | ID数 |");
    ln("| ----- | ----------- | ---- |");
    for (const s of gaps.isolatedScopes) {
      ln(`| ${s.scope} | ${s.level} | ${s.count} |`);
    }
  } else {
    ln("孤立スコープはありません。");
  }
  ln();
  ln(
    `**孤立スコープ率**: ${
      (gaps.isolatedScopeRate * 100).toFixed(1)
    }% (評価: ${gaps.isolatedScopeGrade})`,
  );
  ln();

  ln("### 低連結ノード");
  ln();
  ln(
    `検出数: ${gaps.lowConnectivityNodes.length}件 / 全${uniqueIds.length}件 (${
      (gaps.lowConnectivityRate * 100).toFixed(1)
    }%)`,
  );
  ln();
  if (gaps.lowConnectivityNodes.length > 0) {
    ln("| ID | degree | scope |");
    ln("| -- | ------ | ----- |");
    for (const n of gaps.lowConnectivityNodes.slice(0, 20)) {
      ln(`| \`${n.id}\` | ${n.degree} | ${n.scope} |`);
    }
    if (gaps.lowConnectivityNodes.length > 20) {
      ln(`| ... | ... | 他${gaps.lowConnectivityNodes.length - 20}件 |`);
    }
  }
  ln();

  ln("### トレーサビリティギャップマップ");
  ln();
  ln("| scope | " + ALL_CHAIN_LEVELS.join(" | ") + " |");
  ln("| ----- | " + ALL_CHAIN_LEVELS.map(() => "---").join(" | ") + " |");
  for (const scope of [...gaps.gapMap.keys()].sort()) {
    const row = gaps.gapMap.get(scope) ?? new Map();
    const cells = ALL_CHAIN_LEVELS.map((l) => row.get(l) || "○");
    ln(`| ${scope} | ${cells.join(" | ")} |`);
  }
  ln();

  // ── 6. 改善アクション ──
  ln("## 6. 改善アクション（優先度順）");
  ln();
  const allActions = [...gaps.actions, ...duplication.mergeRecommendations];
  allActions.sort((a, b) => {
    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
  });
  for (let i = 0; i < allActions.length; i++) {
    const a = allActions[i];
    ln(`${i + 1}. **[${a.priority}]** ${a.description}`);
  }
  if (allActions.length === 0) {
    ln("改善アクションはありません。");
  }
  ln();

  return lines.join("\n");
}

// ─── メインエントリ ───

export async function runAnalyzeMode(options: AnalyzeModeOptions): Promise<void> {
  console.error(`Distance calculator: ${options.distance}`);
  const calculator = createDistanceCalculator(options.distance);

  console.error(`Clustering algorithm: ${options.algorithm}`);
  const algorithm = createClusteringAlgorithm(options.algorithm, options.clusteringOptions);

  // 1. ファイルスキャン
  console.error(`Scanning files in: ${options.inputDir}`);
  const files = await scanFiles(options.inputDir);
  console.error(`Found ${files.length} markdown files`);

  if (files.length === 0) {
    console.error("No markdown files found");
    return;
  }

  // 2. ID抽出
  console.error("Extracting traceability IDs...");
  const rawIds = await extractIds(files);
  const uniqueIds = deduplicateIds(rawIds);
  console.error(`Extracted ${rawIds.length} IDs, deduplicated to ${uniqueIds.length}`);

  if (uniqueIds.length === 0) {
    console.error("No traceability IDs found");
    return;
  }

  // 3. 距離行列
  console.error(`Calculating distance matrix using: ${calculator.name}`);
  const matrix = createDistanceMatrix(
    uniqueIds.map((id) => id.fullId),
    calculator,
  );

  // 4. クラスタリング
  console.error(`Clustering using: ${algorithm.name}`);
  const clusters = algorithm.cluster(uniqueIds, matrix);
  console.error(`Created ${clusters.length} clusters`);

  // 5. 4観点の分析
  console.error("Analyzing structure...");
  const structure = analyzeStructure(uniqueIds, rawIds, files);

  console.error("Analyzing detail level...");
  const detail = analyzeDetail(uniqueIds);

  console.error("Analyzing duplication...");
  const duplication = analyzeDuplication(uniqueIds, rawIds, matrix);

  console.error("Analyzing gaps...");
  const gaps = analyzeGaps(uniqueIds, matrix, options.edgeThreshold);

  // 6. レポート生成
  console.error("Generating report...");
  const report = generateReport(
    options,
    files,
    rawIds,
    uniqueIds,
    clusters,
    structure,
    detail,
    duplication,
    gaps,
  );

  console.error(`Writing to: ${options.outputFile}`);
  await Deno.writeTextFile(options.outputFile, report);
  console.error("Done!");
}
