# Web制作 工程表ガントチャート

Web制作チーム向けのガントチャートアプリです。担当者カラー管理・進捗チェック・D&Dによる直感的な日程調整・チームリアルタイム共有に対応しています。

---

## 機能一覧

| 機能 | 説明 |
|------|------|
| プロジェクト管理 | プロジェクト名・クライアント・代表担当者・完了予定日を管理 |
| 役割マスター | 役割（ディレクター・デザイナー等）ごとにカラーを設定 |
| 担当者マスター | 担当者に役割を紐付け。カラーバッジで識別 |
| ガントチャート | 独自実装の日付ベースタイムライン表示 |
| 複数担当者 | 1工程に複数の担当者をアサイン可能 |
| 完了チェック | チェックボックスで工程を完了にするとバーがグレーアウト |
| 行D&D並び替え | ドラッグハンドルで工程の順番を変更 |
| インライン編集 | 工程名・日付・備考をテーブル上で直接編集 |
| 前週/次週/今日 | ナビゲーションボタンでタイムラインを移動 |
| リアルタイム共有 | Supabase Realtime で複数ユーザーの変更が即反映 |
| JSON出力/読込 | プロジェクトデータをJSONファイルでエクスポート・インポート |
| 画像保存 | ガントチャートをPNGファイルで保存 |
| Google認証 | Google OAuth またはメール・パスワードでログイン |

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フレームワーク | Next.js 16.2.1 (App Router) + TypeScript |
| スタイリング | Tailwind CSS v4 + shadcn/ui |
| D&D | @dnd-kit/core + @dnd-kit/sortable |
| 画像出力 | html2canvas |
| バックエンド | Supabase（PostgreSQL + Auth + Realtime） |

---

## セットアップ

### 1. リポジトリをクローン・依存関係をインストール

```bash
git clone <repository-url>
cd gantt-chart
npm install
```

### 2. Supabase プロジェクトを作成

[supabase.com](https://supabase.com) でプロジェクトを作成し、Settings > API から以下を取得してください。

### 3. 環境変数を設定

`.env.local.example` をコピーして `.env.local` を作成し、値を入力します。

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. データベースを初期化

Supabase の SQL Editor で以下を順番に実行してください。

```
1. supabase/schema.sql      （テーブル作成・RLS・Realtime設定）
2. supabase/migration_v2.sql（役割マスター・タスク担当者等の追加）
```

### 5. Google OAuth を有効化（任意）

Supabase Dashboard > Authentication > Providers > Google から設定してください。

### 6. 開発サーバーを起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) にアクセスしてください。

---

## ディレクトリ構成

```
src/
├── app/
│   ├── auth/callback/         # OAuth コールバック
│   ├── dashboard/             # プロジェクト一覧
│   ├── login/                 # ログイン・新規登録
│   ├── projects/[id]/         # ガントチャート本体
│   │   ├── page.tsx           # サーバー: データ取得
│   │   └── ProjectClient.tsx  # クライアント: 全体状態管理
│   └── settings/members/      # 担当者管理
├── components/
│   ├── gantt/
│   │   ├── CustomGantt.tsx    # ガントチャート本体（タイムライン）
│   │   └── GanttRow.tsx       # タスク行（D&D・バー描画）
│   ├── layout/
│   │   └── PageHeader.tsx     # ヘッダー（保存/JSON/画像）
│   ├── masters/
│   │   ├── MemberMaster.tsx   # 担当者マスター
│   │   └── RoleMaster.tsx     # 役割マスター
│   └── project/
│       └── ProjectInfoForm.tsx# プロジェクト基本情報
└── lib/
    ├── supabase/              # Supabase クライアント（client/server）
    └── types/database.ts      # 全型定義

supabase/
├── schema.sql                 # 初回セットアップ用スキーマ
└── migration_v2.sql           # v2 マイグレーション
```

---

## データベース構成

```
roles        役割マスター（name, color, display_order）
members      担当者（name, role_id → roles）
projects     プロジェクト（name, client_name, representative, end_date）
tasks        工程（name, start_date, end_date, is_completed, notes, display_order）
task_members タスク担当者 中間テーブル（task_id, member_id）
```

---

## デプロイ

[Vercel](https://vercel.com) へのデプロイを推奨します。環境変数に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定してください。
