"use client";

import { useRef, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import type { TaskWithMembers, MemberWithRole } from "@/lib/types/database";
import GanttRow from "@/components/gantt/GanttRow";

const COL_WIDTH = 32; // 1日あたりのpx幅

type Props = {
  tasks: TaskWithMembers[];
  members: MemberWithRole[];
  projectId: string;
  viewStartDate: Date;
  totalDays: number;
  onTasksChange: (tasks: TaskWithMembers[]) => void;
  ganttRef?: React.RefObject<HTMLDivElement>;
};

// 日付を "MM/DD" 形式に変換
function formatMD(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 日付を "M月" 形式に変換
function formatMonth(date: Date): string {
  return `${date.getMonth() + 1}月`;
}

// 月ヘッダー用: 月ごとの開始列と日数を計算
function buildMonthGroups(startDate: Date, totalDays: number) {
  const groups: { label: string; days: number }[] = [];
  let current = new Date(startDate);
  for (let i = 0; i < totalDays; ) {
    const month = current.getMonth();
    const year = current.getFullYear();
    let count = 0;
    while (i + count < totalDays && new Date(startDate.getTime() + (i + count) * 86400000).getMonth() === month) {
      count++;
    }
    groups.push({ label: `${year}年${month + 1}月`, days: count });
    i += count;
    current = new Date(startDate.getTime() + i * 86400000);
  }
  return groups;
}

export default function CustomGantt({
  tasks,
  members,
  projectId,
  viewStartDate,
  totalDays,
  onTasksChange,
  ganttRef,
}: Props) {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const monthGroups = buildMonthGroups(viewStartDate, totalDays);

  // 今日の列インデックス
  const todayIndex = Math.floor((today.getTime() - viewStartDate.getTime()) / 86400000);

  // 行D&D完了時
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);

    onTasksChange(reordered);

    // display_order を一括更新
    await Promise.all(
      reordered.map((task, idx) =>
        supabase.from("tasks").update({ display_order: idx }).eq("id", task.id)
      )
    );
  }, [tasks, onTasksChange, supabase]);

  // タスク追加
  const handleAddTask = async () => {
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 86400000);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        name: "新しい工程",
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        is_completed: false,
        progress: 0,
        display_order: tasks.length,
        type: "task",
      })
      .select("*, task_members(member:members(*, role_data:roles(*)))")
      .single();
    if (!error && data) {
      onTasksChange([...tasks, data as TaskWithMembers]);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* ガントチャート本体 */}
      <div ref={ganttRef} className="overflow-x-auto">
        <div style={{ minWidth: `${480 + totalDays * COL_WIDTH}px` }}>
          {/* ヘッダー: 月行 */}
          <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
            {/* 左固定カラムヘッダー */}
            <div className="flex-shrink-0 w-[480px] border-r border-gray-200" />
            {/* 月グループ */}
            {monthGroups.map((g, i) => (
              <div
                key={i}
                className="text-xs font-medium text-gray-500 text-center border-r border-gray-100 py-1"
                style={{ width: `${g.days * COL_WIDTH}px`, flexShrink: 0 }}
              >
                {g.label}
              </div>
            ))}
          </div>

          {/* ヘッダー: 日行 */}
          <div className="flex border-b border-gray-200 bg-gray-50 sticky top-[28px] z-20">
            {/* 左固定カラムヘッダー */}
            <div
              className="flex-shrink-0 w-[480px] border-r border-gray-200 grid text-xs text-gray-400 font-medium"
              style={{ gridTemplateColumns: "32px 28px 32px 1fr 100px 72px 72px 60px 28px" }}
            >
              <div className="px-1 py-1 border-r border-gray-100 text-center">#</div>
              <div className="px-1 py-1 border-r border-gray-100" />
              <div className="px-1 py-1 border-r border-gray-100 text-center">完了</div>
              <div className="px-2 py-1 border-r border-gray-100">工程名</div>
              <div className="px-2 py-1 border-r border-gray-100">担当者</div>
              <div className="px-1 py-1 border-r border-gray-100 text-center">開始日</div>
              <div className="px-1 py-1 border-r border-gray-100 text-center">終了日</div>
              <div className="px-1 py-1 border-r border-gray-100">備考</div>
              <div className="px-1 py-1" />
            </div>
            {/* 日付ヘッダー */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = new Date(viewStartDate.getTime() + i * 86400000);
              const isToday = i === todayIndex;
              const isSun = d.getDay() === 0;
              const isSat = d.getDay() === 6;
              return (
                <div
                  key={i}
                  className={`text-[10px] text-center border-r border-gray-100 py-1 flex-shrink-0 ${
                    isToday ? "bg-orange-400 text-white font-bold" :
                    isSun ? "text-red-400" :
                    isSat ? "text-blue-400" :
                    "text-gray-400"
                  }`}
                  style={{ width: `${COL_WIDTH}px` }}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>

          {/* タスク行 */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.map((task, index) => (
                <GanttRow
                  key={task.id}
                  task={task}
                  index={index}
                  members={members}
                  viewStartDate={viewStartDate}
                  totalDays={totalDays}
                  todayIndex={todayIndex}
                  colWidth={COL_WIDTH}
                  onUpdate={(updated) =>
                    onTasksChange(tasks.map((t) => (t.id === updated.id ? updated : t)))
                  }
                  onDelete={() => onTasksChange(tasks.filter((t) => t.id !== task.id))}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* 工程追加ボタン */}
      <div className="border-t border-gray-100 px-4 py-2">
        <button
          onClick={handleAddTask}
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
        >
          <span className="text-lg leading-none">+</span> 工程を追加
        </button>
      </div>
    </div>
  );
}
