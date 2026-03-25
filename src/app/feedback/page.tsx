import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/auth/LogoutButton";
import FeedbackClient from "@/app/feedback/FeedbackClient";
import type { Feedback } from "@/lib/types/database";

// フィードバックページ（サーバーコンポーネント：認証確認 + 一覧取得）
export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: feedbacks } = await supabase
    .from("feedbacks")
    .select("*")
    .order("created_at", { ascending: false });

  const displayName =
    user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">← ダッシュボード</Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">フィードバック</h1>
        </div>
        <LogoutButton />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <FeedbackClient
          initialFeedbacks={(feedbacks ?? []) as Feedback[]}
          displayName={displayName}
        />
      </main>
    </div>
  );
}
