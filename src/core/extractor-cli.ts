/**
 * CLIツール（rg + sort）を使った高速ID抽出
 *
 * ripgrep (rg) と sort -u を使用して、ID抽出とユニーク化を高速化
 * extract mode（行番号が必要）では使用できないため、search/cluster mode専用
 */

/**
 * コマンドが利用可能かチェック
 */
async function checkCommand(command: string): Promise<boolean> {
  try {
    const cmd = new Deno.Command(command, {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    });
    const { success } = await cmd.output();
    return success;
  } catch {
    return false;
  }
}

/**
 * ripgrepとsortが利用可能かチェック
 */
export async function checkCliToolsAvailable(): Promise<{
  rg: boolean;
  sort: boolean;
}> {
  const [rg, sort] = await Promise.all([
    checkCommand("rg"),
    checkCommand("sort"),
  ]);
  return { rg, sort };
}

/**
 * ripgrep + sort -u を使ってユニークなIDを抽出
 *
 * @param inputDir 検索対象ディレクトリ
 * @returns ユニークなID文字列の配列
 * @throws CLIツールが利用できない、または実行エラーの場合
 */
export async function extractUniqueIdsWithCli(
  inputDir: string,
): Promise<string[]> {
  // トレーサビリティIDのパターン
  const pattern =
    "([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)-([a-zA-Z0-9]+)#([a-zA-Z0-9]+)";

  // rg + sort -u のパイプライン
  // -o: マッチ部分のみ出力
  // -N: 行番号なし（高速化）
  // -I: バイナリファイルをスキップ
  // -g '*.md': markdownファイルのみ（グロブパターン）
  // sort -u: ソートしてユニーク化
  const shellCmd =
    `rg -oNI '${pattern}' -g '*.md' '${inputDir}' 2>/dev/null | sort -u`;

  const cmd = new Deno.Command("sh", {
    args: ["-c", shellCmd],
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout, stderr, success } = await cmd.output();

  if (!success) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`CLI extraction failed: ${errorText}`);
  }

  const text = new TextDecoder().decode(stdout);
  const ids = text.trim().split("\n").filter((line) => line.length > 0);

  return ids;
}

/**
 * ハイブリッド抽出: データ規模に応じて最適な方法を自動選択
 *
 * 小規模データ（<50ファイル）: ネイティブ実装（プロセス起動オーバーヘッドを回避）
 * 大規模データ（≥50ファイル）: CLI実装（rgの高速性を活用）
 *
 * @param inputDir 検索対象ディレクトリ
 * @param forceNative trueの場合、CLIを使わず常にネイティブ実装を使用
 * @returns ユニークなID文字列の配列
 */
export async function extractUniqueIdsAuto(
  inputDir: string,
  forceNative = false,
): Promise<string[]> {
  // ネイティブ実装を強制する場合
  if (forceNative) {
    return await extractUniqueIdsNative(inputDir);
  }

  // ファイル数をチェック（簡易的にグロブで確認）
  const { scanFiles } = await import("./scanner.ts");
  const files = await scanFiles(inputDir);

  // 閾値: 50ファイル以上でCLI版を使用
  const threshold = 50;

  if (files.length < threshold) {
    // 小規模データ: ネイティブ実装（プロセス起動コストを回避）
    const { extractIds } = await import("./extractor.ts");
    const allIds = await extractIds(files);
    return [...new Set(allIds.map((id) => id.fullId))];
  }

  // 大規模データ: CLI版を試行
  const tools = await checkCliToolsAvailable();

  if (tools.rg && tools.sort) {
    try {
      return await extractUniqueIdsWithCli(inputDir);
    } catch (_error) {
      // フォールバック: エラー時はネイティブ実装を使用
      console.error(
        "CLI extraction failed, falling back to native implementation",
      );
    }
  }

  // フォールバック: ネイティブ実装
  return await extractUniqueIdsNative(inputDir);
}

/**
 * ネイティブ実装でのユニークID抽出（フォールバック用）
 */
async function extractUniqueIdsNative(inputDir: string): Promise<string[]> {
  const { scanFiles } = await import("./scanner.ts");
  const { extractIds } = await import("./extractor.ts");

  const files = await scanFiles(inputDir);
  const allIds = await extractIds(files);

  // ユニーク化
  const uniqueIds = [...new Set(allIds.map((id) => id.fullId))];
  return uniqueIds;
}

/**
 * 使用中の抽出方法を判定
 */
export async function detectExtractionMethod(
  inputDir: string,
): Promise<"cli" | "native"> {
  const tools = await checkCliToolsAvailable();

  if (tools.rg && tools.sort) {
    try {
      // CLIが動作するか確認
      await extractUniqueIdsWithCli(inputDir);
      return "cli";
    } catch {
      return "native";
    }
  }

  return "native";
}
