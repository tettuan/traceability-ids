import type {
  ContextExtractionRequest,
  ContextExtractionResult,
  ExtractedContext,
  LocationContext,
  TraceabilityId,
} from "../core/types.ts";
import { readText } from "../core/io.ts";
import { resolveTargetId } from "./resolver.ts";

// Constants for constraints
const MAX_LINES = 50;
const MAX_LINE_LENGTH = 300;

/**
 * Extract context for specified IDs
 *
 * @param request Extraction request with IDs and line ranges
 * @param ids All extracted traceability IDs from files
 * @returns Extraction result with contexts and not-found IDs
 *
 * @example
 * ```ts
 * const request = {
 *   ids: ["req:apikey:security-4f7b2e#20251111a"],
 *   before: 3,
 *   after: 10
 * };
 * const result = await extractContext(request, allIds);
 * ```
 */
export async function extractContext(
  request: ContextExtractionRequest,
  ids: TraceabilityId[],
): Promise<ContextExtractionResult> {
  const contexts: ExtractedContext[] = [];
  const notFound: string[] = [];

  const mode = request.versions ?? "latest";

  // Process each target ID
  for (const targetId of request.ids) {
    const groups = resolveTargetId(targetId, ids, mode);

    if (groups.length === 0) {
      notFound.push(targetId);
      continue;
    }

    for (const group of groups) {
      // Extract context for each location
      const locations: LocationContext[] = [];
      for (const matched of group.matches) {
        const context = await extractLocationContext(
          matched.filePath,
          matched.lineNumber,
          request.before,
          request.after,
        );
        locations.push(context);
      }

      const extracted: ExtractedContext = { id: group.fullId, locations };
      if (group.fullId !== targetId) {
        extracted.query = targetId;
      }
      contexts.push(extracted);
    }
  }

  return {
    request,
    contexts,
    notFound,
  };
}

/**
 * Extract context from a specific file location
 *
 * @throws TraceabilityError `PathNotFound` | `PathAccessDenied` | `FileReadFailed`
 */
async function extractLocationContext(
  filePath: string,
  lineNumber: number,
  before: number,
  after: number,
): Promise<LocationContext> {
  const lines = (await readText(filePath)).split("\n");
  return buildLocationContext(lines, filePath, lineNumber, before, after);
}

/**
 * Build the context of a line from the lines of its file (pure)
 *
 * @param lines All lines of the file
 * @param filePath Path recorded in the result
 * @param lineNumber Target line number (1-indexed)
 * @param before Number of lines before (max: 50)
 * @param after Number of lines after (max: 50)
 * @returns Location context with before/after lines
 */
export function buildLocationContext(
  lines: readonly string[],
  filePath: string,
  lineNumber: number,
  before: number,
  after: number,
): LocationContext {
  // Apply constraints
  before = clampLines(before);
  after = clampLines(after);

  // Convert line number to array index (1-indexed → 0-indexed).
  // A line outside the file (e.g. the file changed after extraction) yields an empty target.
  const targetIndex = lineNumber - 1;
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= lines.length) {
    return { filePath, lineNumber, targetLine: "", beforeLines: [], afterLines: [] };
  }

  // Calculate range (with boundary checks)
  const startIndex = Math.max(0, targetIndex - before);
  const endIndex = Math.min(lines.length - 1, targetIndex + after);

  const beforeLines = [];
  for (let i = startIndex; i < targetIndex; i++) {
    beforeLines.push({ lineNumber: i + 1, content: truncateLine(lines[i], MAX_LINE_LENGTH) });
  }

  const afterLines = [];
  for (let i = targetIndex + 1; i <= endIndex; i++) {
    afterLines.push({ lineNumber: i + 1, content: truncateLine(lines[i], MAX_LINE_LENGTH) });
  }

  return {
    filePath,
    lineNumber,
    targetLine: truncateLine(lines[targetIndex], MAX_LINE_LENGTH),
    beforeLines: removeConsecutiveEmptyLines(beforeLines),
    afterLines: removeConsecutiveEmptyLines(afterLines),
  };
}

/**
 * Clamp a line count to 0..MAX_LINES (non-finite → 0)
 */
function clampLines(count: number): number {
  return Number.isFinite(count) ? Math.min(Math.max(0, Math.floor(count)), MAX_LINES) : 0;
}

/**
 * Truncate line to maximum length (multibyte-aware)
 *
 * @param line Original line content
 * @param maxLength Maximum number of characters
 * @returns Truncated line with "..." suffix if needed
 */
function truncateLine(line: string, maxLength: number): string {
  if (line.length <= maxLength) {
    return line;
  }
  return line.substring(0, maxLength) + "...";
}

/**
 * Remove consecutive empty lines (keep only one)
 *
 * @param lines Array of line objects
 * @returns Array with consecutive empty lines removed
 */
function removeConsecutiveEmptyLines(
  lines: { lineNumber: number; content: string }[],
): { lineNumber: number; content: string }[] {
  const result: { lineNumber: number; content: string }[] = [];
  let previousWasEmpty = false;

  for (const line of lines) {
    const isEmpty = line.content.trim() === "";

    if (isEmpty) {
      if (!previousWasEmpty) {
        result.push(line);
        previousWasEmpty = true;
      }
      // Skip consecutive empty lines
    } else {
      result.push(line);
      previousWasEmpty = false;
    }
  }

  return result;
}
