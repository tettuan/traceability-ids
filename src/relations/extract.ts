/**
 * Extraction of declared relations (`derived_from` / `trace_to`) from documents.
 *
 * Relations are read from YAML regions:
 *
 * - the frontmatter, unless the frontmatter policy is `skip`,
 * - fenced ` ```yaml ` / ` ```yml ` (or `~~~`) blocks in the body.
 *
 * In a region, every mapping holding `derived_from` or `trace_to` declares relations.
 * Their source is the mapping's own `id`: an ID (`id: req:a:b-abc#v1`) or a nested
 * `full` (`id:` / `full: req:a:b-abc#v1`). Without an own ID the relations are not drawn
 * and `SourceMissing` is reported; a file never stands in for an ID.
 *
 * A valid YAML region is read by the YAML parser, so every YAML form counts
 * (see ./yaml.ts). A region that is not valid YAML is read line by line from its
 * indentation (see ./lines.ts), so its relations are not lost; when it declares any,
 * `InvalidYaml` is reported.
 *
 * @module
 */

import { readText } from "../core/io.ts";
import { DEFAULT_FRONTMATTER, type FrontmatterPolicy } from "../core/options.ts";
import type { ExtractedRelations } from "../core/relations.ts";
import { readRelationsByLines } from "./lines.ts";
import { yamlRegions } from "./region.ts";
import { readRelationsByYaml } from "./yaml.ts";

export { stripYamlComment, type YamlRegion, yamlRegions } from "./region.ts";

/**
 * Extract declared relations from a text (pure)
 *
 * @param content File content
 * @param filePath Path recorded in positions
 * @param frontmatter Whether relations in the frontmatter are read (default: include)
 */
export function extractRelationsFromText(
  content: string,
  filePath: string,
  frontmatter: FrontmatterPolicy = DEFAULT_FRONTMATTER,
): ExtractedRelations {
  const result: ExtractedRelations = { declarations: [], referenceLines: [], issues: [] };
  for (const region of yamlRegions(content, frontmatter)) {
    const reading = readRelationsByYaml(region, filePath);
    const found = reading.kind === "read"
      ? reading.relations
      : readRelationsByLines(region, filePath);
    const declares = found.declarations.length > 0 || found.issues.length > 0;
    if (reading.kind === "invalid" && declares) {
      result.issues.push({
        kind: "InvalidYaml",
        reason: reading.reason,
        filePath,
        lineNumber: reading.lineNumber,
      });
    }
    result.declarations.push(...found.declarations);
    result.referenceLines.push(...found.referenceLines);
    result.issues.push(...found.issues);
  }
  return result;
}

/**
 * Extract declared relations from files
 *
 * @throws TraceabilityError `PathNotFound` | `PathAccessDenied` | `FileReadFailed`
 */
export async function extractRelations(
  filePaths: readonly string[],
  frontmatter: FrontmatterPolicy = DEFAULT_FRONTMATTER,
): Promise<ExtractedRelations> {
  const result: ExtractedRelations = { declarations: [], referenceLines: [], issues: [] };
  for (const filePath of filePaths) {
    const found = extractRelationsFromText(await readText(filePath), filePath, frontmatter);
    result.declarations.push(...found.declarations);
    result.referenceLines.push(...found.referenceLines);
    result.issues.push(...found.issues);
  }
  return result;
}
