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

/**
 * Context extraction request parameters
 *
 * @example
 * ```ts
 * const request: ContextExtractionRequest = {
 *   ids: ["req:apikey:security-4f7b2e#20251111a"],
 *   before: 3,
 *   after: 10
 * };
 * ```
 */
export interface ContextExtractionRequest {
  /** IDs to extract context for */
  ids: string[];
  /** Number of lines to include before the target line (max: 50) */
  before: number;
  /** Number of lines to include after the target line (max: 50) */
  after: number;
}

/**
 * Context information for a single location
 *
 * @example
 * ```ts
 * const location: LocationContext = {
 *   filePath: "/path/to/file.md",
 *   lineNumber: 42,
 *   targetLine: "[req:apikey:security-4f7b2e#20251111a] Security requirement",
 *   beforeLines: [{ lineNumber: 41, content: "## Requirements" }],
 *   afterLines: [{ lineNumber: 43, content: "API keys must be encrypted" }]
 * };
 * ```
 */
export interface LocationContext {
  /** Absolute path to the file */
  filePath: string;
  /** Line number where the ID was found (1-indexed) */
  lineNumber: number;
  /** Content of the target line */
  targetLine: string;
  /** Lines before the target (oldest to newest) */
  beforeLines: { lineNumber: number; content: string }[];
  /** Lines after the target (newest to oldest) */
  afterLines: { lineNumber: number; content: string }[];
}

/**
 * Extracted context for a single ID
 *
 * @example
 * ```ts
 * const context: ExtractedContext = {
 *   id: "req:apikey:security-4f7b2e#20251111a",
 *   locations: [location1, location2]
 * };
 * ```
 */
export interface ExtractedContext {
  /** The ID that was searched for */
  id: string;
  /** All locations where this ID was found */
  locations: LocationContext[];
}

/**
 * Complete result of context extraction
 *
 * @example
 * ```ts
 * const result: ContextExtractionResult = {
 *   request: { ids: ["req:apikey:security-4f7b2e#20251111a"], before: 3, after: 10 },
 *   contexts: [extractedContext],
 *   notFound: []
 * };
 * ```
 */
export interface ContextExtractionResult {
  /** The original request parameters */
  request: ContextExtractionRequest;
  /** Successfully extracted contexts */
  contexts: ExtractedContext[];
  /** IDs that were not found in any file */
  notFound: string[];
}

// ============================================================================
// List Mode Types
// ============================================================================

/**
 * A single occurrence of a traceability ID in a file
 *
 * @example
 * ```ts
 * const occurrence: IdOccurrence = {
 *   filePath: "/path/to/file.md",
 *   lineNumber: 42
 * };
 * ```
 */
export interface IdOccurrence {
  /** Absolute path to the file where this ID was found */
  filePath: string;
  /** Line number in the file (1-indexed) */
  lineNumber: number;
}

/**
 * A single entry in the ID index, grouping all occurrences of one ID
 *
 * @example
 * ```ts
 * const entry: IdIndexEntry = {
 *   fullId: "req:apikey:security-4f7b2e#20251111a",
 *   level: "req",
 *   scope: "apikey",
 *   semantic: "security",
 *   hash: "4f7b2e",
 *   version: "20251111a",
 *   occurrences: [
 *     { filePath: "/docs/req.md", lineNumber: 10 },
 *     { filePath: "/docs/spec.md", lineNumber: 25 }
 *   ]
 * };
 * ```
 */
export interface IdIndexEntry {
  /** The complete ID string */
  fullId: string;
  /** The level component */
  level: string;
  /** The scope component */
  scope: string;
  /** The semantic component */
  semantic: string;
  /** The hash component */
  hash: string;
  /** The version component */
  version: string;
  /** All locations where this ID appears */
  occurrences: IdOccurrence[];
}

/**
 * Complete index of all traceability IDs with occurrence information
 *
 * @example
 * ```ts
 * const index: IdIndex = {
 *   totalUniqueIds: 858,
 *   totalOccurrences: 3024,
 *   entries: [entry1, entry2, ...]
 * };
 * ```
 */
export interface IdIndex {
  /** Number of unique IDs */
  totalUniqueIds: number;
  /** Total number of occurrences across all files */
  totalOccurrences: number;
  /** Entries grouped by unique fullId */
  entries: IdIndexEntry[];
}
