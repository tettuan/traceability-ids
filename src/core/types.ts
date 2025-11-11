/**
 * トレーサビリティID
 */
export interface TraceabilityId {
  /** 完全なID文字列 */
  fullId: string;
  /** {level}: コロンの前の文字列 */
  level: string;
  /** {scope}: 最初のコロンと2番目のコロンの間の文字列 */
  scope: string;
  /** {semantic}: 2番目のコロン後からハイフンまでの文字列 */
  semantic: string;
  /** {hash}: ハイフン後からハッシュ記号までの文字列 */
  hash: string;
  /** {version}: ハッシュ記号後の文字列 */
  version: string;
  /** IDが見つかったファイルパス */
  filePath: string;
  /** ファイル内での行番号 */
  lineNumber: number;
}

/**
 * クラスタ
 */
export interface Cluster {
  /** クラスタに含まれるID */
  items: TraceabilityId[];
  /** クラスタの代表ID（オプション） */
  centroid?: TraceabilityId;
  /** クラスタID */
  id: number;
}

/**
 * クラスタリング結果
 */
export interface ClusteringResult {
  /** クラスタの配列 */
  clusters: Cluster[];
  /** 使用したアルゴリズム名 */
  algorithm: string;
  /** 使用した距離計算手法 */
  distanceCalculator: string;
}

/**
 * 類似度検索の1件の結果
 */
export interface SimilarityItem {
  /** ID情報 */
  id: TraceabilityId;
  /** クエリとの距離スコア */
  distance: number;
}

/**
 * 類似度検索結果
 */
export interface SimilaritySearchResult {
  /** 検索クエリ */
  query: string;
  /** 類似度順にソートされたID配列 */
  items: SimilarityItem[];
  /** 使用した距離計算手法 */
  distanceCalculator: string;
}
