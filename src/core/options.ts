/**
 * Option vocabularies of every mode, and parsers from raw CLI strings.
 *
 * Each accepted value set is declared once as a `const` tuple; its type is derived
 * from it, so help text, validation and `switch` exhaustiveness share one source.
 * Parsers throw `InvalidOptionValue` instead of passing through unchecked strings or `NaN`.
 *
 * @module
 */

import { TraceabilityError } from "./errors.ts";
import { compileHashRule, type HashRule } from "./id.ts";

/** Distance calculators */
export const DISTANCE_NAMES = ["levenshtein", "jaro-winkler", "cosine", "structural"] as const;
/** Distance calculator name */
export type DistanceName = typeof DISTANCE_NAMES[number];

/** Clustering algorithms */
export const ALGORITHM_NAMES = ["hierarchical", "kmeans", "dbscan"] as const;
/** Clustering algorithm name */
export type AlgorithmName = typeof ALGORITHM_NAMES[number];

/** Output formats of cluster mode */
export const CLUSTER_FORMATS = ["simple", "simple-clustered", "json", "markdown", "csv"] as const;
/** Output format of cluster mode */
export type ClusterFormat = typeof CLUSTER_FORMATS[number];

/** Output formats of search mode */
export const SEARCH_FORMATS = ["simple", "json", "markdown", "csv"] as const;
/** Output format of search mode */
export type SearchFormat = typeof SEARCH_FORMATS[number];

/** Output formats of extract mode */
export const EXTRACT_FORMATS = ["markdown", "json", "simple"] as const;
/** Output format of extract mode */
export type ExtractFormat = typeof EXTRACT_FORMATS[number];

/** Output formats of list mode */
export const LIST_FORMATS = ["json", "simple", "csv", "locations", "count"] as const;
/** Output format of list mode */
export type ListFormat = typeof LIST_FORMATS[number];

/** Output formats of relations mode */
export const RELATIONS_FORMATS = ["simple", "json", "tsv"] as const;
/** Output format of relations mode */
export type RelationsFormat = typeof RELATIONS_FORMATS[number];

/** Directions of relations mode, seen from the requested IDs */
export const RELATION_DIRECTIONS = ["in", "out", "both"] as const;
/**
 * Direction seen from the requested IDs:
 * `in` relations pointing at them, `out` relations they declare, `both` either
 */
export type RelationDirection = typeof RELATION_DIRECTIONS[number];
/** Direction used when none is given */
export const DEFAULT_RELATION_DIRECTION: RelationDirection = "both";

/** Sort keys of list mode */
export const SORT_KEYS = ["fullId", "scope", "level", "count"] as const;
/** Sort key of list mode */
export type SortKey = typeof SORT_KEYS[number];

/** Version resolution modes for IDs given without a version */
export const VERSION_MATCH_MODES = ["latest", "all"] as const;
/**
 * Version resolution mode for IDs given without a version:
 * `latest` matches only the newest version, `all` matches every version
 */
export type VersionMatchMode = typeof VERSION_MATCH_MODES[number];
/** Version resolution mode used when none is given */
export const DEFAULT_VERSION_MATCH: VersionMatchMode = "latest";
/** What each version resolution mode matches */
export const VERSION_MATCH_DESCRIPTIONS: { readonly [M in VersionMatchMode]: string } = {
  latest: "newest version only",
  all: "every version, newest first",
};

/** How frontmatter is treated when extracting IDs */
export const FRONTMATTER_POLICIES = ["include", "skip"] as const;
/**
 * How frontmatter is treated when extracting IDs:
 * `include` extracts from the whole file, `skip` only from the body after the frontmatter
 */
export type FrontmatterPolicy = typeof FRONTMATTER_POLICIES[number];
/** Frontmatter policy used when none is given */
export const DEFAULT_FRONTMATTER: FrontmatterPolicy = "include";

/** How IDs without a hash are treated */
export const HASH_POLICIES = ["any", "required"] as const;
/**
 * How IDs without a hash are treated:
 * `any` keeps them, `required` excludes them from the extracted IDs
 */
export type HashPolicy = typeof HASH_POLICIES[number];
/** Hash policy used when none is given */
export const DEFAULT_HASH_POLICY: HashPolicy = "any";

/** Node coloring modes of graph mode */
export const COLOR_MODES = ["cluster", "scope", "level"] as const;
/** Node coloring mode of graph mode */
export type ColorMode = typeof COLOR_MODES[number];

/** Layouts of graph mode */
export const LAYOUTS = ["force", "mds"] as const;
/** Layout of graph mode */
export type Layout = typeof LAYOUTS[number];

/** Parameters of the clustering algorithms */
export interface ClusteringOptions {
  /** Hierarchical: merge threshold */
  threshold: number;
  /** K-Means: number of clusters (0 = auto) */
  k: number;
  /** DBSCAN: neighborhood radius */
  epsilon: number;
  /** DBSCAN: minimum neighbors */
  minPoints: number;
}

/**
 * Parse a value that must be one of `allowed`
 *
 * @throws TraceabilityError `InvalidOptionValue`
 */
export function parseChoice<const T extends readonly string[]>(
  option: string,
  value: unknown,
  allowed: T,
): T[number] {
  const text = String(value);
  if ((allowed as readonly string[]).includes(text)) return text as T[number];
  throw new TraceabilityError({
    kind: "InvalidOptionValue",
    option,
    value: text,
    expected: `one of ${allowed.join(", ")}`,
  });
}

/**
 * Parse an integer `>= min`
 *
 * @throws TraceabilityError `InvalidOptionValue`
 */
export function parseInteger(option: string, value: unknown, min = 0): number {
  const text = String(value).trim();
  const n = Number(text);
  if (text !== "" && Number.isInteger(n) && n >= min) return n;
  throw new TraceabilityError({
    kind: "InvalidOptionValue",
    option,
    value: text,
    expected: `an integer >= ${min}`,
  });
}

/**
 * Parse a finite number `>= min`
 *
 * @throws TraceabilityError `InvalidOptionValue`
 */
export function parseNumber(option: string, value: unknown, min = 0): number {
  const text = String(value).trim();
  const n = Number(text);
  if (text !== "" && Number.isFinite(n) && n >= min) return n;
  throw new TraceabilityError({
    kind: "InvalidOptionValue",
    option,
    value: text,
    expected: `a number >= ${min}`,
  });
}

/**
 * Parse a hash pattern (regular expression matched against the whole last segment)
 *
 * @throws TraceabilityError `InvalidOptionValue`
 */
export function parseHashPattern(option: string, value: unknown): HashRule {
  const text = String(value);
  const rule = text === "" ? null : compileHashRule(text);
  if (rule) return rule;
  throw new TraceabilityError({
    kind: "InvalidOptionValue",
    option,
    value: text,
    expected: "a non-empty regular expression",
  });
}
