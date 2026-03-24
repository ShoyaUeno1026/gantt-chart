# Web制作 工程表ガントチャート

Web制作チーム向けのガントチャートアプリです。役割マスター・担当者マスターによるカラー管理、複数担当者アサイン、D&Dによる直感的な日程調整、チームリアルタイム共有に対応しています。

---

## 機能一覧

| 機能 | 説明 |
|------|------|
| プロジェクト管理 | プロジェクト名・クライアント・代表担当者・完了予定日を管理 |
| 役割マスター | 役割（ディレクター・デザイナー等）ごとにカラーを設定。役割名インライン編集対応 |
| 担当者マスター | 担当者に役割を紐付け。社内メンバーとプロジェクト専用クライアントを分けて管理 |
| ガントチャート | 独自実装の日付ベースタイムライン表示 |
| バードラッグ | タイムライン上のバーを左右にドラッグして開始日・終了日を変更 |
| 複数担当者 | 1工程に複数の担当者をアサイン可能（多対多） |
| 完了チェック | チェックボックスで工程を完了にするとバーがグレーアウト |
| 行D&D並び替え | ドラッグハンドルで工程の順番を変更 |
| インライン編集 | 工程名・日付・備考をテーブル上で直接編集 |
| 前週/次週/今日 | ナビゲーションボタンでタイムラインを移動 |
| リアルタイム共有 | Supabase Realtime で複数ユーザーの変更が即反映 |
| JSON出力/読込 | プロジェクトデータをJSONファイルでエクスポート・インポート |
| 画像保存 | ガントチャートをPNGファイルで保存 |
| メール認証 | メール・パスワードで登録・ログイン |
| ドメイン制限 | 環境変数で登録許可ドメインを指定可能 |

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フレームワーク | Next.js 16.2.1 (App Router) + TypeScript |
| スタイリング | Tailwind CSS v4 + shadcn/ui |
| D&D | @dnd-kit/core + @dnd-kit/sortable |
| 画像出力 | html-to-image |
| バックエンド | Supabase（PostgreSQL + Auth + Realtime） |
| デプロイ | Vercel |

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

`.env.local` を作成し、値を入力します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 登録を許可するメールドメイン（空の場合は制限なし）
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=example.com
```

### 4. データベースを初期化

Supabase の SQL Editor で以下を**順番に**実行してください。

```
1. supabase/schema.sql        テーブル作成・RLS・Realtime設定
2. supabase/migration_v2.sql  役割マスター・タスク担当者等の追加
3. supabase/migration_v3.sql  担当者のプロジェクト別管理（project_id追加）
```

### 5. 開発サーバーを起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) にアクセスしてください。

---

## Vercel へのデプロイ

1. GitHub リポジトリに push
2. [vercel.com](https://vercel.com) でリポジトリをインポート（Next.js が自動検出されます）
3. 環境変数に `.env.local` の内容を設定
4. Supabase Dashboard > Authentication > URL Configuration に Vercel の URL を追加
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`

---

## ディレクトリ構成

```
src/
├── app/
│   ├── auth/callback/         # OAuth コールバック（ドメインチェックあり）
│   ├── dashboard/             # プロジェクト一覧
│   ├── login/                 # ログイン・新規登録
│   ├── projects/[id]/         # ガントチャート本体
│   │   ├── page.tsx           # サーバー: データ取得
│   │   └── ProjectClient.tsx  # クライアント: 全体状態管理
│   └── settings/members/      # 社内メンバー管理
├── components/
│   ├── gantt/
│   │   ├── CustomGantt.tsx    # ガントチャート本体（タイムライン・行D&D）
│   │   └── GanttRow.tsx       # タスク行（バードラッグ・インライン編集）
│   ├── masters/
│   │   ├── MemberMaster.tsx   # 担当者マスター（社内/クライアント種別）
│   │   └── RoleMaster.tsx     # 役割マスター（インライン名前編集）
│   ├── layout/PageHeader.tsx  # ヘッダー（保存/JSON/画像）
│   ├── project/ProjectInfoForm.tsx  # プロジェクト基本情報
│   └── members/MemberList.tsx # /settings/members 用担当者リスト
└── lib/
    ├── supabase/              # Supabase クライアント（client/server）
    └── types/database.ts      # 全型定義

supabase/
├── schema.sql                 # 初回セットアップ用スキーマ
├── migration_v2.sql           # v2: 役割マスター・多対多担当者
└── migration_v3.sql           # v3: 担当者のプロジェクト別管理
```

---

## データベース構成

```
roles        役割マスター（name UNIQUE, color, display_order）
             └─ 全プロジェクト共通

members      担当者（name, role_id → roles, project_id → projects）
             ├─ project_id = NULL  : 社内メンバー（全プロジェクト共通）
             └─ project_id = UUID  : プロジェクト専用クライアント

projects     プロジェクト（name, client_name, representative, end_date）

tasks        工程（name, start_date, end_date, is_completed, notes, display_order）
             └─ project_id → projects

task_members タスク担当者 中間テーブル（task_id, member_id）
```
