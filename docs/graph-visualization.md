# グラフ可視化モード設計

## 概要

トレーサビリティIDの関係性を3Dインタラクティブグラフとして可視化する。
自己完結型のHTMLファイルを生成し、ブラウザで直接開ける。

## データフロー

```mermaid
flowchart LR
    A[ファイルスキャン] --> B[ID抽出・重複排除]
    B --> C[距離行列作成]
    C --> D[クラスタリング]
    C --> E[MDS座標計算]
    D --> F[グラフデータ構築]
    E --> F
    F --> G[HTML生成]
    G --> H[ファイル出力]
```

## モジュール構成

```
src/visualization/
├── mds.ts            # Classical MDS（Jacobi固有値分解）
├── graph_data.ts     # ノード/エッジ変換、Tab順序計算
└── html_template.ts  # 3d-force-graph HTML生成
src/modes/
└── graph.ts          # グラフモードオーケストレーション
graph.ts              # CLIエントリポイント
```

## 主要コンポーネント

### MDS（多次元尺度構成法）

`src/visualization/mds.ts`

- **入力**: n×n 距離行列
- **出力**: n個の3次元座標 + 固有値
- **アルゴリズム**: Classical MDS（二重中心化 + Jacobi反復固有値分解）
- **用途**: `--layout mds` 時にノード位置を距離行列から算出

### グラフデータ変換

`src/visualization/graph_data.ts`

- **入力**: TraceabilityId[], 距離行列, クラスタ[], エッジ閾値, MDS座標(optional)
- **出力**: `GraphData { nodes: GraphNode[], links: GraphLink[] }`
- **処理**:
  - クラスタIDをノードに割当
  - 距離 ≤ 閾値のペアをエッジとして生成
  - 最近傍巡回順（nearest-neighbor traversal）でTab順序を計算
  - MDS座標がある場合は固定座標 `fx/fy/fz` として設定

### HTML テンプレート

`src/visualization/html_template.ts`

- **外部ライブラリ**: 3d-force-graph（CDN経由、HTMLに埋め込み）
- **生成するUI要素**:
  - 3Dグラフ本体（WebGL）
  - 左パネル: 色分け切替、エッジ閾値スライダー、レイアウト切替、キーボードショートカット
  - 右パネル: 選択ノードの詳細（ID構成要素、接続エッジ一覧）
  - 統計表示: ノード数、エッジ数、グラフ密度
  - 矩形選択モード: Shift+ドラッグでサブグラフ選択

## CLIオプション

| オプション         | 説明                       | デフォルト          | 値                                            |
| ------------------ | -------------------------- | ------------------- | --------------------------------------------- |
| `--output`         | 出力HTMLファイルパス       | `tmp/graph-3d.html` | ファイルパス                                  |
| `--distance`       | 距離計算手法               | `structural`        | levenshtein, jaro-winkler, cosine, structural |
| `--algorithm`      | クラスタリングアルゴリズム | `hierarchical`      | hierarchical, kmeans, dbscan                  |
| `--threshold`      | クラスタリング閾値         | `0.3`               | 数値                                          |
| `--edge-threshold` | エッジ表示閾値             | `0.5`               | 数値 (0-1)                                    |
| `--color-by`       | 色分けモード               | `cluster`           | cluster, scope, level                         |
| `--layout`         | レイアウトモード           | `force`             | force, mds                                    |
| `--k`              | K-Meansクラスタ数          | `0` (自動)          | 数値                                          |
| `--epsilon`        | DBSCAN近傍半径             | `0.3`               | 数値                                          |
| `--min-points`     | DBSCAN最小ポイント数       | `2`                 | 数値                                          |

## キーボードショートカット

| キー       | 動作                     |
| ---------- | ------------------------ |
| 矢印キー   | 3Dビュー回転             |
| Shift+矢印 | 微回転                   |
| R          | ビューリセット           |
| S          | 矩形選択モード切替       |
| Tab        | ノード順次ナビゲーション |

## 使用例

```bash
# 基本（force-directed レイアウト）
deno run --allow-read --allow-write graph.ts ./data

# MDS レイアウト + scope で色分け
deno run --allow-read --allow-write graph.ts ./data --layout mds --color-by scope

# DBSCAN + 高閾値エッジ
deno run --allow-read --allow-write graph.ts ./data --algorithm dbscan --edge-threshold 0.7
```
