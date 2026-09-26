/**
 * Validation of numeric algorithm parameters.
 *
 * Every constraint is a named {@link ParameterRule}; `NaN` and infinities never pass,
 * so a constructed algorithm always holds values inside its domain.
 *
 * @module
 */

import { assertNever, TraceabilityError } from "./errors.ts";

/** Constraint on a numeric parameter */
export type ParameterRule =
  | { kind: "positive" }
  | { kind: "nonNegative" }
  | { kind: "integerAtLeast"; min: number }
  | { kind: "between"; min: number; max: number };

function satisfies(value: number, rule: ParameterRule): boolean {
  if (!Number.isFinite(value)) return false;
  switch (rule.kind) {
    case "positive":
      return value > 0;
    case "nonNegative":
      return value >= 0;
    case "integerAtLeast":
      return Number.isInteger(value) && value >= rule.min;
    case "between":
      return value >= rule.min && value <= rule.max;
    default:
      return assertNever(rule);
  }
}

function describeRule(rule: ParameterRule): string {
  switch (rule.kind) {
    case "positive":
      return "must be a positive number";
    case "nonNegative":
      return "must be a number >= 0";
    case "integerAtLeast":
      return `must be an integer >= ${rule.min}`;
    case "between":
      return `must be between ${rule.min} and ${rule.max}`;
    default:
      return assertNever(rule);
  }
}

/**
 * Return `value` when it satisfies `rule`
 *
 * @throws TraceabilityError `InvalidParameter`
 */
export function requireParameter(parameter: string, value: number, rule: ParameterRule): number {
  if (satisfies(value, rule)) return value;
  throw new TraceabilityError({
    kind: "InvalidParameter",
    parameter,
    value,
    constraint: describeRule(rule),
  });
}
