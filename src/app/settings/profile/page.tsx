import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/auth/LogoutButton";
import ProfileClient from "@/app/settings/profile/ProfileClient";

// アカウント設定ページ
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">← ダッシュボード</Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">アカウント設定</h1>
        </div>
        <LogoutButton />
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        <ProfileClient
          email={user.email ?? ""}
          displayName={user.user_metadata?.display_name ?? ""}
        />
      </main>
    </div>
  );
}
