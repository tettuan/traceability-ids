/**
 * Load IDs from command line argument or file
 *
 * @param source Source string (either space-separated IDs or file path)
 * @param isFile Whether the source is a file path
 * @returns Array of ID strings
 *
 * @example
 * ```ts
 * // From command line
 * const ids = await loadIds("id1 id2 id3", false);
 *
 * // From file
 * const ids = await loadIds("./ids.txt", true);
 * ```
 */
export async function loadIds(
  source: string,
  isFile: boolean,
): Promise<string[]> {
  if (isFile) {
    // Read from file
    const content = await Deno.readTextFile(source);
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } else {
    // Split by whitespace
    return source.split(/\s+/).filter((id) => id.length > 0);
  }
}
