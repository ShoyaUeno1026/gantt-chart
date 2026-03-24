-- =====================================================
-- v2 マイグレーション
-- Supabase SQL Editor で実行してください
-- ※ 全体をトランザクションで囲んでいるため、
--   途中でエラーが発生した場合は全変更がロールバックされます
-- =====================================================

BEGIN;

-- =====================================================
-- 1. テーブル新規作成
-- =====================================================

-- 役割マスターテーブル
CREATE TABLE IF NOT EXISTS roles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE, -- 役割名は一意（重複登録防止）
  color         TEXT        NOT NULL DEFAULT '#6366F1',
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- タスク担当者 中間テーブル（タスクと担当者の多対多）
CREATE TABLE IF NOT EXISTS task_members (
  task_id   UUID NOT NULL REFERENCES tasks(id)   ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, member_id)
);

-- =====================================================
-- 2. 既存テーブルへの列追加
-- =====================================================

-- projects テーブル
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name    TEXT; -- クライアント名
ALTER TABLE projects ADD COLUMN IF NOT EXISTS representative TEXT; -- 代表担当者名
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date       DATE; -- 完了予定日

-- tasks テーブル
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT; -- 備考・メモ

-- members テーブル（roles テーブルへの外部キー）
ALTER TABLE members ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- =====================================================
-- 3. RLS（Row Level Security）の設定
-- =====================================================

ALTER TABLE roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_members ENABLE ROW LEVEL SECURITY;

-- roles: 認証済みユーザーは全操作可能
CREATE POLICY "ログイン済みユーザーは閲覧可能" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは追加可能" ON roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ログイン済みユーザーは更新可能" ON roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは削除可能" ON roles FOR DELETE TO authenticated USING (true);

-- task_members: 参照・追加・削除のみ（UPDATE は複合主キーのため不要）
CREATE POLICY "ログイン済みユーザーは閲覧可能" ON task_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは追加可能" ON task_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ログイン済みユーザーは削除可能" ON task_members FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 4. Realtime の有効化
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE roles;
ALTER PUBLICATION supabase_realtime ADD TABLE task_members;

-- =====================================================
-- 5. サンプル役割データの挿入
-- name に UNIQUE 制約があるため、同名が存在する場合はスキップ
-- =====================================================

INSERT INTO roles (name, color, display_order) VALUES
  ('ディレクター', '#1E293B', 1),
  ('デザイナー',   '#F97316', 2),
  ('コーダー',     '#3B82F6', 3),
  ('クライアント', '#06B6D4', 4)
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- =====================================================
-- 【任意】既存 members の role（TEXT）を role_id（FK）へ移行
-- 役割名が roles.name と一致する場合に自動マッピングします
-- schema.sql のサンプルデータ等で members.role が設定済みの場合に実行してください
-- =====================================================
-- UPDATE members m
-- SET role_id = r.id
-- FROM roles r
-- WHERE m.role = r.name
--   AND m.role_id IS NULL; -- 未設定のレコードのみ対象
