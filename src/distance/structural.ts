import type { DistanceCalculator } from "./calculator.ts";

/**
 * 構造的類似度を計算
 * トレーサビリティIDのパターン {level}:{scope}:{semantic}-{hash}#{version} の各要素を個別に比較
 */
export class StructuralDistance implements DistanceCalculator {
  readonly name = "structural";

  /**
   * コンストラクタ
   * @param weights 各要素の重み
   */
  constructor(
    private weights: {
      level: number;
      scope: number;
      semantic: number;
      hash: number;
      version: number;
    } = {
      level: 0.2,
      scope: 0.3,
      semantic: 0.3,
      hash: 0.1,
      version: 0.1,
    },
  ) {
    // 重みの合計が1になるように正規化
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      // 正規化
      this.weights = {
        level: weights.level / totalWeight,
        scope: weights.scope / totalWeight,
        semantic: weights.semantic / totalWeight,
        hash: weights.hash / totalWeight,
        version: weights.version / totalWeight,
      };
    }
  }

  /**
   * 構造的距離を計算
   * @param a 文字列A（トレーサビリティID）
   * @param b 文字列B（トレーサビリティID）
   * @returns 距離（0に近いほど類似、0-1の範囲）
   */
  calculate(a: string, b: string): number {
    // IDをパースして各要素を取得
    const partsA = this.parseId(a);
    const partsB = this.parseId(b);

    // パースに失敗した場合はレーベンシュタイン距離を使用
    if (!partsA || !partsB) {
      return this.fallbackDistance(a, b);
    }

    // 各要素の距離を計算
    let totalDistance = 0;

    totalDistance +=
      this.weights.level * this.componentDistance(partsA.level, partsB.level);
    totalDistance +=
      this.weights.scope * this.componentDistance(partsA.scope, partsB.scope);
    totalDistance +=
      this.weights.semantic *
      this.componentDistance(partsA.semantic, partsB.semantic);
    totalDistance +=
      this.weights.hash * this.componentDistance(partsA.hash, partsB.hash);
    totalDistance +=
      this.weights.version *
      this.componentDistance(partsA.version, partsB.version);

    return totalDistance;
  }

  /**
   * トレーサビリティIDをパースして各要素を取得
   * @param id トレーサビリティID
   * @returns パース結果（失敗時はnull）
   */
  private parseId(
    id: string,
  ): {
    level: string;
    scope: string;
    semantic: string;
    hash: string;
    version: string;
  } | null {
    // パターン: {level}:{scope}:{semantic}-{hash}#{version}
    const pattern =
      /^([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)-([a-zA-Z0-9]+)#([a-zA-Z0-9]+)$/;
    const match = id.match(pattern);

    if (!match) {
      return null;
    }

    return {
      level: match[1],
      scope: match[2],
      semantic: match[3],
      hash: match[4],
      version: match[5],
    };
  }

  /**
   * 個別の要素の距離を計算（正規化されたレーベンシュタイン距離）
   * @param a 要素A
   * @param b 要素B
   * @returns 距離（0-1の範囲）
   */
  private componentDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0 && b.length === 0) return 0;
    if (a.length === 0 || b.length === 0) return 1;

    // レーベンシュタイン距離を計算
    const distance = this.levenshteinDistance(a, b);

    // 最大文字列長で正規化（0-1の範囲に）
    const maxLen = Math.max(a.length, b.length);
    return distance / maxLen;
  }

  /**
   * レーベンシュタイン距離を計算
   * @param a 文字列A
   * @param b 文字列B
   * @returns レーベンシュタイン距離
   */
  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }

    return dp[m][n];
  }

  /**
   * フォールバック距離計算（パースに失敗した場合）
   * @param a 文字列A
   * @param b 文字列B
   * @returns 正規化されたレーベンシュタイン距離
   */
  private fallbackDistance(a: string, b: string): number {
    const distance = this.levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen > 0 ? distance / maxLen : 0;
  }
}
