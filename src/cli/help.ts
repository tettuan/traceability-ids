/**
 * Help text of options shared by several commands, generated from the option vocabularies.
 *
 * @module
 */

import {
  DEFAULT_VERSION_MATCH,
  VERSION_MATCH_DESCRIPTIONS,
  VERSION_MATCH_MODES,
} from "../core/options.ts";
import { DEFAULT_EXTENSIONS } from "../core/scanner.ts";
import { DEFAULT_HASH_PATTERN } from "../core/id.ts";

const COLUMN = 26;

function row(flag: string, text: string): string {
  return `  ${flag.padEnd(COLUMN - 2)}${text}`;
}

function bullet(text: string): string {
  return `${" ".repeat(COLUMN)}• ${text}`;
}

/** `--ext`, `--skip-frontmatter`, `--help`: accepted by every command */
export const INPUT_OPTIONS_HELP: string = [
  row(
    "--ext <list>",
    `File extensions to scan, comma-separated (default: ${DEFAULT_EXTENSIONS.join(",")})`,
  ),
  bullet("e.g. md,rs,ts,tsx,mjs,sh"),
  row("--skip-frontmatter", "Read the body only, ignoring the frontmatter (leading --- block)"),
  row(
    "--hash-pattern <regex>",
    `Hash form of the last segment, matched whole (default: ${DEFAULT_HASH_PATTERN})`,
  ),
  bullet("a last segment not in this form is part of the semantic (no hash)"),
  row("--require-hash", "Exclude IDs without a hash"),
  row("--help", "Show this help message"),
].join("\n");

/**
 * `--versions`: how targets given without a version are resolved
 *
 * @param subject What is resolved, e.g. "IDs"
 */
export function versionsOptionHelp(subject: string): string {
  const width = Math.max(...VERSION_MATCH_MODES.map((mode) => mode.length)) + 1;
  return [
    row(
      "--versions <mode>",
      `How to resolve ${subject} given without a version (default: ${DEFAULT_VERSION_MATCH})`,
    ),
    ...VERSION_MATCH_MODES.map((mode) =>
      bullet(`${`${mode}:`.padEnd(width)} ${VERSION_MATCH_DESCRIPTIONS[mode]}`)
    ),
  ].join("\n");
}

/**
 * `--allow-missing`: exit 0 instead of 1 when something requested is not found
 *
 * @param subject What may be missing, e.g. "some IDs"
 */
export function allowMissingOptionHelp(subject: string): string {
  return row("--allow-missing", `Exit 0 even when ${subject} not found (default: exit 1)`);
}
