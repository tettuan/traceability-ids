---
name: analyze
description: Generates a deep document improvement report for traceability IDs. Runs CLI metrics, reads actual documents, and produces a report with concrete content summaries. Use when user wants document quality analysis, coverage check, gap detection, or improvement recommendations.
user-invocable: true
argument-hint: "[input-dir]"
---

# Analyze: トレーサビリティID 文書改善レポート

トレーサビリティIDのメトリクス分析と実文書の内容分析を組み合わせ、
具体的な改善箇所と要約を含む深いレポートを生成する。

## 実行フロー（4ステップ）

以下の4ステップを**順番に**実行する。各ステップの詳細は参照ファイルを参照。

### Step 1: メトリクス生成
→ 詳細: [step1-metrics.md](step1-metrics.md)

Bashで analyze CLI を実行し、機械的メトリクスレポートを生成する。

```bash
INPUT_DIR="${ARGUMENTS:-data/}"
deno run --allow-read --allow-write analyze.ts "$INPUT_DIR" --output tmp/analyze-report.md
```

出力: `tmp/analyze-report.md`（Level×Scope表、チェーン完成率、近似ID、改善アクション等）

### Step 2: 問題トリアージ
→ 詳細: [step2-triage.md](step2-triage.md)

`tmp/analyze-report.md` をReadで読み、重点分析すべき問題を特定する。

抽出対象:
1. **CRITICAL** — 上位要件(req)なしで仕様/設計のみのスコープ
2. **HIGH** — reqはあるが仕様展開なしのスコープ
3. **近似IDペア** — 統合候補（距離<0.1）
4. **高重複ID** — 多ファイル出現（>5ファイル）

結果: 最大10件の重点調査対象リストを作成（スコープ名 + 問題種別）

### Step 3: 実文書分析
→ 詳細: [step3-document-review.md](step3-document-review.md)

Step 2で特定した問題箇所について、実際の文書ファイルを読んで内容を把握する。

各問題について:
1. **Grep** で該当スコープのIDを含むファイルを特定
2. **Read** で該当ファイルを読み、以下を把握:
   - そのスコープが扱っている機能/要件の概要
   - 文書の見出し構造と記述の詳細度
   - 欠けている情報（要件の根拠、仕様の詳細、設計判断等）
3. 問題ごとに**具体的な所見**をまとめる:
   - 何が書かれているか（現状の要約）
   - 何が足りないか（具体的な欠損内容）
   - どう改善すべきか（具体的なアクション）

### Step 4: 統合レポート生成
→ テンプレート: [step4-report-template.md](step4-report-template.md)

メトリクス（Step 1）と文書分析（Step 3）を統合し、最終レポートを生成する。

```
Write で tmp/analyze-deep-report.md に出力
```

レポートはテンプレートに従い、以下を含む:
- サマリースコアカード（4観点の評価）
- 機械的メトリクス（CLIレポートの要約）
- **重点問題の詳細分析**（実文書内容の要約付き）
- 優先度付き改善アクション一覧（具体的な記述を含む）

## ID形式

```
{level}:{scope}:{semantic}-{hash}#{version}
例: req:apikey:security-4f7b2e#20251111a
```

## Level階層モデル

```
req（要件）→ us（ユーザーストーリー）→ spc（仕様）→ dsg（設計）
req（要件）→ nfr（非機能要件）→ spec（仕様概要）
frq（機能要件）→ spc（仕様）
inv（調査）= 独立（チェーン不要）
```

上位: req, nfr, frq / 下位: us, spc, spec, dsg / 独立: inv

## 判定基準

| メトリクス       | A (良好) | B (普通) | C (要改善) | D (要対応) |
| ---------------- | -------- | -------- | ---------- | ---------- |
| カバレッジ率     | ≥80%     | ≥60%     | ≥40%       | <40%       |
| チェーン完成率   | ≥70%     | ≥50%     | ≥30%       | <30%       |
| 仕様化率(spc/req)| ≥0.7     | ≥0.5     | ≥0.3       | <0.3       |
| バージョン鮮度   | ≥80%     | ≥60%     | ≥40%       | <40%       |
| 近似ID率         | <1%      | <3%      | <5%        | ≥5%        |
| 孤立スコープ率   | 0%       | <10%     | <20%       | ≥20%       |
