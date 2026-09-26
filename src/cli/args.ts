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
  DEFAULT_FRONTMATTER,
  DEFAULT_HASH_POLICY,
  DEFAULT_VERSION_MATCH,
  DISTANCE_NAMES,
  EXTRACT_FORMATS,
  LAYOUTS,
  LIST_FORMATS,
  parseChoice,
  parseHashPattern,
  parseInteger,
  parseNumber,
  RELATION_DIRECTIONS,
  RELATIONS_FORMATS,
  SEARCH_FORMATS,
  SORT_KEYS,
  VERSION_MATCH_MODES,
} from "../core/options.ts";
import { DEFAULT_HASH_RULE } from "../core/id.ts";
import { parseExtensions } from "../core/scanner.ts";
import type { AnalyzeModeOptions } from "../modes/analyze.ts";
import type { ClusterModeOptions } from "../modes/cluster.ts";
import type { ExtractModeOptions } from "../modes/extract.ts";
import type { GraphModeOptions } from "../modes/graph.ts";
import type { ListModeOptions } from "../modes/list.ts";
import type { InputSpec } from "../modes/pipeline.ts";
import type { IdsSource } from "../extract/loader.ts";
import type { SearchModeOptions } from "../modes/search.ts";
import type { RelationsModeOptions } from "../modes/relations.ts";
import { RELATION_KINDS, type RelationKind } from "../core/relations.ts";

/** Options of the extract command: mode options plus exit code policy */
export interface ExtractCommandOptions extends ExtractModeOptions {
  /** Exit 0 even when some requested IDs are not found */
  allowMissing: boolean;
}

/** Options of the graph command: mode options plus exit code policy */
export interface GraphCommandOptions extends GraphModeOptions {
  /** Exit 0 even when some relation targets are not found */
  allowMissing: boolean;
}

/** Options of the list command: mode options plus exit code policy */
export interface ListCommandOptions extends ListModeOptions {
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

/** Value flags every command accepts */
const INPUT_STRING_FLAGS = ["ext", "hash-pattern"] as const;
/** Switches every command accepts */
const INPUT_BOOLEAN_FLAGS = ["help", "skip-frontmatter", "require-hash"] as const;

const CLUSTERING_FLAGS = ["algorithm", "threshold", "k", "epsilon", "min-points"] as const;

/**
 * Parse flags; the names listed here (plus the input options) are the only ones accepted
 *
 * @throws TraceabilityError `UnknownOption`
 */
function flags(
  argv: readonly string[],
  string: readonly string[],
  defaults: Record<string, string>,
  boolean: readonly string[] = [],
  collect: readonly string[] = [],
): Flags {
  return parseArgs([...argv], {
    string: [...INPUT_STRING_FLAGS, ...string, ...collect],
    boolean: [...INPUT_BOOLEAN_FLAGS, ...boolean],
    collect: [...collect],
    alias: { h: "help" },
    default: defaults,
    unknown: (arg, key) => {
      if (key === undefined) return true;
      throw new TraceabilityError({ kind: "UnknownOption", option: arg.split("=")[0] });
    },
  }) as Flags;
}

function optional(value: unknown): string | undefined {
  return value === undefined ? undefined : String(value);
}

/**
 * Input paths, extensions, frontmatter policy and hash form
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
    frontmatter: args["skip-frontmatter"] === true ? "skip" : DEFAULT_FRONTMATTER,
    hashRule: args["hash-pattern"] === undefined
      ? DEFAULT_HASH_RULE
      : parseHashPattern("--hash-pattern", args["hash-pattern"]),
    hashes: args["require-hash"] === true ? "required" : DEFAULT_HASH_POLICY,
  };
}

/**
 * Where requested IDs come from: `--ids` wins over `--ids-file`; neither → undefined
 */
function idsSource(args: Flags): IdsSource | undefined {
  if (args.ids !== undefined) return { kind: "inline", text: String(args.ids) };
  if (args["ids-file"] !== undefined) return { kind: "file", path: String(args["ids-file"]) };
  return undefined;
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
    versions: DEFAULT_VERSION_MATCH,
  }, ["allow-missing"]);
  if (args.help) return { kind: "help" };
  const spec = inputSpec(args);
  const ids = idsSource(args);
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
export function parseGraphArgs(argv: readonly string[]): ParsedArgs<GraphCommandOptions> {
  const args = flags(argv, [
    ...CLUSTERING_FLAGS,
    "output",
    "distance",
    "edge-threshold",
    "color-by",
    "layout",
    "versions",
  ], {
    ...CLUSTERING_DEFAULTS,
    output: "tmp/graph-3d.html",
    distance: "structural",
    "edge-threshold": "0.5",
    "color-by": "cluster",
    layout: "force",
    versions: DEFAULT_VERSION_MATCH,
  }, ["allow-missing"]);
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
      versions: parseChoice("--versions", args.versions, VERSION_MATCH_MODES),
      allowMissing: args["allow-missing"] === true,
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

/** Options of the relations command: mode options plus exit code policy */
export interface RelationsCommandOptions extends RelationsModeOptions {
  /** Exit 0 even when some requested IDs are not found */
  allowMissing: boolean;
}

/**
 * Relation fields from repeated and comma-separated `--kind` values (none → every field)
 *
 * @throws TraceabilityError `InvalidOptionValue`
 */
function relationKinds(values: unknown): RelationKind[] {
  const given = (Array.isArray(values) ? values : []).flatMap((v) => String(v).split(","))
    .map((v) => v.trim()).filter((v) => v !== "");
  if (given.length === 0) return [...RELATION_KINDS];
  return [...new Set(given.map((v) => parseChoice("--kind", v, RELATION_KINDS)))];
}

/** Parse arguments of relations mode */
export function parseRelationsArgs(argv: readonly string[]): ParsedArgs<RelationsCommandOptions> {
  const args = flags(
    argv,
    ["ids", "ids-file", "versions", "direction", "format", "output"],
    {
      versions: DEFAULT_VERSION_MATCH,
      format: "simple",
    },
    ["broken", "allow-missing"],
    ["kind"],
  );
  if (args.help) return { kind: "help" };
  const spec = inputSpec(args);
  const ids = idsSource(args);
  if (args.direction !== undefined && !ids) {
    throw new TraceabilityError({
      kind: "MissingArgument",
      argument: "--ids or --ids-file (required by --direction)",
    });
  }
  return {
    kind: "run",
    options: {
      ...spec,
      outputFile: optional(args.output),
      ids,
      direction: args.direction === undefined
        ? undefined
        : parseChoice("--direction", args.direction, RELATION_DIRECTIONS),
      kinds: relationKinds(args.kind),
      status: args.broken === true ? "broken" : "resolved",
      versions: parseChoice("--versions", args.versions, VERSION_MATCH_MODES),
      format: parseChoice("--format", args.format, RELATIONS_FORMATS),
      allowMissing: args["allow-missing"] === true,
    },
  };
}

/** Parse arguments of list mode */
export function parseListArgs(argv: readonly string[]): ParsedArgs<ListCommandOptions> {
  const args = flags(argv, [
    "output",
    "format",
    "sort",
    "batch-size",
    "ids",
    "ids-file",
    "versions",
  ], {
    format: "json",
    sort: "fullId",
    "batch-size": "0",
    versions: DEFAULT_VERSION_MATCH,
  }, ["allow-missing"]);
  if (args.help) return { kind: "help" };
  return {
    kind: "run",
    options: {
      ...inputSpec(args),
      outputFile: optional(args.output),
      format: parseChoice("--format", args.format, LIST_FORMATS),
      sort: parseChoice("--sort", args.sort, SORT_KEYS),
      batchSize: parseInteger("--batch-size", args["batch-size"]),
      ids: idsSource(args),
      versions: parseChoice("--versions", args.versions, VERSION_MATCH_MODES),
      allowMissing: args["allow-missing"] === true,
    },
  };
}
