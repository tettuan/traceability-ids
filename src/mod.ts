/**
 * Traceability IDs - A library for extracting and clustering traceability IDs from markdown files
 *
 * This library provides functionality to:
 * - Extract traceability IDs from markdown files using pattern matching
 * - Cluster IDs based on similarity using various algorithms
 * - Search for similar IDs based on a query string
 * - Format results in multiple output formats
 *
 * @example
 * ```ts
 * import {
 *   scanFiles,
 *   extractIds,
 *   LevenshteinDistance,
 *   HierarchicalClustering,
 *   createDistanceMatrix,
 * } from "@scope/traceability-ids";
 *
 * // Scan markdown files
 * const files = await scanFiles("./docs");
 *
 * // Extract traceability IDs
 * const ids = await extractIds(files);
 *
 * // Create distance matrix
 * const calculator = new LevenshteinDistance();
 * const matrix = createDistanceMatrix(ids.map(id => id.fullId), calculator);
 *
 * // Cluster IDs
 * const algorithm = new HierarchicalClustering(10);
 * const clusters = algorithm.cluster(ids, matrix);
 * ```
 *
 * @module
 */

// ============================================================================
// Core Types
// ============================================================================

export type {
  /**
   * Represents a parsed traceability ID with its components and location information
   */
  TraceabilityId,
  /**
   * Represents a cluster of related traceability IDs
   */
  Cluster,
  /**
   * The result of a clustering operation
   */
  ClusteringResult,
  /**
   * A single item in similarity search results
   */
  SimilarityItem,
  /**
   * The result of a similarity search operation
   */
  SimilaritySearchResult,
} from "./core/types.ts";

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Recursively scans a directory for markdown files
 *
 * @param dirPath - The directory path to scan
 * @returns Array of absolute file paths to .md files
 *
 * @example
 * ```ts
 * const files = await scanFiles("./docs");
 * console.log(`Found ${files.length} markdown files`);
 * ```
 */
export { scanFiles } from "./core/scanner.ts";

/**
 * Extracts traceability IDs from an array of file paths
 *
 * @param files - Array of file paths to extract IDs from
 * @returns Array of parsed traceability IDs with location information
 *
 * @example
 * ```ts
 * const files = await scanFiles("./docs");
 * const ids = await extractIds(files);
 * console.log(`Extracted ${ids.length} IDs`);
 * ```
 */
export { extractIds } from "./core/extractor.ts";

// ============================================================================
// Distance Calculators
// ============================================================================

export type {
  /**
   * Interface for implementing custom distance calculation algorithms
   */
  DistanceCalculator,
} from "./distance/calculator.ts";

/**
 * Creates a distance matrix from an array of strings using a distance calculator
 *
 * @param items - Array of strings to calculate distances between
 * @param calculator - Distance calculator to use
 * @returns 2D array representing distances between all pairs of items
 *
 * @example
 * ```ts
 * const calculator = new LevenshteinDistance();
 * const matrix = createDistanceMatrix(["abc", "abd", "xyz"], calculator);
 * // matrix[0][1] contains distance between "abc" and "abd"
 * ```
 */
export { createDistanceMatrix } from "./distance/calculator.ts";

/**
 * Levenshtein distance calculator (edit distance)
 *
 * Calculates the minimum number of single-character edits (insertions, deletions, or substitutions)
 * required to change one string into another.
 *
 * @example
 * ```ts
 * const calc = new LevenshteinDistance();
 * const distance = calc.calculate("kitten", "sitting"); // Returns 3
 * ```
 */
export { LevenshteinDistance } from "./distance/levenshtein.ts";

/**
 * Jaro-Winkler distance calculator
 *
 * Calculates string similarity with emphasis on matching prefixes.
 * Returns a value between 0 (identical) and 1 (completely different).
 *
 * @example
 * ```ts
 * const calc = new JaroWinklerDistance();
 * const distance = calc.calculate("martha", "marhta"); // Returns ~0.04
 * ```
 */
export { JaroWinklerDistance } from "./distance/jaro_winkler.ts";

/**
 * Cosine distance calculator based on character n-grams
 *
 * Treats strings as vectors of n-grams and calculates the cosine distance between them.
 * Useful for finding strings with similar substrings.
 *
 * @example
 * ```ts
 * const calc = new CosineDistance(2); // Use bigrams
 * const distance = calc.calculate("hello", "hallo");
 * ```
 */
export { CosineDistance } from "./distance/cosine.ts";

/**
 * Structural distance calculator for traceability IDs
 *
 * Parses IDs into components (level, scope, semantic, hash, version) and
 * calculates weighted distance based on each component.
 *
 * Recommended for grouping IDs by scope or other structural properties.
 *
 * @example
 * ```ts
 * const calc = new StructuralDistance();
 * const distance = calc.calculate(
 *   "req:apikey:security-4f7b2e#20251111a",
 *   "req:apikey:encryption-6d3a9c#20251111a"
 * );
 * ```
 */
export { StructuralDistance } from "./distance/structural.ts";

// ============================================================================
// Clustering Algorithms
// ============================================================================

export type {
  /**
   * Interface for implementing custom clustering algorithms
   */
  ClusteringAlgorithm,
} from "./clustering/algorithm.ts";

/**
 * Hierarchical clustering algorithm (agglomerative)
 *
 * Starts with each item as its own cluster and iteratively merges
 * the closest clusters until a threshold is reached.
 *
 * @example
 * ```ts
 * const algorithm = new HierarchicalClustering(10); // threshold = 10
 * const clusters = algorithm.cluster(ids, distanceMatrix);
 * ```
 */
export { HierarchicalClustering } from "./clustering/hierarchical.ts";

/**
 * K-Means clustering algorithm
 *
 * Partitions items into K clusters by iteratively assigning items
 * to the nearest centroid and updating centroids.
 *
 * @example
 * ```ts
 * const algorithm = new KMeansClustering(5); // 5 clusters
 * const clusters = algorithm.cluster(ids, distanceMatrix);
 * ```
 */
export { KMeansClustering } from "./clustering/kmeans.ts";

/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 *
 * Groups together items that are closely packed, marking items
 * in low-density regions as noise.
 *
 * @example
 * ```ts
 * const algorithm = new DBSCANClustering(0.3, 2); // epsilon=0.3, minPoints=2
 * const clusters = algorithm.cluster(ids, distanceMatrix);
 * ```
 */
export { DBSCANClustering } from "./clustering/dbscan.ts";

// ============================================================================
// Formatters
// ============================================================================

/**
 * Formats clustering results as a simple list of unique IDs
 *
 * @param result - Clustering result to format
 * @returns String with one ID per line
 */
export { formatAsSimple } from "./formatter/formatter.ts";

/**
 * Formats clustering results with cluster groupings
 *
 * @param result - Clustering result to format
 * @returns String with IDs grouped by cluster
 */
export { formatAsSimpleWithClusters } from "./formatter/formatter.ts";

/**
 * Formats clustering results as JSON
 *
 * @param result - Clustering result to format
 * @returns JSON string
 */
export { formatAsJson } from "./formatter/formatter.ts";

/**
 * Formats clustering results as Markdown
 *
 * @param result - Clustering result to format
 * @returns Markdown-formatted string
 */
export { formatAsMarkdown } from "./formatter/formatter.ts";

/**
 * Formats clustering results as CSV
 *
 * @param result - Clustering result to format
 * @returns CSV-formatted string
 */
export { formatAsCsv } from "./formatter/formatter.ts";

/**
 * Formats clustering results in the specified format
 *
 * @param result - Clustering result to format
 * @param format - Output format (simple, simple-clustered, json, markdown, csv)
 * @returns Formatted string
 */
export { formatResult } from "./formatter/formatter.ts";

/**
 * Formats similarity search results in the specified format
 *
 * @param result - Similarity search result to format
 * @param format - Output format (simple, json, markdown, csv)
 * @param showDistance - Whether to show distance scores (for simple format)
 * @returns Formatted string
 */
export { formatSearchResult } from "./formatter/formatter.ts";

// ============================================================================
// Similarity Search
// ============================================================================

/**
 * Searches for IDs similar to a query string
 *
 * Calculates distance between the query and all IDs, then returns
 * results sorted by similarity (closest first).
 *
 * @param query - Search query string
 * @param ids - Array of traceability IDs to search
 * @param calculator - Distance calculator to use
 * @param options - Optional settings (top: limit number of results)
 * @returns Search results sorted by similarity
 *
 * @example
 * ```ts
 * const calculator = new StructuralDistance();
 * const results = searchSimilar("security", ids, calculator, { top: 10 });
 * console.log(`Found ${results.items.length} similar IDs`);
 * ```
 */
export { searchSimilar } from "./search/similarity.ts";

/**
 * Searches for IDs containing a keyword
 *
 * Performs case-insensitive substring matching on the full ID,
 * semantic component, and scope component.
 *
 * @param query - Search keyword
 * @param ids - Array of traceability IDs to search
 * @returns Array of matching IDs
 *
 * @example
 * ```ts
 * const matches = searchByKeyword("security", ids);
 * console.log(`Found ${matches.length} IDs containing "security"`);
 * ```
 */
export { searchByKeyword } from "./search/similarity.ts";
