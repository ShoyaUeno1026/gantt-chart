import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/auth/LogoutButton";
import AdminClient from "@/app/admin/AdminClient";
import type { AdminUser, Feedback } from "@/lib/types/database";

// 管理ページ（サーバーコンポーネント：管理者チェック + データ取得）
export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/dashboard");

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: usersData }, { data: feedbacks }] = await Promise.all([
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("feedbacks").select("*").order("created_at", { ascending: false }),
  ]);

  const users: AdminUser[] = (usersData?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    display_name: u.user_metadata?.display_name ?? u.email?.split("@")[0] ?? "",
    is_admin: u.app_metadata?.role === "admin",
    created_at: u.created_at,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">← ダッシュボード</Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">管理</h1>
        </div>
        <LogoutButton />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <AdminClient
          initialUsers={users}
          initialFeedbacks={(feedbacks ?? []) as Feedback[]}
          currentUserId={user.id}
        />
      </main>
    </div>
  );
}
