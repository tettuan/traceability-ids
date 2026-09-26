#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Relations mode: declared relations (`derived_from` / `trace_to`) as data.
 *
 * Outputs one row per declaration with where it is written, optionally only those
 * touching given IDs (in / out), or only those whose target is not found.
 *
 * @example
 * ```bash
 * # Who refers to an ID
 * deno run --allow-read jsr:@aidevtool/traceability-ids/relations --ids req:auth:login-flow-1a2b3c --direction in ./docs
 *
 * # Broken relations with file:line
 * deno run --allow-read jsr:@aidevtool/traceability-ids/relations --broken ./docs
 * ```
 *
 * @module
 */

import { allowMissingOptionHelp, INPUT_OPTIONS_HELP, versionsOptionHelp } from "./src/cli/help.ts";
import { parseRelationsArgs, type RelationsCommandOptions } from "./src/cli/args.ts";
import { type CommandSpec, main } from "./src/cli/runner.ts";
import { applyAllowMissing } from "./src/core/outcome.ts";
import { RELATION_KINDS, RELATION_LABELS } from "./src/core/relations.ts";
import { runRelationsMode } from "./src/modes/relations.ts";

const USAGE = `Relations Mode - Declared relations (derived_from / trace_to) as data

USAGE:
  deno run --allow-read --allow-write jsr:@aidevtool/traceability-ids/relations [options] <input-path...>

ARGUMENTS:
  <input-path...>         Directories or files to scan (one or more; directories are scanned recursively)

OPTIONS:
  --ids <string>          Only relations touching these IDs (space-separated; default: every relation)
                          • With version (…#20251111a): exact match
                          • Without version (…-4f7b2e): resolved by --versions
  --ids-file <path>       Path to file containing IDs (one per line)
  --direction <dir>       Seen from --ids (default: both; requires --ids)
                          • in: relations pointing at the IDs
                          • out: relations the IDs declare
                          • both: either
  --kind <kind>           Relation fields to output (repeatable or comma-separated; default: all)
${
  RELATION_KINDS.map((kind) => `                          • ${kind}: ${RELATION_LABELS[kind]}`)
    .join("\n")
}
  --broken                Only relations whose target is not found (NodeMissing / VersionMissing)
                          (default: only relations whose target is found)
  --format <format>       Output format (default: simple)
                          • simple: "path:line: source -kind-> target[ (reason)]"
                          • tsv: direction, kind, source, target, path:line, reason (6 columns)
                          • json: { rows: [...] } with each target's resolution
  --output <file>         Output file path (default: STDOUT)
${versionsOptionHelp("--ids and relation targets")}
${allowMissingOptionHelp("some IDs are")}
${INPUT_OPTIONS_HELP}

EXAMPLES:
  # Who refers to an ID
  deno run --allow-read relations.ts --ids req:auth:login-flow-1a2b3c --direction in ./docs

  # What an ID depends on, as TSV
  deno run --allow-read relations.ts --ids req:auth:session-timeout-4d5e6f --direction out --format tsv ./docs

  # Broken relations with file:line
  deno run --allow-read relations.ts --broken ./docs
`;

/** The relations command */
export const command: CommandSpec<RelationsCommandOptions> = {
  usage: USAGE,
  parse: parseRelationsArgs,
  run: async (options, io) =>
    applyAllowMissing(await runRelationsMode(options, io), options.allowMissing),
};

if (import.meta.main) {
  await main(command);
}
