-- =====================================================
-- v2 マイグレーション
-- Supabase SQL Editor で実行してください
-- =====================================================

-- 1. 役割マスターテーブル（新規作成）
CREATE TABLE IF NOT EXISTS roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#6366F1',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. タスク担当者 中間テーブル（多対多）
CREATE TABLE IF NOT EXISTS task_members (
  task_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, member_id)
);

-- 3. projects テーブルに列追加
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name    TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS representative TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date       DATE;

-- 4. tasks テーブルに notes 列追加
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. members に role_id 列追加（roles テーブルへの FK）
ALTER TABLE members ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- 6. RLS 設定（roles, task_members）
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ログイン済みユーザーは閲覧可能" ON roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは追加可能" ON roles
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ログイン済みユーザーは更新可能" ON roles
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは削除可能" ON roles
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "ログイン済みユーザーは閲覧可能" ON task_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは追加可能" ON task_members
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ログイン済みユーザーは削除可能" ON task_members
  FOR DELETE TO authenticated USING (true);

-- 7. Realtime 追加
ALTER PUBLICATION supabase_realtime ADD TABLE roles;
ALTER PUBLICATION supabase_realtime ADD TABLE task_members;

-- 8. サンプル役割データ
INSERT INTO roles (name, color, display_order) VALUES
  ('ディレクター', '#1e293b', 1),
  ('デザイナー',   '#f97316', 2),
  ('コーダー',     '#3b82f6', 3),
  ('クライアント', '#06b6d4', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 既存 members の role を role_id に移行する場合（任意）
-- 役割名が一致するものを自動マッピング
-- =====================================================
-- UPDATE members m
-- SET role_id = r.id
-- FROM roles r
-- WHERE m.role = r.name;
