-- =====================================================
-- Migration v4: メンバー多対多ロール + 工程担当者ロール指定 + TM連携フィールド
-- Supabase SQL Editor で実行してください
-- =====================================================

BEGIN;

-- =====================================================
-- 1. member_roles テーブル（メンバーと役割の多対多中間テーブル）
-- =====================================================
CREATE TABLE IF NOT EXISTS member_roles (
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role_id   UUID NOT NULL REFERENCES roles(id)   ON DELETE CASCADE,
  PRIMARY KEY (member_id, role_id)
);

-- =====================================================
-- 2. 既存の members.role_id データを member_roles へ移行
-- =====================================================
INSERT INTO member_roles (member_id, role_id)
SELECT id, role_id
FROM members
WHERE role_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. task_members の PRIMARY KEY 変更 + role_id カラム追加
-- =====================================================

-- 既存の PRIMARY KEY 制約を削除
ALTER TABLE task_members DROP CONSTRAINT task_members_pkey;

-- Realtime パブリケーション登録済みのテーブルは、主キーなし状態では UPDATE 不可のため
-- REPLICA IDENTITY FULL を設定（新しい PRIMARY KEY 追加後に DEFAULT に戻る）
ALTER TABLE task_members REPLICA IDENTITY FULL;

-- role_id カラムを追加（NULL許容）
ALTER TABLE task_members ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- 既存レコードの role_id を補完（担当者の最初の役割で埋める）
UPDATE task_members tm
SET role_id = (
  SELECT mr.role_id
  FROM member_roles mr
  WHERE mr.member_id = tm.member_id
  ORDER BY mr.role_id
  LIMIT 1
)
WHERE tm.role_id IS NULL;

-- role_id を補完できなかったレコード（役割未設定のメンバー）は削除
-- ※ PRIMARY KEY に NULL は含められないため
DELETE FROM task_members WHERE role_id IS NULL;

-- 新しい PRIMARY KEY を設定（task_id + member_id + role_id）
-- 同一人物を異なる役割で同一工程にアサイン可能
ALTER TABLE task_members ADD PRIMARY KEY (task_id, member_id, role_id);

-- =====================================================
-- 4. TM連携フィールドの追加（将来のSupabase統合に備えた仮実装）
-- =====================================================

-- members: Task Manager のユーザーID（仮）
ALTER TABLE members ADD COLUMN IF NOT EXISTS tm_user_id TEXT;

-- projects: Task Manager の取引先ID（仮）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tm_client_id TEXT;

-- =====================================================
-- 5. member_roles の RLS ポリシー設定
-- =====================================================
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ログイン済みユーザーは閲覧可能" ON member_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ログイン済みユーザーは追加可能" ON member_roles
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ログイン済みユーザーは削除可能" ON member_roles
  FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 6. Realtime・インデックス設定
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE member_roles;

CREATE INDEX IF NOT EXISTS idx_member_roles_member_id ON member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_task_members_role_id   ON task_members(role_id);

COMMIT;
