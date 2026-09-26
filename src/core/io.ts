/**
 * File I/O with typed errors.
 *
 * All reads and writes of this tool go through here, so every I/O failure surfaces
 * as a {@link TraceabilityError} of a specific kind.
 *
 * @module
 */

import { causeOf, fromReadError, TraceabilityError } from "./errors.ts";

/**
 * Read a text file
 *
 * @throws TraceabilityError `PathNotFound` | `PathAccessDenied` | `FileReadFailed`
 */
export async function readText(path: string): Promise<string> {
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    throw fromReadError(error, path, "FileReadFailed");
  }
}

/**
 * Write a text file, creating its parent directory when needed
 *
 * @throws TraceabilityError `FileWriteFailed`
 */
export async function writeText(path: string, content: string): Promise<void> {
  try {
    const dir = path.substring(0, path.lastIndexOf("/"));
    if (dir) await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(path, content);
  } catch (error) {
    throw new TraceabilityError({ kind: "FileWriteFailed", path, cause: causeOf(error) });
  }
}
