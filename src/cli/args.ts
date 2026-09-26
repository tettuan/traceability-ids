/**
 * Parsing of command line arguments into typed mode options.
 *
 * Each parser is pure: `argv` in, {@link ParsedArgs} out, typed errors thrown.
 * Help text and execution live in the entry points.
 *
 * @module
 */

import { parseArgs } from "@std/cli/parse-args";
import { TraceabilityError } from "../core/errors.ts";
import {
  ALGORITHM_NAMES,
  CLUSTER_FORMATS,
  type ClusteringOptions,
  COLOR_MODES,
  DISTANCE_NAMES,
  EXTRACT_FORMATS,
  LAYOUTS,
  LIST_FORMATS,
  parseChoice,
  parseInteger,
  parseNumber,
  SEARCH_FORMATS,
  SORT_KEYS,
  VERSION_MATCH_MODES,
} from "../core/options.ts";
import { parseExtensions } from "../core/scanner.ts";
import type { AnalyzeModeOptions } from "../modes/analyze.ts";
import type { ClusterModeOptions } from "../modes/cluster.ts";
import type { ExtractModeOptions } from "../modes/extract.ts";
import type { GraphModeOptions } from "../modes/graph.ts";
import type { ListModeOptions } from "../modes/list.ts";
import type { InputSpec } from "../modes/pipeline.ts";
import type { SearchModeOptions } from "../modes/search.ts";

/** Options of the extract command: mode options plus exit code policy */
export interface ExtractCommandOptions extends ExtractModeOptions {
  /** Exit 0 even when some requested IDs are not found */
  allowMissing: boolean;
}

/** Result of parsing: show help, or run with options */
export type ParsedArgs<T> =
  | { kind: "help" }
  | { kind: "run"; options: T };

/** Parser of one mode's arguments */
export type ArgsParser<T> = (argv: readonly string[]) => ParsedArgs<T>;

type Flags = Record<string, unknown> & { _: (string | number)[]; help?: boolean };

const CLUSTERING_DEFAULTS = {
  algorithm: "hierarchical",
  threshold: "0.3",
  k: "0",
  epsilon: "0.3",
  "min-points": "2",
} as const;

const CLUSTERING_FLAGS = ["algorithm", "threshold", "k", "epsilon", "min-points"] as const;

function flags(
  argv: readonly string[],
  string: readonly string[],
  defaults: Record<string, string>,
  boolean: readonly string[] = [],
): Flags {
  return parseArgs([...argv], {
    string: ["ext", ...string],
    boolean: ["help", ...boolean],
    default: defaults,
  }) as Flags;
}

function optional(value: unknown): string | undefined {
  return value === undefined ? undefined : String(value);
}

/**
 * Input paths and extensions
 *
 * @throws TraceabilityError `MissingArgument` | `InvalidOptionValue`
 */
function inputSpec(args: Flags): Required<InputSpec> {
  if (args._.length === 0) {
    throw new TraceabilityError({ kind: "MissingArgument", argument: "<input-path...>" });
  }
  return {
    inputDir: args._.map(String),
    extensions: parseExtensions(optional(args.ext)),
  };
}

function clusteringOptions(args: Flags): ClusteringOptions {
  return {
    threshold: parseNumber("--threshold", args.threshold),
    k: parseInteger("--k", args.k),
    epsilon: parseNumber("--epsilon", args.epsilon),
    minPoints: parseInteger("--min-points", args["min-points"], 1),
  };
}

/** Parse arguments of cluster mode */
export function parseClusterArgs(argv: readonly string[]): ParsedArgs<ClusterModeOptions> {
  const args = flags(argv, [...CLUSTERING_FLAGS, "distance", "format", "output"], {
    ...CLUSTERING_DEFAULTS,
    distance: "structural",
    format: "simple",
  });
  if (args.help) return { kind: "help" };
  return {
    kind: "run",
    options: {
      ...inputSpec(args),
      outputFile: optional(args.output),
      algorithm: parseChoice("--algorithm", args.algorithm, ALGORITHM_NAMES),
      distance: parseChoice("--distance", args.distance, DISTANCE_NAMES),
      format: parseChoice("--format", args.format, CLUSTER_FORMATS),
      clusteringOptions: clusteringOptions(args),
    },
  };
}

/** Parse arguments of search mode */
export function parseSearchArgs(argv: readonly string[]): ParsedArgs<SearchModeOptions> {
  const args = flags(argv, ["query", "top", "distance", "format", "output"], {
    distance: "cosine",
    format: "simple",
  }, ["show-distance"]);
  if (args.help) return { kind: "help" };
  const spec = inputSpec(args);
  if (args.query === undefined) {
    throw new TraceabilityError({ kind: "MissingArgument", argument: "--query" });
  }
  return {
    kind: "run",
    options: {
      ...spec,
      outputFile: optional(args.output),
      query: String(args.query),
      distance: parseChoice("--distance", args.distance, DISTANCE_NAMES),
      top: args.top === undefined ? undefined : parseInteger("--top", args.top, 1),
      showDistance: args["show-distance"] === true,
      format: parseChoice("--format", args.format, SEARCH_FORMATS),
    },
  };
}

/** Parse arguments of extract mode */
export function parseExtractArgs(argv: readonly string[]): ParsedArgs<ExtractCommandOptions> {
  const args = flags(argv, ["ids", "ids-file", "before", "after", "format", "output", "versions"], {
    before: "3",
    after: "10",
    format: "markdown",
    versions: "latest",
  }, ["allow-missing"]);
  if (args.help) return { kind: "help" };
  const spec = inputSpec(args);
  const ids = args.ids !== undefined
    ? { kind: "inline" as const, text: String(args.ids) }
    : args["ids-file"] !== undefined
    ? { kind: "file" as const, path: String(args["ids-file"]) }
    : undefined;
  if (!ids) {
    throw new TraceabilityError({ kind: "MissingArgument", argument: "--ids or --ids-file" });
  }
  return {
    kind: "run",
    options: {
      ...spec,
      outputFile: optional(args.output),
      ids,
      before: parseInteger("--before", args.before),
      after: parseInteger("--after", args.after),
      format: parseChoice("--format", args.format, EXTRACT_FORMATS),
      versions: parseChoice("--versions", args.versions, VERSION_MATCH_MODES),
      allowMissing: args["allow-missing"] === true,
    },
  };
}

/** Parse arguments of graph mode */
export function parseGraphArgs(argv: readonly string[]): ParsedArgs<GraphModeOptions> {
  const args = flags(argv, [
    ...CLUSTERING_FLAGS,
    "output",
    "distance",
    "edge-threshold",
    "color-by",
    "layout",
  ], {
    ...CLUSTERING_DEFAULTS,
    output: "tmp/graph-3d.html",
    distance: "structural",
    "edge-threshold": "0.5",
    "color-by": "cluster",
    layout: "force",
  });
  if (args.help) return { kind: "help" };
  return {
    kind: "run",
    options: {
      ...inputSpec(args),
      outputFile: String(args.output),
      distance: parseChoice("--distance", args.distance, DISTANCE_NAMES),
      algorithm: parseChoice("--algorithm", args.algorithm, ALGORITHM_NAMES),
      edgeThreshold: parseNumber("--edge-threshold", args["edge-threshold"]),
      colorBy: parseChoice("--color-by", args["color-by"], COLOR_MODES),
      layout: parseChoice("--layout", args.layout, LAYOUTS),
      clusteringOptions: clusteringOptions(args),
    },
  };
}

/** Parse arguments of analyze mode */
export function parseAnalyzeArgs(argv: readonly string[]): ParsedArgs<AnalyzeModeOptions> {
  const args = flags(argv, [...CLUSTERING_FLAGS, "output", "distance", "edge-threshold"], {
    ...CLUSTERING_DEFAULTS,
    output: "tmp/analyze-report.md",
    distance: "structural",
    "edge-threshold": "0.5",
  });
  if (args.help) return { kind: "help" };
  return {
    kind: "run",
    options: {
      ...inputSpec(args),
      outputFile: String(args.output),
      distance: parseChoice("--distance", args.distance, DISTANCE_NAMES),
      algorithm: parseChoice("--algorithm", args.algorithm, ALGORITHM_NAMES),
      edgeThreshold: parseNumber("--edge-threshold", args["edge-threshold"]),
      clusteringOptions: clusteringOptions(args),
    },
  };
}

/** Parse arguments of list mode */
export function parseListArgs(argv: readonly string[]): ParsedArgs<ListModeOptions> {
  const args = flags(argv, ["output", "format", "sort", "batch-size"], {
    format: "json",
    sort: "fullId",
    "batch-size": "0",
  });
  if (args.help) return { kind: "help" };
  return {
    kind: "run",
    options: {
      ...inputSpec(args),
      outputFile: optional(args.output),
      format: parseChoice("--format", args.format, LIST_FORMATS),
      sort: parseChoice("--sort", args.sort, SORT_KEYS),
      batchSize: parseInteger("--batch-size", args["batch-size"]),
    },
  };
}
