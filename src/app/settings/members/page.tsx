import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import MemberList from "@/components/members/MemberList";
import LogoutButton from "@/components/auth/LogoutButton";
import type { Member } from "@/lib/types/database";

// 担当者管理ページ
export default async function MembersSettingsPage() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .order("created_at");

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
        <MemberList initialMembers={(members ?? []) as Member[]} />
      </main>
    </div>
  );
}
