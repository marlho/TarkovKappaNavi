# TarkovKappaNavi

> A quest progress tracker for *Escape from Tarkov* — track your journey to the Kappa container.
> Fully client-side, no backend required. All data is stored locally in your browser's IndexedDB.

Escape from Tarkov のクエスト進捗を追跡し、Kappa コンテナ取得を目指すための Web アプリです。
バックエンド不要のフルクライアント構成で、ユーザーデータはすべてブラウザの IndexedDB にローカル保存されます。

## 主な機能

### ダッシュボード
- Kappa 進捗バー（全体 / トレーダー別）
- Now パネル（ピン留めしたアクティブタスク、最大 10 件）
- おすすめタスク（後続インパクト・マップバッチ・Kappa 必須をスコアリング）
- 次に解放されるタスクの予告表示

### タスク管理
- トレーダー / マップ / タスクタイプ / 状態でフィルタリング
- リスト表示 / フロー表示（依存関係グラフ）の切替
- タスク詳細パネル（前提タスクツリー、メモ、一括完了）
- 完了時に未完了の前提タスクを再帰表示し一括完了を提案

### マップ
- 各マップの 2D / 3D 画像表示
- ユーザーピンの配置・編集・ドラッグ移動
- ピンプリセットの保存・適用・URL 共有
- チップベースのラベル入力（カスタムプリセット対応）

### ハイドアウト
- 建設ステーション一覧とアイテム必要数の横断集計
- 所持数管理（+/- / MAX / MIN）
- 建設可能 / 未建設 / すべてのフィルタ
- コンパクト表示モード

### アイテム
- アイテム価格のティア表示（S / A / B / C / D）
- ティア閾値のカスタマイズ

### 設定
- プレイヤーレベル管理
- 進捗データの JSON エクスポート / インポート
- QR コードによるデータ共有（整合性チェック付き）
- API キャッシュ更新
- ワイプリセット

## アーキテクチャ

```
tarkov.dev GraphQL API
        │
        ▼
  TanStack Query (メモリキャッシュ, TTL 12h)
        │
        ▼
  ┌─────────────────────────────────┐
  │         React Components        │
  │  (Dashboard / Tasks / Map / …)  │
  └──────┬──────────────┬───────────┘
         │              │
    Zustand Store   Domain Logic
    (UI状態管理)    (unlock判定, フィルタ,
         │          Kappa進捗, おすすめ)
         │              │
         ▼              ▼
       Dexie v4 (IndexedDB)
       ┌──────────────────┐
       │ profile          │
       │ progress         │
       │ nowPins          │
       │ notes / logs     │
       │ hideoutProgress  │
       │ mapPins          │
       └──────────────────┘
```

- **API データ**はメモリキャッシュのみ（TTL 12 時間、最終キャッシュへのフォールバックあり）
- **ユーザーデータ**は IndexedDB に永続化（プロフィール、進捗、メモ、ピン等）
- **ロック状態**は毎回動的に算出（`playerLevel >= minPlayerLevel` かつ前提タスクが全完了）

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | React 18 + TypeScript |
| ビルド | Vite 5 |
| 状態管理 | Zustand v5 |
| サーバーステート | TanStack Query v5 |
| ローカル DB | Dexie v4 (IndexedDB) |
| バリデーション | Zod v4 |
| ルーティング | React Router v7 |
| スタイリング | CSS Modules |
| テスト | Vitest |
| リント | ESLint |
| アイコン | Lucide React |

## データソース

[tarkov.dev GraphQL API](https://tarkov.dev/)（コミュニティ運営・非公式）からクエスト / マップ / トレーダー / アイテムデータを取得しています。

## 動作要件

- **Node.js** >= 18
- **npm** >= 9

## セットアップ

```bash
git clone https://github.com/marlho/TarkovKappaNavi.git
cd TarkovKappaNavi
npm install
npm run dev
```

`http://localhost:5173` でアプリが起動します。

## 開発コマンド

```bash
npm run build      # 型チェック + プロダクションビルド
npm run preview    # ビルド成果物のプレビュー
npm run lint       # ESLint 実行
npm run test       # テスト一括実行
npm run test:watch # テスト（ウォッチモード）
```

## プロジェクト構成

```
src/
├── api/           # GraphQL API 通信・正規化・React Query フック
├── components/    # UI コンポーネント（機能別サブディレクトリ）
│   ├── dashboard/ # ダッシュボード画面
│   ├── detail/    # タスク詳細パネル
│   ├── hideout/   # ハイドアウト画面
│   ├── items/     # アイテム画面
│   ├── layout/    # AppShell, Header, Sidebar
│   ├── map/       # マップ画面
│   ├── settings/  # 設定画面
│   ├── share/     # QR 共有
│   ├── tasks/     # タスク一覧画面
│   └── ui/        # 汎用 UI コンポーネント
├── data/          # 静的データ
├── db/            # Dexie DB 定義・CRUD 操作
├── domain/        # ドメインロジック（unlock判定, Kappa進捗, フィルタ等）
├── hooks/         # カスタムフック
├── i18n/          # 国際化（日本語 / 英語）
├── lib/           # ユーティリティ（QR共有, ピンプリセット等）
└── stores/        # Zustand ストア
```

## ライセンス

MIT License

## 免責事項

This project is not affiliated with or endorsed by Battlestate Games.
Game content and materials are trademarks and copyrights of Battlestate Games.
