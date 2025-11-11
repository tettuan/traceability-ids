/**
 * 距離計算インターフェース
 */
export interface DistanceCalculator {
  /**
   * 2つの文字列間の距離を計算
   * @param a 文字列A
   * @param b 文字列B
   * @returns 距離（0に近いほど類似）
   */
  calculate(a: string, b: string): number;

  /**
   * 計算手法の名前
   */
  readonly name: string;
}

/**
 * 距離行列を作成
 * @param items 計算対象の文字列配列
 * @param calculator 距離計算器
 * @returns 距離行列
 */
export function createDistanceMatrix(
  items: string[],
  calculator: DistanceCalculator,
): number[][] {
  const n = items.length;
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distance = calculator.calculate(items[i], items[j]);
      matrix[i][j] = distance;
      matrix[j][i] = distance;
    }
  }

  return matrix;
}
