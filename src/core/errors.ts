/**
 * Error kinds raised by this tool, unified in one place.
 *
 * Every failure is a {@link TraceabilityError} carrying a typed {@link ErrorDetail}.
 * Callers branch on `error.kind` (or `error.detail`) to know exactly what happened,
 * and the CLI maps each kind's category to an exit code.
 *
 * @module
 */

/** Detail of each error kind (discriminated by `kind`) */
export type ErrorDetail =
  // ── Usage: the invocation itself is wrong ──
  /** A required CLI argument or option is missing */
  | { kind: "MissingArgument"; argument: string }
  /** The ID list to look up is empty (`source`: `--ids` or the ids file path) */
  | { kind: "EmptyIdList"; source: string }
  /** A CLI option value is not one of the accepted values or not parsable */
  | { kind: "InvalidOptionValue"; option: string; value: string; expected: string }
  /** A numeric parameter of an algorithm is out of its valid range */
  | { kind: "InvalidParameter"; parameter: string; value: number; constraint: string }
  // ── Input: reading what the user pointed at ──
  /** An input path (directory or file) does not exist */
  | { kind: "PathNotFound"; path: string }
  /** An input path exists but cannot be read due to permissions */
  | { kind: "PathAccessDenied"; path: string }
  /** Walking a directory failed for another reason */
  | { kind: "ScanFailed"; path: string; cause: string }
  /** Reading a file failed */
  | { kind: "FileReadFailed"; path: string; cause: string }
  // ── Output: writing results ──
  /** Writing an output file or creating its directory failed */
  | { kind: "FileWriteFailed"; path: string; cause: string }
  // ── External: helper processes ──
  /** An external command (e.g. ripgrep) failed */
  | { kind: "ExternalCommandFailed"; command: string; cause: string };

/** Name of an error kind */
export type ErrorKind = ErrorDetail["kind"];

/** Category grouping error kinds by who must act */
export type ErrorCategory = "usage" | "input" | "output" | "external";

/** Category of every error kind */
export const ERROR_CATEGORIES: { readonly [K in ErrorKind]: ErrorCategory } = {
  MissingArgument: "usage",
  EmptyIdList: "usage",
  InvalidOptionValue: "usage",
  InvalidParameter: "usage",
  PathNotFound: "input",
  PathAccessDenied: "input",
  ScanFailed: "input",
  FileReadFailed: "input",
  FileWriteFailed: "output",
  ExternalCommandFailed: "external",
};

/**
 * Process exit code of every error category.
 * 0 and 1 are results (see `OUTCOME_EXIT_CODES` in outcome.ts); failures start at 2.
 */
export const EXIT_CODES: { readonly [C in ErrorCategory]: number } = {
  usage: 2,
  input: 3,
  output: 4,
  external: 5,
};

/** Exit code for errors that are not a {@link TraceabilityError} (sysexits EX_SOFTWARE) */
export const UNEXPECTED_EXIT_CODE = 70;

/**
 * Error raised by this tool
 *
 * @example
 * ```ts
 * try {
 *   await scanFiles("./publish");
 * } catch (e) {
 *   if (e instanceof TraceabilityError && e.detail.kind === "PathNotFound") {
 *     console.error(`missing: ${e.detail.path}`);
 *   }
 * }
 * ```
 */
export class TraceabilityError extends Error {
  override readonly name = "TraceabilityError";
  /** Typed detail of what went wrong */
  readonly detail: ErrorDetail;

  constructor(detail: ErrorDetail) {
    super(describeError(detail));
    this.detail = detail;
  }

  /** Kind of this error */
  get kind(): ErrorKind {
    return this.detail.kind;
  }

  /** Category of this error */
  get category(): ErrorCategory {
    return ERROR_CATEGORIES[this.detail.kind];
  }

  /** Exit code the CLI uses for this error */
  get exitCode(): number {
    return EXIT_CODES[this.category];
  }
}

/**
 * Human-readable message of an error detail
 */
export function describeError(detail: ErrorDetail): string {
  switch (detail.kind) {
    case "MissingArgument":
      return `Missing required argument: ${detail.argument}`;
    case "EmptyIdList":
      return `No IDs given in ${detail.source}`;
    case "InvalidOptionValue":
      return `Invalid ${detail.option} value: "${detail.value}" (expected ${detail.expected})`;
    case "InvalidParameter":
      return `Invalid ${detail.parameter}: ${detail.value} (${detail.constraint})`;
    case "PathNotFound":
      return `Path not found: ${detail.path}`;
    case "PathAccessDenied":
      return `Permission denied: ${detail.path}`;
    case "ScanFailed":
      return `Failed to scan directory ${detail.path}: ${detail.cause}`;
    case "FileReadFailed":
      return `Failed to read file ${detail.path}: ${detail.cause}`;
    case "FileWriteFailed":
      return `Failed to write file ${detail.path}: ${detail.cause}`;
    case "ExternalCommandFailed":
      return `Command failed (${detail.command}): ${detail.cause}`;
    default:
      return assertNever(detail);
  }
}

/**
 * A {@link TraceabilityError} whose detail is narrowed to kind `K`
 */
export type TraceabilityErrorOf<K extends ErrorKind> = TraceabilityError & {
  readonly detail: Extract<ErrorDetail, { kind: K }>;
};

/**
 * Type guard for {@link TraceabilityError}, optionally narrowed to a kind
 *
 * @example
 * ```ts
 * if (isTraceabilityError(e, "PathNotFound")) console.error(e.detail.path);
 * ```
 */
export function isTraceabilityError<K extends ErrorKind = ErrorKind>(
  error: unknown,
  kind?: K,
): error is TraceabilityErrorOf<K> {
  return error instanceof TraceabilityError && (kind === undefined || error.kind === kind);
}

/**
 * Convert a file system error on reading `path` into a typed error
 *
 * @param operation Kind used when the cause is neither "not found" nor "permission"
 */
export function fromReadError(
  error: unknown,
  path: string,
  operation: "ScanFailed" | "FileReadFailed",
): TraceabilityError {
  if (error instanceof TraceabilityError) return error;
  if (error instanceof Deno.errors.NotFound) {
    return new TraceabilityError({ kind: "PathNotFound", path });
  }
  if (error instanceof Deno.errors.PermissionDenied) {
    return new TraceabilityError({ kind: "PathAccessDenied", path });
  }
  return new TraceabilityError({ kind: operation, path, cause: causeOf(error) });
}

/**
 * Message of an unknown thrown value
 */
export function causeOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Compile-time exhaustiveness check
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
