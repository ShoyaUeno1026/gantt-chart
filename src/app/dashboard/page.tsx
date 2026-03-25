import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import NewProjectButton from "@/components/projects/NewProjectButton";
import LogoutButton from "@/components/auth/LogoutButton";
import type { Project } from "@/lib/types/database";

// プロジェクト一覧ページ（ダッシュボード）
export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: projects }, { data: { user } }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);
  const displayName = user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "";
  const isAdmin = user?.app_metadata?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">工程表ガントチャート</h1>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm">管理</Button>
            </Link>
          )}
          <Link href="/feedback">
            <Button variant="outline" size="sm">フィードバック</Button>
          </Link>
          <Link href="/settings/members">
            <Button variant="outline" size="sm">担当者管理</Button>
          </Link>
          <Link href="/settings/profile">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {displayName}
            </Button>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">プロジェクト一覧</h2>
          <NewProjectButton />
        </div>

        {/* プロジェクト一覧 */}
        {projects && projects.length > 0 ? (
          <div className="grid gap-4">
            {projects.map((project: Project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  作成日: {new Date(project.created_at).toLocaleDateString("ja-JP")}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400 mb-4">プロジェクトがまだありません</p>
            <NewProjectButton />
          </div>
        )}
      </main>
    </div>
  );
}
