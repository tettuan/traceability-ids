/**
 * Common driver of every CLI entry point: parse, run, and map errors to exit codes.
 *
 * @module
 */

import {
  ERROR_CATEGORIES,
  type ErrorCategory,
  EXIT_CODES,
  isTraceabilityError,
  UNEXPECTED_EXIT_CODE,
} from "../core/errors.ts";
import { consoleIO, type ModeIO } from "../core/events.ts";
import { type ModeOutcome, OUTCOME_EXIT_CODES } from "../core/outcome.ts";
import type { ArgsParser } from "./args.ts";

/** One CLI command */
export interface CommandSpec<T> {
  /** Help text */
  usage: string;
  /** Argument parser */
  parse: ArgsParser<T>;
  /** Mode to run, reporting progress and printing results through `io` */
  run: (options: T, io: ModeIO) => Promise<ModeOutcome>;
}

/** Where the driver writes text */
export interface CliConsole {
  /** Standard output */
  out(text: string): void;
  /** Standard error */
  err(text: string): void;
}

const defaultConsole: CliConsole = {
  out: (text) => console.log(text),
  err: (text) => console.error(text),
};

/**
 * Help section listing exit codes and the error kinds behind them
 */
export function exitCodesHelp(): string {
  const kinds = (category: ErrorCategory): string =>
    Object.entries(ERROR_CATEGORIES)
      .filter(([, c]) => c === category)
      .map(([kind]) => kind)
      .join(", ");
  const rows = (Object.keys(EXIT_CODES) as ErrorCategory[]).map((category) =>
    `  ${EXIT_CODES[category]}  ${category.padEnd(8)} ${kinds(category)}`
  );
  return [
    "EXIT CODES:",
    `  ${OUTCOME_EXIT_CODES.complete}  success`,
    `  ${OUTCOME_EXIT_CODES.partial}  some requested IDs (extract, list, relations) or relation targets (graph) were not found; see --allow-missing`,
    ...rows,
    `  ${UNEXPECTED_EXIT_CODE} unexpected error`,
  ].join("\n");
}

/**
 * Run a command and return its exit code
 *
 * - help → usage on STDOUT, 0
 * - run → exit code of its {@link ModeOutcome} (complete 0, partial 1)
 * - {@link TraceabilityError} → `Error [<kind>]: <message>` on STDERR, the kind's exit code
 *   (usage errors also point to `--help`)
 * - anything else → `Error: <message>` on STDERR, 70
 */
export async function runCommand<T>(
  spec: CommandSpec<T>,
  argv: readonly string[],
  cli: CliConsole = defaultConsole,
  io: ModeIO = consoleIO,
): Promise<number> {
  try {
    const parsed = spec.parse(argv);
    if (parsed.kind === "help") {
      cli.out(`${spec.usage.trimEnd()}\n\n${exitCodesHelp()}\n`);
      return 0;
    }
    const outcome = await spec.run(parsed.options, io);
    return OUTCOME_EXIT_CODES[outcome.status];
  } catch (error) {
    if (isTraceabilityError(error)) {
      cli.err(`Error [${error.kind}]: ${error.message}`);
      if (error.category === "usage") cli.err("Run with --help for usage.");
      return error.exitCode;
    }
    cli.err(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return UNEXPECTED_EXIT_CODE;
  }
}

/**
 * Run a command as the process and exit with its code
 */
export async function main<T>(spec: CommandSpec<T>): Promise<void> {
  Deno.exit(await runCommand(spec, Deno.args));
}
