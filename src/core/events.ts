/**
 * Progress events emitted by the modes.
 *
 * A mode reports what happened as a typed event instead of writing log text,
 * so the order of steps ("A happened, then B") is observable and testable.
 * {@link describeEvent} renders an event as the CLI's progress line.
 *
 * @module
 */

import { assertNever } from "./errors.ts";
import type { AlgorithmName, DistanceName, FrontmatterPolicy } from "./options.ts";

/** Name of a mode */
export type ModeName = "cluster" | "search" | "extract" | "graph" | "analyze" | "list";

/** Reason a mode stopped without producing output */
export type EmptyReason = "NoFiles" | "NoIds";

/** Aspect of analyze mode */
export type AnalysisAspect = "structure" | "detail" | "duplication" | "gaps";

/** Progress event of a mode (discriminated by `type`) */
export type ModeEvent =
  | { type: "ModeStarted"; mode: ModeName }
  | { type: "CalculatorSelected"; name: DistanceName }
  | { type: "AlgorithmSelected"; name: AlgorithmName }
  | { type: "TargetsLoaded"; count: number }
  | {
    type: "ScanStarted";
    paths: readonly string[];
    extensions: readonly string[];
    frontmatter: FrontmatterPolicy;
  }
  | { type: "FilesScanned"; count: number }
  | { type: "IdsExtracted"; total: number; unique: number }
  | { type: "Stopped"; reason: EmptyReason }
  | { type: "DistanceMatrixBuilt"; size: number }
  | { type: "ClustersFormed"; count: number }
  | { type: "SearchCompleted"; results: number }
  | { type: "ContextsResolved"; found: number; notFound: number }
  | { type: "AnalysisCompleted"; aspect: AnalysisAspect }
  | { type: "GraphBuilt"; nodes: number; links: number }
  | { type: "OutputWritten"; path: string }
  | { type: "OutputPrinted"; length: number };

/** Type name of a progress event */
export type ModeEventType = ModeEvent["type"];

/**
 * Side effects a mode may perform besides reading input files.
 *
 * Injected into every mode so tests can record events and output instead of
 * reading the console.
 */
export interface ModeIO {
  /** Receive a progress event */
  report(event: ModeEvent): void;
  /** Print the result to standard output */
  print(content: string): void;
}

/** Console IO: progress to STDERR, results to STDOUT */
export const consoleIO: ModeIO = {
  report: (event) => console.error(describeEvent(event)),
  print: (content) => console.log(content),
};

/**
 * Progress line of an event
 */
export function describeEvent(event: ModeEvent): string {
  switch (event.type) {
    case "ModeStarted":
      return `Mode: ${event.mode}`;
    case "CalculatorSelected":
      return `Distance calculator: ${event.name}`;
    case "AlgorithmSelected":
      return `Clustering algorithm: ${event.name}`;
    case "TargetsLoaded":
      return `Target IDs: ${event.count}`;
    case "ScanStarted":
      return `Scanning ${event.paths.join(", ")} (${event.extensions.join(",")}` +
        `${event.frontmatter === "skip" ? ", skipping frontmatter" : ""})`;
    case "FilesScanned":
      return `Found ${event.count} files`;
    case "IdsExtracted":
      return `Extracted ${event.total} IDs (${event.unique} unique)`;
    case "Stopped":
      return event.reason === "NoFiles" ? "No matching files found" : "No traceability IDs found";
    case "DistanceMatrixBuilt":
      return `Distance matrix: ${event.size}x${event.size}`;
    case "ClustersFormed":
      return `Created ${event.count} clusters`;
    case "SearchCompleted":
      return `Found ${event.results} results`;
    case "ContextsResolved":
      return `Found ${event.found} IDs, not found ${event.notFound} IDs`;
    case "AnalysisCompleted":
      return `Analyzed ${event.aspect}`;
    case "GraphBuilt":
      return `Graph: ${event.nodes} nodes, ${event.links} edges`;
    case "OutputWritten":
      return `Wrote ${event.path}`;
    case "OutputPrinted":
      return "Done";
    default:
      return assertNever(event);
  }
}
