/**
 * Represents a traceability ID with parsed components and location information
 *
 * Traceability IDs follow the pattern: `{level}:{scope}:{semantic}-{hash}#{version}`
 *
 * @example
 * ```ts
 * // Example ID: "req:apikey:security-4f7b2e#20251111a"
 * const id: TraceabilityId = {
 *   fullId: "req:apikey:security-4f7b2e#20251111a",
 *   level: "req",
 *   scope: "apikey",
 *   semantic: "security",
 *   hash: "4f7b2e",
 *   version: "20251111a",
 *   filePath: "/path/to/document.md",
 *   lineNumber: 42
 * };
 * ```
 */
export interface TraceabilityId {
  /** The complete ID string as found in the source file */
  fullId: string;
  /** The level component (before first colon) - typically indicates requirement type */
  level: string;
  /** The scope component (between first and second colon) - typically indicates feature area */
  scope: string;
  /** The semantic component (after second colon, before hyphen) - describes the requirement */
  semantic: string;
  /** The hash component (after hyphen, before hash symbol) - unique identifier */
  hash: string;
  /** The version component (after hash symbol) - version or date identifier */
  version: string;
  /** Absolute path to the file where this ID was found */
  filePath: string;
  /** Line number in the file where this ID was found (1-indexed) */
  lineNumber: number;
}

/**
 * Represents a cluster of related traceability IDs
 *
 * @example
 * ```ts
 * const cluster: Cluster = {
 *   id: 1,
 *   items: [id1, id2, id3],
 *   centroid: id1  // Representative ID of this cluster
 * };
 * ```
 */
export interface Cluster {
  /** Unique identifier for this cluster (1-indexed) */
  id: number;
  /** Array of traceability IDs belonging to this cluster */
  items: TraceabilityId[];
  /** Representative ID of the cluster (optional, used by some algorithms) */
  centroid?: TraceabilityId;
}

/**
 * The complete result of a clustering operation
 *
 * Contains all clusters and metadata about the clustering process.
 *
 * @example
 * ```ts
 * const result: ClusteringResult = {
 *   clusters: [cluster1, cluster2, cluster3],
 *   algorithm: "hierarchical",
 *   distanceCalculator: "levenshtein"
 * };
 * ```
 */
export interface ClusteringResult {
  /** Array of clusters produced by the clustering algorithm */
  clusters: Cluster[];
  /** Name of the clustering algorithm used (e.g., "hierarchical", "kmeans", "dbscan") */
  algorithm: string;
  /** Name of the distance calculator used (e.g., "levenshtein", "structural") */
  distanceCalculator: string;
}

/**
 * A single item in similarity search results
 *
 * Contains a traceability ID and its distance score from the search query.
 *
 * @example
 * ```ts
 * const item: SimilarityItem = {
 *   id: myId,
 *   distance: 0.35  // Lower values indicate higher similarity
 * };
 * ```
 */
export interface SimilarityItem {
  /** The traceability ID */
  id: TraceabilityId;
  /** Distance score from the query (lower = more similar) */
  distance: number;
}

/**
 * The complete result of a similarity search operation
 *
 * Contains search results sorted by similarity (most similar first).
 *
 * @example
 * ```ts
 * const result: SimilaritySearchResult = {
 *   query: "security",
 *   items: [
 *     { id: securityId, distance: 0.1 },
 *     { id: encryptionId, distance: 0.3 }
 *   ],
 *   distanceCalculator: "structural"
 * };
 * ```
 */
export interface SimilaritySearchResult {
  /** The search query string used */
  query: string;
  /** Array of results sorted by distance (closest first) */
  items: SimilarityItem[];
  /** Name of the distance calculator used */
  distanceCalculator: string;
}
