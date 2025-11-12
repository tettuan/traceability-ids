import type {
  ContextExtractionRequest,
  ContextExtractionResult,
  ExtractedContext,
  LocationContext,
  TraceabilityId,
} from "../core/types.ts";

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

  // Process each target ID
  for (const targetId of request.ids) {
    // Find all matching IDs
    const matchedIds = ids.filter((id) => id.fullId === targetId);

    if (matchedIds.length === 0) {
      notFound.push(targetId);
      continue;
    }

    // Extract context for each location
    const locations: LocationContext[] = [];
    for (const matched of matchedIds) {
      const context = await extractLocationContext(
        matched.filePath,
        matched.lineNumber,
        request.before,
        request.after,
      );
      locations.push(context);
    }

    contexts.push({
      id: targetId,
      locations,
    });
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
 * @param filePath Absolute path to the file
 * @param lineNumber Target line number (1-indexed)
 * @param before Number of lines before (max: 50)
 * @param after Number of lines after (max: 50)
 * @returns Location context with before/after lines
 */
async function extractLocationContext(
  filePath: string,
  lineNumber: number,
  before: number,
  after: number,
): Promise<LocationContext> {
  // Apply constraints
  before = Math.min(before, MAX_LINES);
  after = Math.min(after, MAX_LINES);

  // Read entire file
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");

  // Convert line number to array index (1-indexed → 0-indexed)
  const targetIndex = lineNumber - 1;

  // Calculate range (with boundary checks)
  const startIndex = Math.max(0, targetIndex - before);
  const endIndex = Math.min(lines.length - 1, targetIndex + after);

  // Extract before lines
  const beforeLines = [];
  for (let i = startIndex; i < targetIndex; i++) {
    beforeLines.push({
      lineNumber: i + 1,
      content: truncateLine(lines[i], MAX_LINE_LENGTH),
    });
  }

  // Target line
  const targetLine = truncateLine(lines[targetIndex], MAX_LINE_LENGTH);

  // Extract after lines
  const afterLines = [];
  for (let i = targetIndex + 1; i <= endIndex; i++) {
    afterLines.push({
      lineNumber: i + 1,
      content: truncateLine(lines[i], MAX_LINE_LENGTH),
    });
  }

  // Remove consecutive empty lines
  const cleanedBeforeLines = removeConsecutiveEmptyLines(beforeLines);
  const cleanedAfterLines = removeConsecutiveEmptyLines(afterLines);

  return {
    filePath,
    lineNumber,
    targetLine,
    beforeLines: cleanedBeforeLines,
    afterLines: cleanedAfterLines,
  };
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
