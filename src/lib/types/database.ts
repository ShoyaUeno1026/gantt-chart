// データベース型定義

// 役割マスター
export type Role = {
  id: string;
  name: string;
  color: string;
  display_order: number;
  created_at: string;
};

// member_roles 中間テーブル（メンバーと役割の多対多）
export type MemberRole = {
  member_id: string;
  role_id: string;
  role: Role;
};

// 担当者
export type Member = {
  id: string;
  name: string;
  role: string;              // 旧フィールド（互換性維持）
  color: string;             // 旧フィールド（互換性維持）
  role_id: string | null;    // 旧フィールド（互換性維持）
  project_id: string | null; // null=社内共通、UUID=プロジェクト専用クライアント
  tm_user_id: string | null; // TM連携用（将来のSupabase統合に備えた仮実装）
  created_at: string;
};

// 担当者（複数役割情報を結合した拡張型）
export type MemberWithRole = Member & {
  member_roles: { role: Role }[]; // 多対多：担当者が持つ全役割
};

// プロジェクト
export type Project = {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  representative: string | null;
  end_date: string | null;
  tm_client_id: string | null; // TM連携用（将来のSupabase統合に備えた仮実装）
  created_at: string;
};

// タスク（工程）
export type Task = {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_completed: boolean;
  notes: string | null;
  display_order: number;
  // 以下は旧フィールド（互換性維持）
  progress: number;
  member_id: string | null;
  type: "task" | "milestone" | "project";
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

// タスク担当者（中間テーブル）
export type TaskMember = {
  task_id: string;
  member_id: string;
  role_id: string | null; // この工程での担当役割
};

// タスク（担当者・役割情報を結合した拡張型）
export type TaskWithMembers = Task & {
  task_members: {
    member: MemberWithRole;
    role_id: string | null;
    role: Role | null; // この工程での担当役割（task_members.role_id で引いた役割）
  }[];
};

// フィードバック
export type Feedback = {
  id: string;
  user_id: string;
  display_name: string; // 投稿時のユーザー表示名（スナップショット）
  category: string;
  body: string;
  is_resolved: boolean;
  created_at: string;
};

// JSON エクスポート用の全データ型
export type ProjectExportData = {
  project: Project;
  roles: Role[];
  members: MemberWithRole[];
  tasks: TaskWithMembers[];
  exported_at: string;
};
