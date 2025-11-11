import type { DistanceCalculator } from "./calculator.ts";

/**
 * レーベンシュタイン距離（編集距離）を計算
 * 動的計画法で実装
 */
export class LevenshteinDistance implements DistanceCalculator {
  readonly name = "levenshtein";

  /**
   * レーベンシュタイン距離を計算
   * @param a 文字列A
   * @param b 文字列B
   * @returns 編集距離
   */
  calculate(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    // 空文字列の処理
    if (m === 0) return n;
    if (n === 0) return m;

    // DP テーブル
    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    // 初期化
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // DP 計算
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;

        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // 削除
          dp[i][j - 1] + 1, // 挿入
          dp[i - 1][j - 1] + cost, // 置換
        );
      }
    }

    return dp[m][n];
  }
}
