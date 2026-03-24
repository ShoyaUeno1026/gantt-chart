"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import "gantt-task-react/dist/index.css";
import type { Task as GanttTask, ViewMode } from "gantt-task-react";
import type { TaskWithMember, Member } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import TaskFormModal from "@/components/gantt/TaskFormModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// gantt-task-react はSSR非対応のためdynamic importを使用
const Gantt = dynamic(
  () => import("gantt-task-react").then((m) => m.Gantt),
  { ssr: false }
);

// ViewMode をgantt-task-reactから読み込む際もdynamicを使う必要がある
// 直接定数で定義
const VIEW_MODES = ["日", "週", "月"] as const;
type ViewModeLabel = (typeof VIEW_MODES)[number];

// 表示モードのマッピング
const VIEW_MODE_MAP: Record<ViewModeLabel, ViewMode> = {
  日: "Day" as ViewMode,
  週: "Week" as ViewMode,
  月: "Month" as ViewMode,
};

type Props = {
  initialTasks: TaskWithMember[];
  members: Member[];
  projectId: string;
};

// DB の TaskWithMember を gantt-task-react の Task 型に変換
function toGanttTask(task: TaskWithMember): GanttTask {
  const color = task.member?.color ?? "#6366F1";
  // 完了タスクはグレーに
  const barColor = task.is_completed ? "#9CA3AF" : color;
  return {
    id: task.id,
    name: task.name,
    start: new Date(task.start_date),
    end: new Date(task.end_date),
    progress: task.progress,
    type: task.type as GanttTask["type"],
    project: task.parent_id ?? undefined,
    styles: {
      backgroundColor: barColor,
      backgroundSelectedColor: barColor,
      progressColor: task.is_completed ? "#6B7280" : darkenColor(color),
      progressSelectedColor: task.is_completed ? "#6B7280" : darkenColor(color),
    },
    isDisabled: false,
  };
}

// カラーをやや暗くする（進捗バー用）
function darkenColor(hex: string): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - 40);
  const g = Math.max(0, ((num >> 8) & 0xff) - 40);
  const b = Math.max(0, (num & 0xff) - 40);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export default function GanttView({ initialTasks, members, projectId }: Props) {
  const [tasks, setTasks] = useState<TaskWithMember[]>(initialTasks);
  const [viewMode, setViewMode] = useState<ViewModeLabel>("週");
  const [editingTask, setEditingTask] = useState<TaskWithMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const supabase = createClient();

  // Supabase Realtime でタスクの変更をリアルタイム受信
  useEffect(() => {
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
            return;
          }
          // INSERT/UPDATE: 担当者情報を再取得して反映
          const { data } = await supabase
            .from("tasks")
            .select("*, member:members(*)")
            .eq("id", (payload.new as { id: string }).id)
            .single();
          const typedData = data as unknown as TaskWithMember | null;
          if (typedData) {
            setTasks((prev) => {
              const exists = prev.find((t) => t.id === typedData.id);
              if (exists) return prev.map((t) => (t.id === typedData.id ? typedData : t));
              return [...prev, typedData];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId]);

  const ganttTasks = tasks
    .sort((a, b) => a.display_order - b.display_order)
    .map(toGanttTask);

  // D&D でバーを移動したときの処理
  const handleTaskChange = useCallback(
    async (changedTask: GanttTask) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          start_date: changedTask.start.toISOString().split("T")[0],
          end_date: changedTask.end.toISOString().split("T")[0],
        })
        .eq("id", changedTask.id);

      if (!error) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === changedTask.id
              ? {
                  ...t,
                  start_date: changedTask.start.toISOString().split("T")[0],
                  end_date: changedTask.end.toISOString().split("T")[0],
                }
              : t
          )
        );
      }
    },
    [supabase]
  );

  // 進捗バー変更時の処理
  const handleProgressChange = useCallback(
    async (changedTask: GanttTask) => {
      const { error } = await supabase
        .from("tasks")
        .update({ progress: Math.round(changedTask.progress) })
        .eq("id", changedTask.id);

      if (!error) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === changedTask.id
              ? { ...t, progress: Math.round(changedTask.progress) }
              : t
          )
        );
      }
    },
    [supabase]
  );

  // タスクをダブルクリックで編集
  const handleDoubleClick = useCallback(
    (task: GanttTask) => {
      const found = tasks.find((t) => t.id === task.id);
      if (found) setEditingTask(found);
    },
    [tasks]
  );

  // チェックボックスで完了/未完了を切り替え
  const handleToggleComplete = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newCompleted = !task.is_completed;
    const newProgress = newCompleted ? 100 : task.progress < 100 ? task.progress : 0;

    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: newCompleted, progress: newProgress })
      .eq("id", taskId);

    if (!error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, is_completed: newCompleted, progress: newProgress }
            : t
        )
      );
    }
  };

  // タスク保存後のコールバック
  const handleTaskSaved = (savedTask: TaskWithMember) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === savedTask.id);
      if (exists) return prev.map((t) => (t.id === savedTask.id ? savedTask : t));
      return [...prev, savedTask];
    });
    setEditingTask(null);
    setShowAddModal(false);
  };

  // タスク削除後のコールバック
  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setEditingTask(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ツールバー */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === mode
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          + 工程を追加
        </Button>
      </div>

      {/* タスクリスト（チェックボックス付き） */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 font-medium w-8">完了</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">工程名</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">担当者</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">開始日</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">終了日</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">進捗</th>
              </tr>
            </thead>
            <tbody>
              {tasks
                .sort((a, b) => a.display_order - b.display_order)
                .map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setEditingTask(task)}
                  >
                    {/* 完了チェックボックス */}
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={task.is_completed}
                        onChange={() => handleToggleComplete(task.id)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <span className={task.is_completed ? "line-through text-gray-400" : "text-gray-800"}>
                        {task.name}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {task.member ? (
                        <Badge
                          style={{ backgroundColor: task.member.color, color: "#fff" }}
                          className="text-xs"
                        >
                          {task.member.name}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(task.start_date).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(task.end_date).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${task.progress}%`,
                              backgroundColor: task.member?.color ?? "#6366F1",
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{task.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ガントチャート本体 */}
      {ganttTasks.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Gantt
            tasks={ganttTasks}
            viewMode={VIEW_MODE_MAP[viewMode]}
            onDateChange={handleTaskChange}
            onProgressChange={handleProgressChange}
            onDoubleClick={handleDoubleClick}
            listCellWidth=""
            columnWidth={viewMode === "日" ? 40 : viewMode === "週" ? 140 : 200}
            locale="ja"
            barFill={70}
            todayColor="rgba(99, 102, 241, 0.08)"
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400">工程がまだありません。「工程を追加」から追加してください。</p>
        </div>
      )}

      {/* タスク追加モーダル */}
      {showAddModal && (
        <TaskFormModal
          projectId={projectId}
          members={members}
          displayOrder={tasks.length}
          onSaved={handleTaskSaved}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* タスク編集モーダル */}
      {editingTask && (
        <TaskFormModal
          projectId={projectId}
          members={members}
          task={editingTask}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
