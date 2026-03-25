"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FEEDBACK_CATEGORIES } from "@/lib/constants/feedbackCategories";
import type { Feedback } from "@/lib/types/database";

type Props = {
  initialFeedbacks: Feedback[];
  displayName: string;
};

// カテゴリに応じたバッジのバリアントを返す
function categoryVariant(category: string) {
  if (category === "バグ報告") return "destructive" as const;
  if (category === "改善要望" || category === "新機能リクエスト") return "default" as const;
  return "secondary" as const;
}

// 日付を日本語フォーマットで返す
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FeedbackClient({ initialFeedbacks, displayName }: Props) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks);
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // 編集中の状態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const supabase = createClient();

  // 新規投稿
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !body.trim()) return;

    setSubmitLoading(true);
    setSubmitError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitError("ログインが必要です");
      setSubmitLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("feedbacks")
      .insert({ user_id: user.id, display_name: displayName, category, body: body.trim(), is_resolved: false })
      .select()
      .single();

    if (error) {
      setSubmitError("送信に失敗しました。もう一度お試しください。");
    } else {
      setFeedbacks((prev) => [data as Feedback, ...prev]);
      setCategory("");
      setBody("");
    }
    setSubmitLoading(false);
  };

  // 編集開始
  const startEdit = (fb: Feedback) => {
    setEditingId(fb.id);
    setEditCategory(fb.category);
    setEditBody(fb.body);
  };

  // 編集保存
  const handleEditSave = async (id: string) => {
    if (!editCategory || !editBody.trim()) return;
    setEditLoading(true);

    const { error } = await supabase
      .from("feedbacks")
      .update({ category: editCategory, body: editBody.trim() })
      .eq("id", id);

    if (!error) {
      setFeedbacks((prev) =>
        prev.map((fb) => fb.id === id ? { ...fb, category: editCategory, body: editBody.trim() } : fb)
      );
      setEditingId(null);
    }
    setEditLoading(false);
  };

  // 削除
  const handleDelete = async (id: string) => {
    if (!window.confirm("このフィードバックを削除しますか？")) return;

    const { error } = await supabase.from("feedbacks").delete().eq("id", id);
    if (!error) {
      setFeedbacks((prev) => prev.filter((fb) => fb.id !== id));
    }
  };

  // 対応完了トグル
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

  const activeFeedbacks = feedbacks.filter((fb) => !fb.is_resolved);
  const resolvedFeedbacks = feedbacks.filter((fb) => fb.is_resolved);

  // カテゴリ順にグループ化して描画（定義済みカテゴリ順 → 未知カテゴリは末尾）
  const renderByCategory = (list: Feedback[]) => {
    const known = FEEDBACK_CATEGORIES.filter((c) => list.some((fb) => fb.category === c));
    const unknown = [...new Set(list.filter((fb) => !FEEDBACK_CATEGORIES.includes(fb.category as never)).map((fb) => fb.category))];
    const orderedCategories = [...known, ...unknown];

    return orderedCategories.map((cat) => {
      const items = list.filter((fb) => fb.category === cat);
      return (
        <div key={cat} className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-1">
            {cat}
            <span className="ml-1.5 font-normal normal-case">({items.length})</span>
          </h3>
          <div className="space-y-3">
            {items.map((fb) => renderCard(fb))}
          </div>
        </div>
      );
    });
  };

  // フィードバックカードの描画
  const renderCard = (fb: Feedback) => {
    // 編集モード
    if (editingId === fb.id) {
      return (
        <div key={fb.id} className="bg-white border border-indigo-200 rounded-xl p-5 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">カテゴリ</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {FEEDBACK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">内容</label>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingId(null)}
              disabled={editLoading}
            >
              キャンセル
            </Button>
            <Button
              size="sm"
              onClick={() => handleEditSave(fb.id)}
              disabled={editLoading || !editCategory || !editBody.trim()}
            >
              {editLoading ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      );
    }

    // 通常表示
    return (
      <div
        key={fb.id}
        className={`bg-white border rounded-xl px-4 py-3 ${fb.is_resolved ? "border-gray-100 opacity-75" : "border-gray-200"}`}
      >
        {/* ヘッダー行：バッジ・投稿者・日付・アクションボタンを1行に */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {fb.is_resolved && (
            <Badge variant="outline" className="text-green-600 border-green-300">✓ 対応完了</Badge>
          )}
          <Badge variant={categoryVariant(fb.category)}>{fb.category}</Badge>
          <span className="text-sm font-medium text-gray-700">{fb.display_name}</span>
          <span className="text-xs text-gray-400">{formatDate(fb.created_at)}</span>
          <div className="ml-auto flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-gray-400 hover:text-gray-700"
              onClick={() => startEdit(fb)}
            >
              編集
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-red-400 hover:text-red-600"
              onClick={() => handleDelete(fb.id)}
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

        {/* 本文 */}
        <p className={`text-sm whitespace-pre-wrap ${fb.is_resolved ? "text-gray-400" : "text-gray-700"}`}>
          {fb.body}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 投稿フォーム */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">フィードバックを送る</h2>
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
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
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitLoading || !category || !body.trim()}>
              {submitLoading ? "送信中..." : "送信する"}
            </Button>
          </div>
        </form>
      </section>

      {/* フィードバック一覧 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          みんなのフィードバック
          <span className="ml-2 text-gray-400 font-normal">（{activeFeedbacks.length}件）</span>
        </h2>
        {activeFeedbacks.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
            <p className="text-sm text-gray-400">まだフィードバックはありません</p>
          </div>
        ) : (
          <div className="space-y-6">
            {renderByCategory(activeFeedbacks)}
          </div>
        )}
      </section>

      {/* 対応完了セクション（件数0のとき非表示） */}
      {resolvedFeedbacks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">
            対応完了
            <span className="ml-2 text-gray-400 font-normal">（{resolvedFeedbacks.length}件）</span>
          </h2>
          <div className="space-y-6">
            {renderByCategory(resolvedFeedbacks)}
          </div>
        </section>
      )}
    </div>
  );
}
