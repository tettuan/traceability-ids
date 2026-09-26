import { assertNever } from "../core/errors.ts";
import type { DistanceName } from "../core/options.ts";
import { CosineDistance } from "../distance/cosine.ts";
import { JaroWinklerDistance } from "../distance/jaro_winkler.ts";
import { LevenshteinDistance } from "../distance/levenshtein.ts";
import { StructuralDistance } from "../distance/structural.ts";
import type { DistanceCalculator } from "../distance/calculator.ts";

/**
 * 距離計算器を取得するファクトリー関数
 */
export function createDistanceCalculator(name: DistanceName): DistanceCalculator {
  switch (name) {
    case "levenshtein":
      return new LevenshteinDistance();
    case "jaro-winkler":
      return new JaroWinklerDistance();
    case "cosine":
      return new CosineDistance();
    case "structural":
      return new StructuralDistance();
    default:
      return assertNever(name);
  }
}
