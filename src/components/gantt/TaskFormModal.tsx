"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaskWithMember, Member } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  projectId: string;
  members: Member[];
  task?: TaskWithMember;           // 編集時のみ渡す
  displayOrder?: number;            // 新規追加時の表示順
  onSaved: (task: TaskWithMember) => void;
  onDeleted?: (taskId: string) => void;
  onClose: () => void;
};

// タスク追加・編集モーダル
export default function TaskFormModal({
  projectId,
  members,
  task,
  displayOrder = 0,
  onSaved,
  onDeleted,
  onClose,
}: Props) {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const [name, setName] = useState(task?.name ?? "");
  const [startDate, setStartDate] = useState(task?.start_date ?? today);
  const [endDate, setEndDate] = useState(task?.end_date ?? nextWeek);
  const [memberId, setMemberId] = useState(task?.member_id ?? "");
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const payload = {
      project_id: projectId,
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
      member_id: memberId || null,
      progress,
      display_order: task?.display_order ?? displayOrder,
    };

    let result;
    if (task) {
      // 既存タスクを更新
      result = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", task.id)
        .select("*, member:members(*)")
        .single();
    } else {
      // 新規タスクを追加
      result = await supabase
        .from("tasks")
        .insert(payload)
        .select("*, member:members(*)")
        .single();
    }

    setLoading(false);
    if (!result.error && result.data) {
      onSaved(result.data as TaskWithMember);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm("この工程を削除しますか？")) return;
    setLoading(true);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setLoading(false);
    if (!error && onDeleted) onDeleted(task.id);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "工程を編集" : "工程を追加"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {/* 工程名 */}
          <div className="space-y-1">
            <Label htmlFor="task-name">工程名 *</Label>
            <Input
              id="task-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：ワイヤーフレーム作成"
              required
            />
          </div>

          {/* 開始日・終了日 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="start-date">開始日 *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-date">終了日 *</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 担当者 */}
          <div className="space-y-1">
            <Label htmlFor="member">担当者</Label>
            <select
              id="member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">担当者なし</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}（{m.role}）
                </option>
              ))}
            </select>
          </div>

          {/* 進捗率 */}
          <div className="space-y-1">
            <Label htmlFor="progress">進捗率: {progress}%</Label>
            <input
              id="progress"
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <DialogFooter className="flex justify-between">
            {task && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                削除
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "保存中..." : "保存"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
