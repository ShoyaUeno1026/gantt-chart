"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FEEDBACK_CATEGORIES } from "@/lib/constants/feedbackCategories";

// ヘッダーに埋め込むフィードバック投稿ダイアログ
export default function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !body.trim()) return;

    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインが必要です");
      setLoading(false);
      return;
    }

    const displayName =
      user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "";

    const { error: insertError } = await supabase
      .from("feedbacks")
      .insert({ user_id: user.id, display_name: displayName, category, body: body.trim(), is_resolved: false });

    if (insertError) {
      setError("送信に失敗しました。もう一度お試しください。");
    } else {
      // 送信成功：フォームリセット＆ダイアログを閉じる
      setCategory("");
      setBody("");
      setOpen(false);
    }
    setLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // 閉じるときにフォームをリセット
      setCategory("");
      setBody("");
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        フィードバック
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>フィードバックを送る</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">カテゴリ</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">選択してください</option>
              {FEEDBACK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">内容</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="気になった点や改善してほしいことを教えてください"
              required
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !category || !body.trim()}
            >
              {loading ? "送信中..." : "送信する"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
