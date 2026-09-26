/**
 * Traceability ID grammar: `{level}:{scope}:{semantic}-{hash}[#{version}]`.
 *
 * The single source of the ID pattern and of the notions derived from it
 * (unique key, versioned / versionless, version order).
 *
 * @module
 */

/** Components of a traceability ID */
export interface IdComponents {
  /** The complete ID string as written */
  fullId: string;
  /** Level (before the first colon), e.g. `req` */
  level: string;
  /** Scope (between the first and second colon), e.g. `apikey` */
  scope: string;
  /** Semantic (after the second colon, before the last hyphen) */
  semantic: string;
  /** Hash (after the last hyphen) */
  hash: string;
  /** Version (after `#`); empty string when written without a version */
  version: string;
}

/** An ID without version: `{level}:{scope}:{semantic}-{hash}` */
export type UniqueKey = string;

const BODY = "([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)-([a-zA-Z0-9]+)";
const VERSION = "#([a-zA-Z0-9]+)";

/**
 * Pattern to find IDs in text (global). A versionless ID counts only when the hash
 * is not followed by `[A-Za-z0-9_#-]`, so a bare trailing `#` or a longer word is not an ID.
 */
export function idSearchPattern(): RegExp {
  return new RegExp(`${BODY}(?:${VERSION}|(?![a-zA-Z0-9_#-]))`, "g");
}

const EXACT_PATTERN = new RegExp(`^${BODY}(?:${VERSION})?$`);

function toComponents(match: RegExpMatchArray): IdComponents {
  const [fullId, level, scope, semantic, hash, version] = match;
  return { fullId, level, scope, semantic, hash, version: version ?? "" };
}

/**
 * Parse a whole string as an ID
 *
 * @returns components, or `null` when the string is not an ID
 */
export function parseId(text: string): IdComponents | null {
  const match = text.match(EXACT_PATTERN);
  return match ? toComponents(match) : null;
}

/**
 * Find every ID in a line of text, in order of appearance
 */
export function findIds(line: string): IdComponents[] {
  return [...line.matchAll(idSearchPattern())].map(toComponents);
}

/**
 * Whether an ID string carries a version
 */
export function hasVersion(fullId: string): boolean {
  return fullId.includes("#");
}

/**
 * Unique key (ID without version) of an ID string
 */
export function uniqueKeyOf(fullId: string): UniqueKey {
  const index = fullId.indexOf("#");
  return index === -1 ? fullId : fullId.substring(0, index);
}

/**
 * Join a unique key and a version (empty version gives the unique key itself)
 */
export function withVersion(key: UniqueKey, version: string): string {
  return version === "" ? key : `${key}#${version}`;
}

/**
 * Order versions newest first, treating digit runs numerically
 * (e.g. `20260810` > `20251111b` > `20251111a`, `v10` > `v2`)
 */
export function compareVersionsDesc(a: string, b: string): number {
  return b.localeCompare(a, "en", { numeric: true });
}
