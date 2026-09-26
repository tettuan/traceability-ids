/**
 * Result status of a mode run and its exit code.
 *
 * Exit codes follow the `grep` / `diff` convention: 0 and 1 are results
 * (everything found / something requested was not found), 2 and above are failures
 * (see `EXIT_CODES` in errors.ts).
 *
 * @module
 */

import { isNonEmpty, type NonEmptyArray } from "./nonempty.ts";

/** Result status of a mode run */
export type ModeOutcome =
  /** Everything requested was found (or nothing specific was requested) */
  | { status: "complete" }
  /** Some requested IDs were not found; output for the found ones was still produced */
  | { status: "partial"; missing: NonEmptyArray<string> };

/** Outcome of a run that requested nothing specific */
export const COMPLETE: ModeOutcome = { status: "complete" };

/** Exit code of every outcome status */
export const OUTCOME_EXIT_CODES: { readonly [S in ModeOutcome["status"]]: number } = {
  complete: 0,
  partial: 1,
};

/**
 * Outcome of a lookup given the IDs that were not found
 */
export function lookupOutcome(missing: readonly string[]): ModeOutcome {
  return isNonEmpty(missing) ? { status: "partial", missing } : COMPLETE;
}

/**
 * Outcome under the `--allow-missing` policy: when allowed, missing IDs do not make a run partial
 */
export function applyAllowMissing(outcome: ModeOutcome, allowMissing: boolean): ModeOutcome {
  return allowMissing ? COMPLETE : outcome;
}
