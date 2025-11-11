import type { DistanceCalculator } from "./calculator.ts";

/**
 * コサイン類似度を計算（n-gramベース）
 * 文字列をn-gramでベクトル化し、ベクトル間の角度を計算
 */
export class CosineDistance implements DistanceCalculator {
  readonly name = "cosine";

  /**
   * コンストラクタ
   * @param n n-gramのサイズ（デフォルト: 2 = bigram）
   */
  constructor(private n: number = 2) {
    if (n < 1) {
      throw new Error("n-gram size must be at least 1");
    }
  }

  /**
   * コサイン距離を計算
   * @param a 文字列A
   * @param b 文字列B
   * @returns 距離（0に近いほど類似、0-1の範囲）
   */
  calculate(a: string, b: string): number {
    const similarity = this.cosineSimilarity(a, b);
    // 類似度を距離に変換（1 - similarity）
    return 1 - similarity;
  }

  /**
   * コサイン類似度を計算
   * @param a 文字列A
   * @param b 文字列B
   * @returns 類似度（0-1の範囲、1に近いほど類似）
   */
  private cosineSimilarity(a: string, b: string): number {
    // 空文字列の処理
    if (a.length === 0 && b.length === 0) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    // n-gramを生成
    const ngramsA = this.getNgrams(a);
    const ngramsB = this.getNgrams(b);

    // ベクトル化（頻度カウント）
    const vectorA = new Map<string, number>();
    const vectorB = new Map<string, number>();

    for (const ngram of ngramsA) {
      vectorA.set(ngram, (vectorA.get(ngram) || 0) + 1);
    }

    for (const ngram of ngramsB) {
      vectorB.set(ngram, (vectorB.get(ngram) || 0) + 1);
    }

    // 全てのユニークなn-gramを取得
    const allNgrams = new Set([...vectorA.keys(), ...vectorB.keys()]);

    // 内積を計算
    let dotProduct = 0;
    for (const ngram of allNgrams) {
      const valA = vectorA.get(ngram) || 0;
      const valB = vectorB.get(ngram) || 0;
      dotProduct += valA * valB;
    }

    // ベクトルのノルムを計算
    let normA = 0;
    let normB = 0;

    for (const val of vectorA.values()) {
      normA += val * val;
    }

    for (const val of vectorB.values()) {
      normB += val * val;
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    // コサイン類似度を計算
    if (normA === 0 || normB === 0) return 0.0;

    return dotProduct / (normA * normB);
  }

  /**
   * 文字列からn-gramを生成
   * @param str 文字列
   * @returns n-gramの配列
   */
  private getNgrams(str: string): string[] {
    const ngrams: string[] = [];

    // 文字列が短い場合は文字列全体を1つのn-gramとして扱う
    if (str.length < this.n) {
      return [str];
    }

    // n-gramを生成
    for (let i = 0; i <= str.length - this.n; i++) {
      ngrams.push(str.substring(i, i + this.n));
    }

    return ngrams;
  }
}
