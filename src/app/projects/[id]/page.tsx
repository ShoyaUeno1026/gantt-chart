import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProjectClient from "@/app/projects/[id]/ProjectClient";
import type { Project, Role, MemberWithRole, TaskWithMembers } from "@/lib/types/database";

type Props = {
  params: Promise<{ id: string }>;
};

// プロジェクト詳細ページ（サーバーコンポーネント：データ取得のみ）
export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: roles }, { data: members }, { data: tasks }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("roles").select("*").order("display_order"),
      supabase.from("members").select("*, member_roles(role:roles(*))").or(`project_id.is.null,project_id.eq.${id}`).order("name"),
      supabase
        .from("tasks")
        .select("*, task_members(member:members(*, member_roles(role:roles(*))), role:roles(*))")
        .eq("project_id", id)
        .order("display_order"),
    ]);

  if (!project) notFound();

  return (
    <ProjectClient
      initialProject={project as Project}
      initialRoles={(roles ?? []) as Role[]}
      initialMembers={(members ?? []) as MemberWithRole[]}
      initialTasks={(tasks ?? []) as TaskWithMembers[]}
    />
  );
}
