import { walk } from "jsr:@std/fs@^1.0.8/walk";

/**
 * 指定されたディレクトリの .md ファイルを再帰的にスキャンする
 * @param dirPath スキャン対象のディレクトリパス
 * @returns .md ファイルのパス配列
 */
export async function scanFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  try {
    for await (
      const entry of walk(dirPath, {
        exts: [".md"],
        includeDirs: false,
        followSymlinks: false,
      })
    ) {
      files.push(entry.path);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to scan directory ${dirPath}: ${message}`);
  }

  return files;
}
