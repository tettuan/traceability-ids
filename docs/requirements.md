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

**既存機能**:
特定のキーワードやIDを基準として、それに**類似した**IDを距離計算で探し、距離順に並べる。

**重要**:
このモードは実際のファイル検索（grep）ではなく、ID文字列間の距離計算による類似度検索です。

#### ユースケース

- 「"security"
  という文字列に類似したIDを探したい」（文字列マッチングではなく、距離計算）
- 「特定のID `req:apikey:encryption-6d3a9c#20251111a`
  に類似する構造のIDを見つけたい」
- 類似度の高い順にソートされたID一覧を取得（ファイル内容は返さない）

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

#### デフォルト設定の最適化

実データでのテスト結果に基づき、各モードに最適な距離計算方法を選定：

**クラスタリングモード（cluster）:**

- デフォルト距離計算: `structural`
- デフォルトthreshold: `0.3`
- 理由: ID構造（level, scope等）を考慮してscopeごとにグループ化
- 結果: 120 IDsを13クラスタにグループ化（scopeベースで適切に分類）

**類似度検索モード（search）:**

- デフォルト距離計算: `cosine`
- 理由: n-gramベースでキーワード検索に強い
- 例: "apikey"クエリで`req:apikey:api-mgmt`が最上位（distance: 0.543）

これらのデフォルト設定により、ユーザーは距離計算方法を指定せずとも最適な結果が得られる。

### 6. コンテキスト抽出（Context Extraction / Extract Mode）

**新機能要求**:
指定された複数のIDを使って、実際にファイルから該当箇所をgrep的に検索し、前後の行を含めてコンテキストを抽出する。

**類似度検索（searchモード）との違い**:

- **searchモード**: ID文字列の類似度計算 → 似たIDを見つける → ID一覧を返す
- **extractモード**: 指定されたIDでファイル検索 → 該当箇所を特定 →
  前後のテキストを返す

#### ユースケース

- 「特定のID `req:apikey:security-4f7b2e#20251111a`
  が実際にどこで使われているか、grep的に探したい」
- 「複数のID（3個や5個）の使用箇所を一括で検索し、前後の文脈を確認したい」
- 「IDの前後数行を含めてコンテキストを把握したい」（grepの-A、-Bオプションのようなイメージ）

#### 機能仕様

1. **ID指定**
   - 複数のIDを指定可能（コマンドライン引数、またはファイルから読み込み）
   - 完全なID文字列のみ（例：`req:apikey:security-4f7b2e#20251111a`）
   - スペース区切りまたは改行区切りで複数指定

2. **ファイル検索と位置特定**
   - 指定されたディレクトリ内の *.md ファイルから該当IDを検索
   - 各IDの出現箇所を特定（ファイルパス、行番号）
   - 同じIDが複数ファイルに出現する場合はすべて抽出

3. **コンテキスト抽出**
   - 該当行の前N行、後M行を抽出（N, Mは指定可能）
   - デフォルト: 前3行、後10行
   - ファイルの先頭・末尾を超える場合は範囲を調整

4. **出力形式**
   - IDごとにセクション分け
   - ファイルパスと行番号を明示
   - 該当行をハイライト（マーカー付き）
   - 前後の行番号も表示

#### 出力例

```markdown
# Context Extraction Results

## ID: req:apikey:security-4f7b2e#20251111a

### Location: /path/to/requirements.md:42
```

38: ## Security Requirements 39: 40: The API key system must ensure the
following security measures: 41:

>>> 42: [req:apikey:security-4f7b2e#20251111a] API keys must be encrypted at
>>> rest 43: 44: All API keys stored in the database must use AES-256
>>> encryption. 45: The encryption keys must be stored in a separate secure
>>> vault. 46: 47: ### Key Rotation 48: 49: Keys should be rotated every 90
>>> days. 50: 51: ### Access Control 52:

```
### Location: /path/to/design.md:15
```

12: # Database Schema 13: 14: The api_keys table structure:

>>> 15: - encrypted_key: stores [req:apikey:security-4f7b2e#20251111a] encrypted
>>> API key 16: - created_at: timestamp 17: - expires_at: timestamp 18: 19: ##
>>> Encryption Implementation 20: 21: We use the built-in database encryption...
>>> 22: 23: ## Performance Considerations 24: 25: Index on created_at for
>>> efficient cleanup queries.

```
## ID: req:apikey:encryption-6d3a9c#20251111a

### Location: /path/to/requirements.md:89
```

86: ## Encryption Standards 87: 88: All encryption implementations must follow:

>>> 89: [req:apikey:encryption-6d3a9c#20251111a] Use AES-256-GCM for symmetric
>>> encryption 90: 91: This ensures both confidentiality and authenticity. 92:
>>> 93: ### Key Management ...

```
```

#### CLI インターフェース案

```bash
# 単一IDのコンテキスト抽出（grep的な使い方）
deno run --allow-read src/cli.ts ./data ./output/context.md \
  --mode extract \
  --ids "req:apikey:security-4f7b2e#20251111a" \
  --before 3 \
  --after 10

# 複数ID（スペース区切り）を一括検索
deno run --allow-read src/cli.ts ./data ./output/context.md \
  --mode extract \
  --ids "req:apikey:security-4f7b2e#20251111a req:apikey:encryption-6d3a9c#20251111a" \
  --before 5 \
  --after 15

# ファイルからID一覧を読み込んで一括検索
deno run --allow-read src/cli.ts ./data ./output/context.md \
  --mode extract \
  --ids-file ./ids-to-extract.txt \
  --before 3 \
  --after 10

# JSON形式で出力
deno run --allow-read src/cli.ts ./data ./output/context.json \
  --mode extract \
  --ids "req:apikey:security-4f7b2e#20251111a" \
  --format json

# searchモード（類似度検索）と組み合わせて使う例
# ステップ1: "security"に類似したIDを距離計算で探す
deno run --allow-read --allow-write src/cli.ts ./data ./tmp/similar-ids.txt \
  --mode search \
  --query "security" \
  --top 5 \
  --format simple

# ステップ2: 見つかったIDの実際の使用箇所をファイルから検索・抽出
deno run --allow-read src/cli.ts ./data ./output/context.md \
  --mode extract \
  --ids-file ./tmp/similar-ids.txt
```

#### モードの使い分け

| モード  | 目的               | 入力         | 出力                     | イメージ               |
| ------- | ------------------ | ------------ | ------------------------ | ---------------------- |
| cluster | IDをグループ化     | ディレクトリ | クラスタ化されたID一覧   | クラスタリング分析     |
| search  | 類似IDを探す       | クエリ文字列 | 類似度順のID一覧         | 距離計算による類似検索 |
| extract | IDの使用箇所を探す | ID一覧       | 該当箇所と前後のテキスト | grep -A -B             |

#### 技術的検討

1. **実装方針**
   - 既存の `scanFiles()` と `extractIds()` を再利用
   - 新しいモード: `--mode extract`
   - IDリストを入力として受け取る
   - ファイルを再スキャンして該当行の前後を抽出

2. **データ構造**
   ```typescript
   interface ContextExtractionRequest {
     ids: string[]; // 抽出対象のID一覧
     before: number; // 前N行
     after: number; // 後M行
   }

   interface ExtractedContext {
     id: string;
     locations: LocationContext[];
   }

   interface LocationContext {
     filePath: string;
     lineNumber: number;
     targetLine: string; // 該当行
     beforeLines: string[]; // 前N行
     afterLines: string[]; // 後M行
   }
   ```

3. **処理フロー**
   - ID一覧を読み込み（引数 or ファイル）
   - ファイルをスキャン
   - 各IDについて:
     - ファイル内を検索
     - 該当行を特定
     - 前後N/M行を抽出
   - 結果を整形して出力

4. **既存機能との統合**
   - クラスタリング結果から特定クラスタのIDを抽出 → コンテキスト抽出
   - 類似度検索結果の上位N件 → コンテキスト抽出
   - パイプライン的な使用を想定

#### セキュリティ考慮事項

- ファイル読み込み権限のみ（書き込み不要）
- パストラバーサル対策（指定ディレクトリ外のファイルアクセス防止）
- 大きなファイルに対するメモリ使用量の制限

#### 制約事項

1. **行の最大文字数**
   - 1行あたり最大300文字（マルチバイト文字を含む）
   - 300文字を超える行は切り詰める

2. **前後行数の制限**
   - `--before` の最大値: 50行
   - `--after` の最大値: 50行
   - 合計で最大101行（before 50 + target 1 + after 50）

3. **権限要求**
   - 読み込み権限のみ（`--allow-read`）
   - 書き込み権限は不要（出力ファイルへの書き込みのみ`--allow-write`が必要だが、ファイルシステムへの変更はなし）

4. **出力の整形**
   - 連続した空行を削除（2つ以上連続する空行は1つにまとめる）
   - ファイルの前後の不要な空白を削除
   - コンテキスト表示の可読性を向上

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
