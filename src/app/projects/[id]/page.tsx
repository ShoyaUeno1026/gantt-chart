import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import GanttView from "@/components/gantt/GanttView";
import LogoutButton from "@/components/auth/LogoutButton";
import type { TaskWithMember, Member, Project } from "@/lib/types/database";

type Props = {
  params: Promise<{ id: string }>;
};

// プロジェクト詳細 / ガントチャートページ
export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // プロジェクト情報を取得
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // タスク一覧を担当者情報込みで取得
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, member:members(*)")
    .eq("project_id", id)
    .order("display_order");

  // 担当者一覧を取得
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .order("name");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">← 一覧に戻る</Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">{(project as Project).name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings/members">
            <Button variant="outline" size="sm">担当者管理</Button>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="px-6 py-6">
        <GanttView
          initialTasks={(tasks ?? []) as TaskWithMember[]}
          members={(members ?? []) as Member[]}
          projectId={id}
        />
      </main>
    </div>
  );
}
