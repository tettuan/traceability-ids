import type { TraceabilityId } from "./types.ts";

/**
 * トレーサビリティIDのパターン: {level}:{scope}:{semantic}-{hash}#{version}
 */
const TRACEABILITY_ID_PATTERN =
  /([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)-([a-zA-Z0-9]+)#([a-zA-Z0-9]+)/g;

/**
 * 指定されたファイルからトレーサビリティIDを抽出する
 * @param filePath ファイルパス
 * @returns 抽出されたトレーサビリティIDの配列
 */
export async function extractIdsFromFile(
  filePath: string,
): Promise<TraceabilityId[]> {
  const ids: TraceabilityId[] = [];

  try {
    const content = await Deno.readTextFile(filePath);
    const lines = content.split("\n");

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const line = lines[lineNumber];
      // 正規表現をリセット
      TRACEABILITY_ID_PATTERN.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = TRACEABILITY_ID_PATTERN.exec(line)) !== null) {
        const [fullId, level, scope, semantic, hash, version] = match;

        ids.push({
          fullId,
          level,
          scope,
          semantic,
          hash,
          version,
          filePath,
          lineNumber: lineNumber + 1, // 1-based行番号
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract IDs from ${filePath}: ${message}`);
  }

  return ids;
}

/**
 * 複数のファイルからトレーサビリティIDを抽出する
 * @param filePaths ファイルパス配列
 * @returns 抽出されたトレーサビリティIDの配列
 */
export async function extractIds(
  filePaths: string[],
): Promise<TraceabilityId[]> {
  const allIds: TraceabilityId[] = [];

  for (const filePath of filePaths) {
    const ids = await extractIdsFromFile(filePath);
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
