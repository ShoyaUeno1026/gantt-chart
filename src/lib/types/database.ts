// データベース型定義

// 役割マスター
export type Role = {
  id: string;
  name: string;
  color: string;
  display_order: number;
  created_at: string;
};

// 担当者（role_id で役割と紐付け）
export type Member = {
  id: string;
  name: string;
  role: string;             // 旧フィールド（互換性維持）
  color: string;            // 旧フィールド（互換性維持）
  role_id: string | null;
  project_id: string | null; // null=社内共通、UUID=プロジェクト専用クライアント
  created_at: string;
};

// 担当者（役割情報を結合した拡張型）
export type MemberWithRole = Member & {
  role_data: Role | null;
};

// プロジェクト
export type Project = {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  representative: string | null;
  end_date: string | null;
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
};

// タスク（担当者情報を結合した拡張型）
export type TaskWithMembers = Task & {
  task_members: { member: MemberWithRole }[];
};

// JSON エクスポート用の全データ型
export type ProjectExportData = {
  project: Project;
  roles: Role[];
  members: MemberWithRole[];
  tasks: TaskWithMembers[];
  exported_at: string;
};
