import { assertNever } from "../core/errors.ts";
import { DEFAULT_HASH_RULE, type HashRule } from "../core/id.ts";
import type { DistanceName } from "../core/options.ts";
import { CosineDistance } from "../distance/cosine.ts";
import { JaroWinklerDistance } from "../distance/jaro_winkler.ts";
import { LevenshteinDistance } from "../distance/levenshtein.ts";
import { StructuralDistance } from "../distance/structural.ts";
import type { DistanceCalculator } from "../distance/calculator.ts";

/**
 * 距離計算器を取得するファクトリー関数
 *
 * @param hashRule hash の形式（structural が ID を分解するときに使う）
 */
export function createDistanceCalculator(
  name: DistanceName,
  hashRule: HashRule = DEFAULT_HASH_RULE,
): DistanceCalculator {
  switch (name) {
    case "levenshtein":
      return new LevenshteinDistance();
    case "jaro-winkler":
      return new JaroWinklerDistance();
    case "cosine":
      return new CosineDistance();
    case "structural":
      return new StructuralDistance(undefined, hashRule);
    default:
      return assertNever(name);
  }
}
