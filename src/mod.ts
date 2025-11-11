/**
 * Traceability IDs - A library for extracting and clustering traceability IDs from markdown files
 *
 * @module
 */

// Core types
export type {
  Cluster,
  ClusteringResult,
  SimilarityItem,
  SimilaritySearchResult,
  TraceabilityId,
} from "./core/types.ts";

// Core functions
export { scanFiles } from "./core/scanner.ts";
export { extractIds, extractIdsFromFile } from "./core/extractor.ts";

// Distance calculators
export type { DistanceCalculator } from "./distance/calculator.ts";
export { createDistanceMatrix } from "./distance/calculator.ts";
export { LevenshteinDistance } from "./distance/levenshtein.ts";
export { JaroWinklerDistance } from "./distance/jaro_winkler.ts";
export { CosineDistance } from "./distance/cosine.ts";
export { StructuralDistance } from "./distance/structural.ts";

// Clustering algorithms
export type {
  ClusteringAlgorithm,
  ClusteringOptions,
} from "./clustering/algorithm.ts";
export { HierarchicalClustering } from "./clustering/hierarchical.ts";
export { KMeansClustering } from "./clustering/kmeans.ts";
export { DBSCANClustering } from "./clustering/dbscan.ts";

// Formatters
export {
  formatAsCsv,
  formatAsJson,
  formatAsMarkdown,
  formatAsSimple,
  formatAsSimpleWithClusters,
  formatResult,
  formatSearchResult,
  formatSearchResultAsCsv,
  formatSearchResultAsJson,
  formatSearchResultAsMarkdown,
  formatSearchResultAsSimple,
} from "./formatter/formatter.ts";

// Similarity search
export { searchByKeyword, searchSimilar } from "./search/similarity.ts";
