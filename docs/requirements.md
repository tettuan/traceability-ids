# 要件定義

## 概要

*.md
ファイル内に存在するトレーサビリティIDを抽出し、類似度に基づいてクラスタリングした一覧を作成する。

## 機能要件

### 1. ファイルスキャン

指定されたディレクトリの *.md ファイルを再帰的に対象とする。

- サブディレクトリも含めて全ての .md ファイルを走査
- ファイルパスを記録する

### 2. トレーサビリティID抽出

対象ファイルからトレーサビリティIDをパターンマッチで全件抽出する。

- パターン書式: `{level}:{scope}:{semantic}-{hash}#{version}`
- 抽出方法: 正規表現マッチング
- 各要素:
  - `{level}`: コロンの前の文字列
  - `{scope}`: 最初のコロンと2番目のコロンの間の文字列
  - `{semantic}`: 2番目のコロン後からハイフンまでの文字列
  - `{hash}`: ハイフン後からハッシュ記号までの文字列
  - `{version}`: ハッシュ記号後の文字列

### 3. 類似度クラスタリング

抽出されたすべてのIDを、類似度でクラスタリングする。

- 名称順（アルファベット順）ではなく、類似度を使用
- クラスタリング手法:
  - ID文字列の類似度計算
  - 類似度の高いIDをグループ化
- パターンが近いIDをまとめる

### 4. クラスタ内ソート

各クラスタ内でIDをソートする。

- クラスタ内での並び順を決定
- ソート方法は実装時に決定

### 5. 類似度検索（Similarity Search）

**新機能要求**: 特定のキーワードやIDを基準として、それに近いIDを距離順に並べる。

#### ユースケース

- 「security に関連するIDを探したい」
- 「特定のID `req:apikey:encryption-6d3a9c#20251111a` に類似するIDを見つけたい」
- 類似度の高い順にソートされたID一覧を取得

#### 機能仕様

1. **クエリの指定**
   - 完全なID文字列（例：`req:apikey:security-4f7b2e#20251111a`）
   - 部分文字列やキーワード（例：`security`）
   - semantic部分のみ（例：`encryption`）

2. **距離計算**
   - 抽出された全IDとクエリ文字列との距離を計算
   - 指定された距離計算手法を使用（levenshtein, structural等）

3. **ソートと出力**
   - 距離の近い順（類似度の高い順）にソート
   - オプションで上位N件のみ出力可能
   - 距離スコアも併せて出力

#### 出力例

```
# Query: security
# Distance calculator: structural
# Top 10 results

req:apikey:security-4f7b2e#20251111a (distance: 0.000)
req:apikey:encryption-6d3a9c#20251111a (distance: 0.245)
req:apikey:deletion-4e7c2d#20251111a (distance: 0.312)
req:apikey:compliance-5a8d4b#20251111a (distance: 0.398)
...
```

#### CLI インターフェース案

```bash
# 完全なIDから類似検索
deno run --allow-read --allow-write src/cli.ts ./data ./output/similar.txt \
  --mode search \
  --query "req:apikey:security-4f7b2e#20251111a" \
  --top 10

# キーワードから検索（semantic部分にマッチするIDを探す）
deno run --allow-read --allow-write src/cli.ts ./data ./output/similar.txt \
  --mode search \
  --query "security" \
  --distance structural \
  --top 20

# 距離スコア付きで全件出力
deno run --allow-read --allow-write src/cli.ts ./data ./output/similar.txt \
  --mode search \
  --query "encryption" \
  --show-distance
```

#### 技術的検討

- クラスタリングとは異なるモード（`--mode cluster` / `--mode search`）
- 既存の距離計算機能を再利用
- 1対多の距離計算（クエリ vs 全ID）
- ソートアルゴリズム: 単純な距離順ソート

## 出力形式

クラスタリングされた結果を出力する。

- クラスタごとにグループ化されたID一覧
- 各IDの出現元ファイルパス

### 対応フォーマット

1. **JSON形式** - 構造化データとして出力
2. **Markdown形式** - 人間が読みやすい形式
3. **CSV形式** - スプレッドシート等で利用可能

## CLI インターフェース

### 必須引数

1. **調査対象ディレクトリ** - トレーサビリティIDを検索する最上位ディレクトリ
2. **出力先ファイルパス** - クラスタリング結果を書き込むファイル

### オプション引数

- クラスタリングアルゴリズムの選択
- 距離計算手法の選択
- 出力フォーマットの選択（JSON/Markdown/CSV）
- アルゴリズム固有のパラメータ

### 実行例

```bash
deno run --allow-read --allow-write src/cli.ts <input-dir> <output-file> [options]
```

## 技術的制約

- Deno 最新版を使用
- Pure TypeScript で実装（外部ライブラリ依存なし）
- JSR公開を想定した設計

## アーキテクチャ設計

### クラスタリングアルゴリズムの切り替え

Strategy
パターンを使用し、クラスタリングアルゴリズムを実行時に切り替え可能にする。

#### 実装候補アルゴリズム

1. **階層的クラスタリング (Hierarchical Clustering)**
   - 凝集型（Agglomerative）: ボトムアップで結合
   - 分割型（Divisive）: トップダウンで分割

2. **K-Means クラスタリング**
   - 事前にクラスタ数を指定
   - 反復的にクラスタ中心を更新

3. **DBSCAN (Density-Based Spatial Clustering)**
   - 密度ベースのクラスタリング
   - クラスタ数を事前に指定不要

### 類似度計算の切り替え

文字列間の距離・類似度計算も切り替え可能にする。

#### 実装候補

1. **レーベンシュタイン距離 (Levenshtein Distance)**
   - 編集距離ベース
   - 挿入・削除・置換の回数

2. **ジャロ・ウィンクラー距離 (Jaro-Winkler Distance)**
   - 短い文字列の類似度測定に適する
   - 接頭辞に重みをつける

3. **コサイン類似度 (Cosine Similarity)**
   - ベクトル化した文字列の角度
   - n-gram ベースで計算

4. **構造的類似度**
   - IDパターン `{level}:{scope}:{semantic}-{hash}#{version}`
     の各要素を個別に比較
   - 重み付け可能

### インターフェース設計

```typescript
// クラスタリングアルゴリズムのインターフェース
interface ClusteringAlgorithm {
  cluster(items: string[], distanceMatrix: number[][]): Cluster[];
}

// 距離計算のインターフェース
interface DistanceCalculator {
  calculate(a: string, b: string): number;
}

// クラスタ結果
interface Cluster {
  items: string[];
  centroid?: string;
}
```
