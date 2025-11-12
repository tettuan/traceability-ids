# Argument Parser Refactoring Proposal

## 背景

現在、各CLIエントリーポイント（search.ts, extract.ts, src/cli.ts）で引数のパースと検証を個別に実装しています。これはテスト戦略の観点から以下の課題があります：

1. **テスト困難性**: main関数全体をテストする必要があり、引数パースロジックの単体テストができない
2. **重複**: 類似のパース/検証ロジックが複数箇所に存在
3. **保守性**: 引数仕様変更時、複数ファイルを修正する必要

## 提案: 引数パーサーモジュールの作成

### 新規モジュール構造

```
src/cli/
├── clustering-factory.ts  (既存)
├── distance-factory.ts    (既存)
├── parsers/               (新規)
│   ├── search-args.ts     # 検索モード引数パーサー
│   ├── extract-args.ts    # 抽出モード引数パーサー
│   ├── cluster-args.ts    # クラスタモード引数パーサー
│   └── types.ts           # パース結果の型定義
```

### 設計例

```typescript
// src/cli/parsers/types.ts
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// src/cli/parsers/search-args.ts
export interface SearchArgs {
  inputDir: string;
  outputFile?: string;
  query: string;
  distance: string;
  top?: number;
  showDistance: boolean;
  format: "json" | "markdown" | "csv" | "simple";
}

export function parseSearchArgs(args: string[]): ParseResult<SearchArgs> {
  const parsed = parseArgs(args, {
    string: ["query", "top", "distance", "format", "output"],
    boolean: ["help", "show-distance"],
    default: {
      distance: "cosine",
      format: "simple",
    },
  });

  // Validation
  const errors: string[] = [];

  if (parsed._.length < 1) {
    errors.push("Missing required argument: <input-dir>");
  }

  if (!parsed.query) {
    errors.push("Missing required option: --query");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      inputDir: String(parsed._[0]),
      outputFile: parsed.output ? String(parsed.output) : undefined,
      query: parsed.query,
      distance: parsed.distance,
      top: parsed.top ? parseInt(parsed.top) : undefined,
      showDistance: parsed["show-distance"] === true,
      format: parsed.format as "json" | "markdown" | "csv" | "simple",
    },
  };
}
```

### エントリーポイントの簡素化

```typescript
// search.ts (改善後)
import { parseSearchArgs } from "./src/cli/parsers/search-args.ts";
import { runSearchMode } from "./src/modes/search.ts";

async function main() {
  const result = parseSearchArgs(Deno.args);

  if (!result.success) {
    console.error("Error:");
    result.errors?.forEach(err => console.error(`  - ${err}`));
    showUsage();
    Deno.exit(1);
  }

  try {
    await runSearchMode(result.data!);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}
```

## テスト戦略への影響

### メリット

#### 1. 単体テストが可能

```typescript
// src/cli/parsers/search-args.test.ts
import { assertEquals } from "jsr:@std/assert";
import { parseSearchArgs } from "./search-args.ts";

Deno.test("parseSearchArgs - valid arguments", () => {
  const result = parseSearchArgs(["./data", "--query", "auth"]);

  assertEquals(result.success, true);
  assertEquals(result.data?.inputDir, "./data");
  assertEquals(result.data?.query, "auth");
  assertEquals(result.data?.distance, "cosine"); // default
});

Deno.test("parseSearchArgs - missing query", () => {
  const result = parseSearchArgs(["./data"]);

  assertEquals(result.success, false);
  assertEquals(result.errors?.length, 1);
  assertEquals(result.errors?.[0], "Missing required option: --query");
});

Deno.test("parseSearchArgs - options in any order", () => {
  const args1 = ["./data", "--query", "auth", "--top", "5"];
  const args2 = ["--query", "auth", "./data", "--top", "5"];
  const args3 = ["--top", "5", "--query", "auth", "./data"];

  const result1 = parseSearchArgs(args1);
  const result2 = parseSearchArgs(args2);
  const result3 = parseSearchArgs(args3);

  assertEquals(result1.success, true);
  assertEquals(result2.success, true);
  assertEquals(result3.success, true);
  assertEquals(result1.data?.top, 5);
  assertEquals(result2.data?.top, 5);
  assertEquals(result3.data?.top, 5);
});
```

#### 2. エラーハンドリングの改善

```typescript
Deno.test("parseSearchArgs - invalid top value", () => {
  const result = parseSearchArgs(["./data", "--query", "auth", "--top", "abc"]);

  assertEquals(result.success, false);
  assertEquals(result.errors?.[0], "Invalid value for --top: must be a number");
});

Deno.test("parseSearchArgs - unknown option", () => {
  const result = parseSearchArgs(["./data", "--query", "auth", "--unknown", "value"]);

  // parseArgs doesn't fail on unknown options by default
  // but we can add custom validation
  assertEquals(result.success, true);
});
```

#### 3. BreakdownLoggerとの統合

```typescript
import { BreakdownLogger } from "@tettuan/breakdownlogger";

export function parseSearchArgs(args: string[]): ParseResult<SearchArgs> {
  const logger = new BreakdownLogger("cli/search-args");

  logger.debug("Parsing search arguments", { args });

  const parsed = parseArgs(args, { /* ... */ });

  logger.debug("Parse result", { parsed });

  // Validation with logging
  if (parsed._.length < 1) {
    logger.warn("Missing input directory");
    return { success: false, errors: ["Missing required argument: <input-dir>"] };
  }

  logger.info("Arguments parsed successfully", {
    inputDir: parsed._[0],
    query: parsed.query,
  });

  return { success: true, data: { /* ... */ } };
}
```

### デメリット

1. **抽象化レイヤーの追加**: 小規模プロジェクトでは過剰設計の可能性
2. **初期コスト**: リファクタリングの時間が必要
3. **学習コスト**: 新しいモジュール構造の理解が必要

## 推奨事項

### 段階的な導入

**Phase 1**: 1つのモード（search）でプロトタイプ実装
- `src/cli/parsers/search-args.ts` を作成
- 包括的なテストを追加
- 既存のsearch.tsを更新

**Phase 2**: 他のモードへの展開
- extract, cluster モードにも同様の構造を適用
- 共通バリデーション関数の抽出

**Phase 3**: 共通化の促進
- 共通のバリデーションロジックを `src/cli/parsers/validators.ts` に抽出
- 型定義の整理とドキュメント化

### 採用基準

以下の条件を満たす場合、引数パーサーの独立化を推奨：

✅ **推奨**:
- プロジェクトが成長し、CLIオプションが増加している
- 複数の開発者が関与している
- 引数パースのバグが頻繁に発生している
- 包括的なテストカバレッジが求められている

❌ **不要**:
- プロジェクトが小規模で安定している
- CLIオプションの追加/変更が稀
- 単一開発者のみ
- 現在の実装で問題が発生していない

## 結論

**現時点での推奨**: **段階的導入を検討**

理由:
1. ✅ プロジェクトは成長中（3つのモード、多数のオプション）
2. ✅ テスト戦略を重視している（breakdownlogger導入済み）
3. ✅ リファクタリング済み（責務分離が進んでいる）
4. ⚠️  但し、過剰設計のリスクもある

**提案**: まずは1つのモード（search）で試験実装し、効果を検証してから全モードに展開する。テストカバレッジの向上と保守性の改善が確認できれば、継続して展開する価値がある。

## 実装タスク（Phase 1）

1. [ ] `src/cli/parsers/types.ts` を作成
2. [ ] `src/cli/parsers/search-args.ts` を作成
3. [ ] `src/cli/parsers/search-args.test.ts` を作成（15+ テストケース）
4. [ ] `search.ts` をリファクタリング
5. [ ] 既存の動作確認（example:search の実行）
6. [ ] ドキュメント更新（test-strategy.md）

推定時間: 2-3時間
