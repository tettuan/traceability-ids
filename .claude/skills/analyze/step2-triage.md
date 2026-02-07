# Step 2: 問題トリアージ

## 目的

メトリクスレポートから重点調査すべき問題を最大10件に絞り込む。
すべてを深堀りするのではなく、影響度の高い問題に集中する。

## 手順

### 1. メトリクスレポートの読み込み

```
Read: tmp/analyze-report.md
```

### 2. サマリースコアの確認

「## 1. サマリー」セクションの評価テーブルを読み取る。
D評価の観点を最優先で調査する。

### 3. 重点問題の抽出

以下の優先順位で問題を抽出し、合計**最大10件**にする:

#### 優先度1: CRITICAL（上位要件なしスコープ）— 最大3件
「## 6. 改善アクション」から `[CRITICAL]` を抽出。
reqなしで spc/dsg のみのスコープ = 根拠不明の仕様/設計。

**抽出するもの**: スコープ名、現在あるレベル、欠損レベル

#### 優先度2: HIGH（展開不足スコープ）— 最大3件
`[HIGH]` を抽出。reqはあるが us/spc がないスコープ = 要件が仕様化されていない。

**抽出するもの**: スコープ名、reqのID数

#### 優先度3: 近似IDペア（統合候補）— 最大2件
「## 4. 重複度分析」の近似IDペア表から、距離が最小のペアを抽出。
同一scope同一levelで距離<0.05 = ほぼ同一内容の重複。

**抽出するもの**: ID-A, ID-B, 距離

#### 優先度4: 高重複ID（多ファイル出現）— 最大2件
「ファイル横断重複」から出現ファイル数が最も多いIDを抽出。

**抽出するもの**: ID, 出現ファイル数

### 4. 調査対象リストの作成

以下の形式で内部的にリストを構成する（レポートには書かない）:

```
調査対象リスト:
1. [CRITICAL] scope=backup: spcのみ、reqなし
2. [CRITICAL] scope=calendar: spcのみ、reqなし
3. [CRITICAL] scope=db: nfr,frq,spcあるがreqなし
4. [HIGH] scope=apikey: reqのみ、spc/usなし
5. [HIGH] scope=dashboard: reqのみ、spc/usなし
6. [NEAR_DUP] req:apikey:overview-1a5f8c#20251111a ≈ #20251111 (dist=0.011)
7. [NEAR_DUP] spc:tauri:command-api-q1r2s3#20260131 ≈ #20260130 (dist=0.013)
8. [CROSS_DUP] dsg:jquants:application-b5c6d7#20260130 → 16ファイル
9. [CROSS_DUP] req:chart:display-overview-a1b2c3#20251229 → 12ファイル
10. [HIGH] scope=gemini-rag: reqのみ、展開なし
```

## 次ステップへの引き渡し

このリストの各項目について、Step 3 で実文書を読んで内容を把握する。
