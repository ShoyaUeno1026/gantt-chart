"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FEEDBACK_CATEGORIES } from "@/lib/constants/feedbackCategories";
import type { AdminUser, Feedback } from "@/lib/types/database";

type Props = {
  initialUsers: AdminUser[];
  initialFeedbacks: Feedback[];
  currentUserId: string;
};

// カテゴリに応じたバッジのバリアントを返す
function categoryVariant(category: string) {
  if (category === "バグ報告") return "destructive" as const;
  if (category === "改善要望" || category === "新機能リクエスト") return "default" as const;
  return "secondary" as const;
}

export default function AdminClient({ initialUsers, initialFeedbacks, currentUserId }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks);
  const [activeTab, setActiveTab] = useState<"users" | "feedbacks">("users");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();

  // 管理者権限の付与・剥奪
  const handleToggleAdmin = async (u: AdminUser) => {
    setLoadingId(u.id);
    const res = await fetch("/api/admin/update-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, grant: !u.is_admin }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((user) => user.id === u.id ? { ...user, is_admin: !u.is_admin } : user)
      );
    }
    setLoadingId(null);
  };

  // ユーザー削除
  const handleDeleteUser = async (u: AdminUser) => {
    if (!window.confirm(`「${u.display_name}」を削除しますか？この操作は取り消せません。`)) return;
    setLoadingId(u.id);
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((user) => user.id !== u.id));
    }
    setLoadingId(null);
  };

  // フィードバック：対応完了トグル
  const handleResolveToggle = async (fb: Feedback) => {
    const { error } = await supabase
      .from("feedbacks")
      .update({ is_resolved: !fb.is_resolved })
      .eq("id", fb.id);
    if (!error) {
      setFeedbacks((prev) =>
        prev.map((f) => f.id === fb.id ? { ...f, is_resolved: !fb.is_resolved } : f)
      );
    }
  };

  // フィードバック：削除
  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("このフィードバックを削除しますか？")) return;
    const { error } = await supabase.from("feedbacks").delete().eq("id", id);
    if (!error) {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    }
  };

  // フィードバックをカテゴリ順にグループ化して描画
  const renderFeedbacksByCategory = (list: Feedback[]) => {
    const known = FEEDBACK_CATEGORIES.filter((c) => list.some((fb) => fb.category === c));
    const unknown = [...new Set(
      list.filter((fb) => !FEEDBACK_CATEGORIES.includes(fb.category as never)).map((fb) => fb.category)
    )];
    return [...known, ...unknown].map((cat) => {
      const items = list.filter((fb) => fb.category === cat);
      return (
        <div key={cat} className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-1">
            {cat}<span className="ml-1.5 font-normal normal-case">({items.length})</span>
          </h3>
          <div className="space-y-2">
            {items.map((fb) => (
              <div
                key={fb.id}
                className={`bg-white border rounded-xl px-4 py-3 ${fb.is_resolved ? "border-gray-100 opacity-75" : "border-gray-200"}`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {fb.is_resolved && (
                    <Badge variant="outline" className="text-green-600 border-green-300">✓ 対応完了</Badge>
                  )}
                  <Badge variant={categoryVariant(fb.category)}>{fb.category}</Badge>
                  <span className="text-sm font-medium text-gray-700">{fb.display_name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(fb.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-red-400 hover:text-red-600"
                      onClick={() => handleDeleteFeedback(fb.id)}
                    >
                      削除
                    </Button>
                    {fb.is_resolved ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-gray-400 hover:text-gray-600"
                        onClick={() => handleResolveToggle(fb)}
                      >
                        解除
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => handleResolveToggle(fb)}
                      >
                        対応完了
                      </Button>
                    )}
                  </div>
                </div>
                <p className={`text-sm whitespace-pre-wrap ${fb.is_resolved ? "text-gray-400" : "text-gray-700"}`}>
                  {fb.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  const activeFeedbacks = feedbacks.filter((fb) => !fb.is_resolved);
  const resolvedFeedbacks = feedbacks.filter((fb) => fb.is_resolved);

  return (
    <div className="space-y-6">
      {/* タブ */}
      <div className="flex rounded-lg border border-gray-200 p-1 gap-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === "users" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ユーザー管理
          <span className="ml-1.5 text-xs opacity-70">({users.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("feedbacks")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === "feedbacks" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          フィードバック管理
          <span className="ml-1.5 text-xs opacity-70">({feedbacks.length})</span>
        </button>
      </div>

      {/* ユーザー管理タブ */}
      {activeTab === "users" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">メール</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">表示名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">権限</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">登録日</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const isLoading = loadingId === u.id;
                return (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-700">{u.email}</td>
                    <td className="px-4 py-3 text-gray-700">{u.display_name}</td>
                    <td className="px-4 py-3">
                      {u.is_admin && (
                        <Badge variant="default" className="text-xs">管理者</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={isSelf || isLoading}
                          onClick={() => handleToggleAdmin(u)}
                        >
                          {u.is_admin ? "権限を剥奪" : "管理者に昇格"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-400 hover:text-red-600"
                          disabled={isSelf || isLoading}
                          onClick={() => handleDeleteUser(u)}
                        >
                          削除
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* フィードバック管理タブ */}
      {activeTab === "feedbacks" && (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              未対応
              <span className="ml-2 text-gray-400 font-normal">（{activeFeedbacks.length}件）</span>
            </h2>
            {activeFeedbacks.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
                <p className="text-sm text-gray-400">未対応のフィードバックはありません</p>
              </div>
            ) : (
              <div className="space-y-6">{renderFeedbacksByCategory(activeFeedbacks)}</div>
            )}
          </section>

          {resolvedFeedbacks.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">
                対応完了
                <span className="ml-2 text-gray-400 font-normal">（{resolvedFeedbacks.length}件）</span>
              </h2>
              <div className="space-y-6">{renderFeedbacksByCategory(resolvedFeedbacks)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
