import type { DistanceCalculator } from "./calculator.ts";

/**
 * ジャロ・ウィンクラー距離を計算
 * 短い文字列の類似度測定に適し、接頭辞に重みをつける
 */
export class JaroWinklerDistance implements DistanceCalculator {
  readonly name = "jaro-winkler";

  /**
   * コンストラクタ
   * @param prefixScale 接頭辞のスケーリング係数（0.0-0.25、デフォルト: 0.1）
   */
  constructor(private prefixScale: number = 0.1) {
    if (prefixScale < 0 || prefixScale > 0.25) {
      throw new Error("Prefix scale must be between 0.0 and 0.25");
    }
  }

  /**
   * ジャロ・ウィンクラー距離を計算
   * @param a 文字列A
   * @param b 文字列B
   * @returns 距離（0に近いほど類似、0-1の範囲）
   */
  calculate(a: string, b: string): number {
    const similarity = this.jaroWinklerSimilarity(a, b);
    // 類似度を距離に変換（1 - similarity）
    return 1 - similarity;
  }

  /**
   * ジャロ・ウィンクラー類似度を計算
   * @param a 文字列A
   * @param b 文字列B
   * @returns 類似度（0-1の範囲、1に近いほど類似）
   */
  private jaroWinklerSimilarity(a: string, b: string): number {
    // 空文字列の処理
    if (a.length === 0 && b.length === 0) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    // ジャロ類似度を計算
    const jaroSim = this.jaroSimilarity(a, b);

    // 共通接頭辞の長さを計算（最大4文字）
    let prefixLen = 0;
    const maxPrefix = Math.min(4, Math.min(a.length, b.length));
    for (let i = 0; i < maxPrefix; i++) {
      if (a[i] === b[i]) {
        prefixLen++;
      } else {
        break;
      }
    }

    // ジャロ・ウィンクラー類似度を計算
    return jaroSim + prefixLen * this.prefixScale * (1 - jaroSim);
  }

  /**
   * ジャロ類似度を計算
   * @param a 文字列A
   * @param b 文字列B
   * @returns ジャロ類似度（0-1の範囲）
   */
  private jaroSimilarity(a: string, b: string): number {
    const aLen = a.length;
    const bLen = b.length;

    // マッチング距離（一致とみなす最大距離）
    const matchDistance = Math.floor(Math.max(aLen, bLen) / 2) - 1;
    if (matchDistance < 0) return a === b ? 1.0 : 0.0;

    // マッチングした文字を記録
    const aMatches = new Array(aLen).fill(false);
    const bMatches = new Array(bLen).fill(false);

    let matches = 0;
    let transpositions = 0;

    // マッチングを検出
    for (let i = 0; i < aLen; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, bLen);

      for (let j = start; j < end; j++) {
        if (bMatches[j] || a[i] !== b[j]) continue;
        aMatches[i] = true;
        bMatches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // 転置を検出
    let k = 0;
    for (let i = 0; i < aLen; i++) {
      if (!aMatches[i]) continue;
      while (!bMatches[k]) k++;
      if (a[i] !== b[k]) transpositions++;
      k++;
    }

    // ジャロ類似度を計算
    return (
      (matches / aLen +
        matches / bLen +
        (matches - transpositions / 2) / matches) / 3.0
    );
  }
}
