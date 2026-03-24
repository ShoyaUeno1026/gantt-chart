"use client";

import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import type { TaskWithMembers, MemberWithRole } from "@/lib/types/database";

type Props = {
  task: TaskWithMembers;
  index: number;
  members: MemberWithRole[];
  viewStartDate: Date;
  totalDays: number;
  todayIndex: number;
  colWidth: number;
  onUpdate: (task: TaskWithMembers) => void;
  onDelete: () => void;
};

// 日付文字列（YYYY-MM-DD）→ Date
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Date → YYYY-MM-DD（ローカルタイムゾーン基準）
// toISOString() はUTC変換されるため、日本時間では日付がずれる場合がある
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 担当者リストから代表カラーを取得
function getBarColor(task: TaskWithMembers): string {
  const first = task.task_members?.[0]?.member;
  return first?.role_data?.color ?? "#6366f1";
}

export default function GanttRow({
  task,
  index,
  members,
  viewStartDate,
  totalDays,
  todayIndex,
  colWidth,
  onUpdate,
  onDelete,
}: Props) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [showMemberSelect, setShowMemberSelect] = useState(false);

  // バードラッグ用の状態
  const barDragRef = useRef<{ startX: number } | null>(null);
  const [barDragOffset, setBarDragOffset] = useState(0); // ドラッグ中の日数オフセット

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // バーの位置・幅を計算
  const startDate = parseDate(task.start_date);
  const endDate = parseDate(task.end_date);
  const viewStart = new Date(viewStartDate);
  viewStart.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const barLeft = Math.max(0, Math.floor((startDate.getTime() - viewStart.getTime()) / 86400000));
  const barEnd = Math.min(totalDays - 1, Math.floor((endDate.getTime() - viewStart.getTime()) / 86400000));
  const barWidth = Math.max(1, barEnd - barLeft + 1);
  const barColor = getBarColor(task);

  // フィールド更新 + DB保存
  const updateField = async (patch: Partial<TaskWithMembers>) => {
    const updated = { ...task, ...patch };
    onUpdate(updated);
    await supabase.from("tasks").update(patch as object).eq("id", task.id);
  };

  // 完了トグル
  const toggleComplete = () => updateField({ is_completed: !task.is_completed });

  // 担当者の追加/削除（多対多）
  const toggleMember = async (memberId: string) => {
    const exists = task.task_members?.some((tm) => tm.member.id === memberId);
    if (exists) {
      await supabase.from("task_members").delete()
        .eq("task_id", task.id).eq("member_id", memberId);
    } else {
      await supabase.from("task_members").insert({ task_id: task.id, member_id: memberId });
    }
    // 最新データを再取得
    const { data } = await supabase
      .from("tasks")
      .select("*, task_members(member:members(*, role_data:roles(*)))")
      .eq("id", task.id)
      .single();
    if (data) onUpdate(data as TaskWithMembers);
  };

  const assignedMemberIds = new Set(task.task_members?.map((tm) => tm.member.id) ?? []);

  // ---- バードラッグ処理 ----

  // ドラッグ開始: ポインターキャプチャで要素外のムーブも取得
  const handleBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation(); // @dnd-kit の行並び替えと競合防止
    e.preventDefault();
    barDragRef.current = { startX: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // ドラッグ中: 移動量を日数に変換してオフセット更新
  const handleBarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barDragRef.current) return;
    const dx = e.clientX - barDragRef.current.startX;
    setBarDragOffset(Math.round(dx / colWidth));
  };

  // ドラッグ終了: 新しい日付を計算してDBに保存
  const handleBarPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barDragRef.current) return;
    const dx = e.clientX - barDragRef.current.startX;
    const dayOffset = Math.round(dx / colWidth);
    barDragRef.current = null;
    setBarDragOffset(0);

    if (dayOffset === 0) return;

    const msOffset = dayOffset * 86400000;
    await updateField({
      start_date: toDateStr(new Date(parseDate(task.start_date).getTime() + msOffset)),
      end_date:   toDateStr(new Date(parseDate(task.end_date).getTime()   + msOffset)),
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex border-b border-gray-100 hover:bg-gray-50 group ${task.is_completed ? "bg-gray-50" : ""}`}
    >
      {/* 左固定カラム */}
      <div
        className="shrink-0 w-120 border-r border-gray-200 grid items-center"
        style={{ gridTemplateColumns: "32px 28px 32px 1fr 100px 72px 72px 60px 28px" }}
      >
        {/* 行番号 */}
        <div className="px-1 py-2 text-xs text-gray-400 text-center border-r border-gray-100">
          {index + 1}
        </div>

        {/* D&Dハンドル */}
        {/* suppressHydrationWarning: dnd-kit の aria-describedby ID がSSR/CSRで異なるため */}
        <div
          {...attributes}
          {...listeners}
          suppressHydrationWarning
          className="px-1 py-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 border-r border-gray-100 flex items-center justify-center"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6h2v2H8V6zm0 4h2v2H8v-2zm0 4h2v2H8v-2zm6-8h2v2h-2V6zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" />
          </svg>
        </div>

        {/* 完了チェックボックス */}
        <div className="px-1 py-2 border-r border-gray-100 flex items-center justify-center">
          <input
            type="checkbox"
            checked={task.is_completed}
            onChange={toggleComplete}
            className="w-4 h-4 accent-indigo-600 cursor-pointer"
          />
        </div>

        {/* 工程名 */}
        <div className="px-2 py-2 border-r border-gray-100">
          <input
            type="text"
            value={task.name}
            onChange={(e) => updateField({ name: e.target.value })}
            className={`w-full text-sm bg-transparent outline-none focus:bg-white focus:border-b focus:border-indigo-300 ${task.is_completed ? "line-through text-gray-400" : "text-gray-800"}`}
          />
        </div>

        {/* 担当者（複数選択） */}
        <div className="px-1 py-2 border-r border-gray-100 relative">
          <div
            className="flex flex-wrap gap-0.5 cursor-pointer min-h-6"
            onClick={() => setShowMemberSelect(!showMemberSelect)}
          >
            {task.task_members?.length > 0 ? (
              task.task_members.map((tm) => (
                <span
                  key={tm.member.id}
                  className="text-[10px] text-white px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: tm.member.role_data?.color ?? "#9ca3af" }}
                >
                  {tm.member.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-300">-</span>
            )}
          </div>
          {/* 担当者選択ドロップダウン */}
          {showMemberSelect && (
            <div className="absolute top-full left-0 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-35 space-y-1">
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={assignedMemberIds.has(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="accent-indigo-600"
                  />
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: m.role_data?.color ?? "#9ca3af" }}
                  />
                  <span className="text-xs text-gray-700">{m.name}</span>
                </label>
              ))}
              <button
                onClick={() => setShowMemberSelect(false)}
                className="w-full text-xs text-center text-gray-400 hover:text-gray-600 pt-1 border-t border-gray-100"
              >
                閉じる
              </button>
            </div>
          )}
        </div>

        {/* 開始日 */}
        <div className="px-1 py-2 border-r border-gray-100">
          <input
            type="date"
            value={task.start_date}
            onChange={(e) => updateField({ start_date: e.target.value })}
            className="w-full text-[11px] text-gray-600 bg-transparent outline-none focus:border-b focus:border-indigo-300"
          />
        </div>

        {/* 終了日 */}
        <div className="px-1 py-2 border-r border-gray-100">
          <input
            type="date"
            value={task.end_date}
            onChange={(e) => updateField({ end_date: e.target.value })}
            className="w-full text-[11px] text-gray-600 bg-transparent outline-none focus:border-b focus:border-indigo-300"
          />
        </div>

        {/* 備考 */}
        <div className="px-1 py-2 border-r border-gray-100">
          <input
            type="text"
            value={task.notes ?? ""}
            onChange={(e) => updateField({ notes: e.target.value })}
            placeholder="備考..."
            className="w-full text-[11px] text-gray-500 bg-transparent outline-none focus:border-b focus:border-indigo-300 placeholder:text-gray-200"
          />
        </div>

        {/* 削除ボタン */}
        <div className="px-1 py-2 flex items-center justify-center">
          <button
            onClick={async () => {
              await supabase.from("tasks").delete().eq("id", task.id);
              onDelete();
            }}
            className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 右タイムラインエリア */}
      <div className="relative shrink-0" style={{ width: `${totalDays * colWidth}px`, height: "40px" }}>
        {/* 背景の日付グリッド */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const d = new Date(viewStartDate.getTime() + i * 86400000);
          const isToday = i === todayIndex;
          const isSat = d.getDay() === 6;
          const isSun = d.getDay() === 0;
          return (
            <div
              key={i}
              className={`absolute top-0 bottom-0 border-r border-gray-100 ${isToday ? "bg-orange-50" : isSat || isSun ? "bg-gray-50/50" : ""}`}
              style={{ left: `${i * colWidth}px`, width: `${colWidth}px` }}
            />
          );
        })}

        {/* ガントバー */}
        {barLeft < totalDays && barEnd >= 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-6 rounded flex items-center px-2 text-white text-[11px] font-medium overflow-hidden whitespace-nowrap select-none cursor-grab active:cursor-grabbing"
            style={{
              left: `${(barLeft + barDragOffset) * colWidth}px`,
              width: `${barWidth * colWidth - 2}px`,
              backgroundColor: task.is_completed ? "#9ca3af" : barColor,
              opacity: task.is_completed ? (barDragOffset !== 0 ? 0.5 : 0.7) : (barDragOffset !== 0 ? 0.85 : 1),
              transition: barDragOffset !== 0 ? "none" : undefined,
            }}
            title={task.name}
            onPointerDown={handleBarPointerDown}
            onPointerMove={handleBarPointerMove}
            onPointerUp={handleBarPointerUp}
            onPointerCancel={handleBarPointerUp}
          >
            {barWidth > 2 && task.name}
          </div>
        )}
      </div>
    </div>
  );
}
