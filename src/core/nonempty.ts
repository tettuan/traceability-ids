/**
 * Arrays that hold at least one element.
 *
 * @module
 */

/** A read-only array with at least one element */
export type NonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Whether an array has at least one element
 */
export function isNonEmpty<T>(items: readonly T[]): items is NonEmptyArray<T> {
  return items.length > 0;
}
