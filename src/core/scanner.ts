import { walk } from "@std/fs/walk";
import { fromReadError, TraceabilityError } from "./errors.ts";

/**
 * 既定の走査対象拡張子
 */
export const DEFAULT_EXTENSIONS: readonly string[] = ["md"];

/**
 * 指定されたパス（ディレクトリまたはファイル）から対象ファイルを再帰的にスキャンする
 *
 * - ディレクトリ: 配下の対象拡張子ファイルを再帰的に収集する
 * - ファイル: 明示指定として拡張子に関係なく含める
 *
 * @param paths スキャン対象のパス（単一または複数）
 * @param extensions 対象拡張子（先頭ドットの有無は問わない。既定: md）
 * @returns 対象ファイルのパス配列（重複なし・指定順）
 * @throws TraceabilityError `PathNotFound` | `PathAccessDenied` | `ScanFailed`
 */
export async function scanFiles(
  paths: string | readonly string[],
  extensions: readonly string[] = DEFAULT_EXTENSIONS,
): Promise<string[]> {
  const files = new Set<string>();
  const exts = extensions.map((ext) => ext.startsWith(".") ? ext : `.${ext}`);

  for (const path of typeof paths === "string" ? [paths] : paths) {
    try {
      const info = await Deno.stat(path);
      if (info.isFile) {
        files.add(path);
        continue;
      }
      for await (
        const entry of walk(path, {
          exts,
          includeDirs: false,
          followSymlinks: false,
        })
      ) {
        files.add(entry.path);
      }
    } catch (error) {
      throw fromReadError(error, path, "ScanFailed");
    }
  }

  return [...files];
}

/**
 * `--ext` オプションの値（カンマ区切り）を拡張子配列に変換する
 * @param value 例: "md,rs,ts" / ".md, .ts"。未指定なら既定値
 * @returns 拡張子配列（先頭ドットなし・重複なし）
 * @throws TraceabilityError `InvalidOptionValue`
 */
export function parseExtensions(value?: string): string[] {
  if (value === undefined) return [...DEFAULT_EXTENSIONS];
  const exts = value
    .split(",")
    .map((ext) => ext.trim().replace(/^\.+/, ""))
    .filter((ext) => ext.length > 0);
  if (exts.length === 0) {
    throw new TraceabilityError({
      kind: "InvalidOptionValue",
      option: "--ext",
      value,
      expected: "comma-separated extensions such as md,rs,ts",
    });
  }
  return [...new Set(exts)];
}
