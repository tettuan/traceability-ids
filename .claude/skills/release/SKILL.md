---
name: release
description: Create a release with semver branch, merge to main, and tag
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
argument-hint: [patch|minor|major]
---

# Release Skill

JSR公開プロジェクトのリリース手順を実行します。

## 使用方法

```
/release patch   # パッチリリース (0.0.6 -> 0.0.7)
/release minor   # マイナーリリース (0.0.6 -> 0.1.0)
/release major   # メジャーリリース (0.0.6 -> 1.0.0)
```

## 実行手順

引数 `$ARGUMENTS` を取得し、以下の手順を実行してください。

### 1. 現在のバージョン確認

```bash
# deno.json からバージョンを取得
grep '"version"' deno.json
```

### 2. 新しいバージョン番号を計算

- `patch`: z を +1 (例: 0.0.6 -> 0.0.7)
- `minor`: y を +1, z を 0 に (例: 0.0.6 -> 0.1.0)
- `major`: x を +1, y,z を 0 に (例: 0.0.6 -> 1.0.0)

### 3. release ブランチの作成

```bash
git checkout -b release/v{NEW_VERSION}
```

### 4. バージョン更新

以下のファイルのバージョンを更新:
- `deno.json` の `"version"` フィールド
- `jsr.json` の `"version"` フィールド (存在する場合、deno.json と同じバージョンに)

### 5. 変更をコミット

```bash
git add deno.json jsr.json
git commit -m "Bump version to {NEW_VERSION}"
```

### 6. main ブランチへマージ

```bash
git checkout main
git merge release/v{NEW_VERSION} --no-ff -m "Merge release/v{NEW_VERSION}"
```

### 7. バージョンタグの作成

```bash
git tag v{NEW_VERSION}
```

### 8. リモートへプッシュ (確認を取る)

ユーザーに確認を取ってから:

```bash
git push origin main
git push origin v{NEW_VERSION}
```

### 9. release ブランチの削除 (オプション)

```bash
git branch -d release/v{NEW_VERSION}
```

## 注意事項

- main ブランチに未コミットの変更がないことを確認してください
- テストが通ることを確認してください (`deno task test`)
- タグはプッシュ後に削除できないため、慎重に実行してください

## 確認項目

リリース前に以下を確認:
1. [ ] 全テストがパス
2. [ ] deno.json と jsr.json のバージョンが一致
3. [ ] 変更履歴が適切に記録されている
