// Supabase データベースの型定義
// テーブル構造に合わせて定義

export type Database = {
  public: {
    Tables: {
      members: {
        Row: Member;
        Insert: Omit<Member, "id" | "created_at">;
        Update: Partial<Omit<Member, "id" | "created_at">>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at">;
        Update: Partial<Omit<Project, "id" | "created_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id" | "created_at" | "updated_at">>;
      };
    };
  };
};

// 担当者（チームメンバー）
export type Member = {
  id: string;
  name: string;         // 担当者名
  role: string;         // 役割（例：デザイナー、エンジニア）
  color: string;        // カラーコード（例：#3B82F6）
  created_at: string;
};

// プロジェクト
export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

// タスク（工程）
export type Task = {
  id: string;
  project_id: string;
  name: string;
  start_date: string;   // ISO 8601形式（例：2024-04-01）
  end_date: string;     // ISO 8601形式
  progress: number;     // 0〜100（進捗率）
  is_completed: boolean; // チェックボックスの完了フラグ
  member_id: string | null; // 担当者ID（外部キー）
  type: "task" | "milestone" | "project"; // タスク種別
  parent_id: string | null;  // 親タスクID（階層化用）
  display_order: number;     // 表示順
  created_at: string;
  updated_at: string;
};

// タスク（担当者情報を結合した拡張型）
export type TaskWithMember = Task & {
  member: Member | null;
};
