/**
 * Traceability ID grammar: `{level}:{scope}:{semantic}[-{hash}][#{version}]`.
 *
 * The single source of the ID pattern and of the notions derived from it
 * (hash form, unique key, versioned / versionless, version order).
 *
 * An ID is found where `{level}:{scope}:{a}-{b}` is written. Its last hyphenated segment
 * `{b}` is the hash only when it has the hash form ({@link HashRule}); otherwise the ID
 * has no hash and `{a}-{b}` is its semantic (`req:auth:login-flow` → semantic `login-flow`).
 * A semantic without a hyphen and without a hash (`req:auth:login`) is not an ID.
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
  /** Semantic (after the second colon, before the hash; everything when there is no hash) */
  semantic: string;
  /** Hash (after the last hyphen, in hash form); empty string when the ID has no hash */
  hash: string;
  /** Version (after `#`); empty string when written without a version */
  version: string;
}

/** An ID without version: `{level}:{scope}:{semantic}[-{hash}]` */
export type UniqueKey = string;

declare const hashRuleBrand: unique symbol;
/** Whole-string test of the hash form; made only by {@link compileHashRule} */
export type HashRule = RegExp & { readonly [hashRuleBrand]: true };

/**
 * Default hash form: 6 lowercase letters or digits, at least one digit
 * (`1a2b3c`; not English words such as `layout`)
 */
export const DEFAULT_HASH_PATTERN = "(?=[a-z0-9]*[0-9])[a-z0-9]{6}";

/**
 * Hash rule matching the whole segment against `pattern`
 *
 * @returns the rule, or `null` when `pattern` is not a valid regular expression
 */
export function compileHashRule(pattern: string): HashRule | null {
  try {
    return new RegExp(`^(?:${pattern})$`) as HashRule;
  } catch {
    return null;
  }
}

/** Hash rule of {@link DEFAULT_HASH_PATTERN} */
export const DEFAULT_HASH_RULE: HashRule = compileHashRule(DEFAULT_HASH_PATTERN) as HashRule;

/**
 * Whether an ID has a hash
 */
export function hasHash(id: IdComponents): boolean {
  return id.hash !== "";
}

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

function toComponents(match: RegExpMatchArray, rule: HashRule): IdComponents {
  const [fullId, level, scope, head, tail, version] = match;
  const [semantic, hash] = rule.test(tail) ? [head, tail] : [`${head}-${tail}`, ""];
  return { fullId, level, scope, semantic, hash, version: version ?? "" };
}

/**
 * Parse a whole string as an ID, splitting the hash by `rule`
 *
 * @returns components, or `null` when the string is not an ID
 */
export function parseId(text: string, rule: HashRule = DEFAULT_HASH_RULE): IdComponents | null {
  const match = text.match(EXACT_PATTERN);
  return match ? toComponents(match, rule) : null;
}

/**
 * Find every ID in a line of text, in order of appearance, splitting the hash by `rule`
 */
export function findIds(line: string, rule: HashRule = DEFAULT_HASH_RULE): IdComponents[] {
  return [...line.matchAll(idSearchPattern())].map((match) => toComponents(match, rule));
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
 * Version of an ID string (empty string when written without a version)
 */
export function versionOf(fullId: string): string {
  const index = fullId.indexOf("#");
  return index === -1 ? "" : fullId.substring(index + 1);
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
