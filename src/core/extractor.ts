import { frontmatterLineCount } from "./frontmatter.ts";
import { findIds } from "./id.ts";
import type { FrontmatterPolicy } from "./options.ts";
import { readText } from "./io.ts";
import type { TraceabilityId } from "./types.ts";

/**
 * テキストからトレーサビリティIDを抽出する（純粋関数）
 * @param content テキスト
 * @param filePath 位置情報に記録するファイルパス
 * @param frontmatter frontmatter を対象にするか（既定: include）
 * @returns 抽出されたトレーサビリティIDの配列（出現順、行番号は元のファイルの行）
 */
export function extractIdsFromText(
  content: string,
  filePath: string,
  frontmatter: FrontmatterPolicy = "include",
): TraceabilityId[] {
  const lines = content.split("\n");
  const start = frontmatter === "skip" ? frontmatterLineCount(lines) : 0;
  return lines.slice(start).flatMap((line, index) =>
    findIds(line).map((components) => ({
      ...components,
      filePath,
      lineNumber: start + index + 1, // 1-based行番号
    }))
  );
}

/**
 * 指定されたファイルからトレーサビリティIDを抽出する
 * @param filePath ファイルパス
 * @param frontmatter frontmatter を対象にするか（既定: include）
 * @returns 抽出されたトレーサビリティIDの配列
 * @throws TraceabilityError `PathNotFound` | `PathAccessDenied` | `FileReadFailed`
 */
export async function extractIdsFromFile(
  filePath: string,
  frontmatter: FrontmatterPolicy = "include",
): Promise<TraceabilityId[]> {
  return extractIdsFromText(await readText(filePath), filePath, frontmatter);
}

/**
 * 複数のファイルからトレーサビリティIDを抽出する
 * @param filePaths ファイルパス配列
 * @param frontmatter frontmatter を対象にするか（既定: include）
 * @returns 抽出されたトレーサビリティIDの配列
 */
export async function extractIds(
  filePaths: readonly string[],
  frontmatter: FrontmatterPolicy = "include",
): Promise<TraceabilityId[]> {
  const allIds: TraceabilityId[] = [];

  for (const filePath of filePaths) {
    const ids = await extractIdsFromFile(filePath, frontmatter);
    allIds.push(...ids);
  }

  return allIds;
}

/**
 * IDを重複排除する（fullIdが同じものは最初の1つだけ保持）
 * 検索モードで使用する
 * @param ids ID配列
 * @returns 重複排除されたID配列
 */
export function deduplicateIds(ids: TraceabilityId[]): TraceabilityId[] {
  const seen = new Set<string>();
  const deduplicated: TraceabilityId[] = [];

  for (const id of ids) {
    if (!seen.has(id.fullId)) {
      seen.add(id.fullId);
      deduplicated.push(id);
    }
  }

  return deduplicated;
}
