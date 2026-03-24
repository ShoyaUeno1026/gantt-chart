import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import MemberList from "@/components/members/MemberList";
import LogoutButton from "@/components/auth/LogoutButton";
import type { MemberWithRole, Role } from "@/lib/types/database";

// 担当者管理ページ
export default async function MembersSettingsPage() {
  const supabase = await createClient();
  const [{ data: members }, { data: roles }] = await Promise.all([
    // project_id IS NULL = 社内メンバーのみ（プロジェクト専用クライアントは除外）
    supabase.from("members").select("*, role_data:roles(*)").is("project_id", null).order("created_at"),
    supabase.from("roles").select("*").order("display_order"),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">← ダッシュボード</Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">担当者管理</h1>
        </div>
        <LogoutButton />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <MemberList
          initialMembers={(members ?? []) as MemberWithRole[]}
          roles={(roles ?? []) as Role[]}
        />
      </main>
    </div>
  );
}
