-- =====================================================
-- Web制作ガントチャート データベーススキーマ
-- Supabase SQL Editor で実行してください
-- =====================================================

-- 担当者テーブル
CREATE TABLE IF NOT EXISTS members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,          -- 担当者名
  role        TEXT NOT NULL DEFAULT '',-- 役割（例：デザイナー、エンジニア）
  color       TEXT NOT NULL DEFAULT '#3B82F6', -- カラーコード
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- プロジェクトテーブル
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- タスク（工程）テーブル
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  progress      INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  is_completed  BOOLEAN NOT NULL DEFAULT false,
  member_id     UUID REFERENCES members(id) ON DELETE SET NULL,
  type          TEXT NOT NULL DEFAULT 'task' CHECK (type IN ('task', 'milestone', 'project')),
  parent_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- tasks テーブルに updated_at トリガーを設定
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- RLS（Row Level Security）の設定
-- 全員が読み書き可能（チーム内共有を想定）
-- ※ 将来的にチームごとのアクセス制御が必要な場合は変更
-- =====================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ログイン済みユーザーは全データにアクセス可能
CREATE POLICY "ログイン済みユーザーは閲覧可能" ON members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは追加可能" ON members
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ログイン済みユーザーは更新可能" ON members
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは削除可能" ON members
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "ログイン済みユーザーは閲覧可能" ON projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは追加可能" ON projects
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ログイン済みユーザーは更新可能" ON projects
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは削除可能" ON projects
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "ログイン済みユーザーは閲覧可能" ON tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは追加可能" ON tasks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ログイン済みユーザーは更新可能" ON tasks
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは削除可能" ON tasks
  FOR DELETE TO authenticated USING (true);

-- Realtimeを有効化
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- =====================================================
-- サンプルデータ（動作確認用）
-- =====================================================

INSERT INTO members (name, role, color) VALUES
  ('田中 太郎', 'ディレクター', '#6366F1'),
  ('佐藤 花子', 'デザイナー', '#EC4899'),
  ('鈴木 一郎', 'エンジニア', '#10B981');

INSERT INTO projects (name, description) VALUES
  ('コーポレートサイトリニューアル', 'クライアントのコーポレートサイトをフルリニューアルするプロジェクト');
