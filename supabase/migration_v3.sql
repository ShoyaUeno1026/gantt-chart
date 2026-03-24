-- =====================================================
-- v3 マイグレーション
-- Supabase SQL Editor で実行してください
-- =====================================================

BEGIN;

-- members テーブルに project_id を追加
-- NULL     → 社内メンバー（全プロジェクト共通）
-- UUID値  → そのプロジェクト専用クライアント
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- プロジェクト別フィルタの高速化用インデックス
CREATE INDEX IF NOT EXISTS idx_members_project_id ON members(project_id);

COMMIT;
