"use client";

import type { Project, Task } from "@/lib/types/database";

type Props = {
  project: Project;
  tasks: Task[];
  onChange: (updated: Partial<Project>) => void;
};

// 2日間の差分を「○日間」で返す
function calcDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "-";
  const diff = Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / 86400000
  );
  return diff > 0 ? `${diff}日間` : "-";
}

// 日付文字列（YYYY-MM-DD）→ Date（ローカルタイムゾーン基準）
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 工程の日数を計算（最小1日）
function taskDays(task: Task): number {
  const start = parseDate(task.start_date);
  const end = parseDate(task.end_date);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

// プロジェクト基本情報フォーム（上部）
export default function ProjectInfoForm({ project, tasks, onChange }: Props) {
  // 日数ベース進捗: 完了工程の日数合計 ÷ 全工程の日数合計
  const totalDays = tasks.reduce((sum, t) => sum + taskDays(t), 0);
  const completedDays = tasks.filter((t) => t.is_completed).reduce((sum, t) => sum + taskDays(t), 0);
  const progressPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalCount = tasks.length;
  const duration = calcDuration(project.created_at?.split("T")[0] ?? null, project.end_date);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      {/* 1行目: プロジェクト名・クライアント・代表担当者 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">プロジェクト名</label>
          <input
            type="text"
            value={project.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="○○○○様 Webサイトリニューアル"
            className="w-full text-sm border-0 border-b border-gray-200 focus:border-indigo-400 outline-none py-1 bg-transparent placeholder:text-gray-300"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">クライアント</label>
          <input
            type="text"
            value={project.client_name ?? ""}
            onChange={(e) => onChange({ client_name: e.target.value })}
            placeholder="○○○○株式会社"
            className="w-full text-sm border-0 border-b border-gray-200 focus:border-indigo-400 outline-none py-1 bg-transparent placeholder:text-gray-300"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">代表担当者</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={project.representative ?? ""}
              onChange={(e) => onChange({ representative: e.target.value })}
              placeholder="田中 太郎"
              className="w-full text-sm border-0 border-b border-gray-200 focus:border-indigo-400 outline-none py-1 bg-transparent placeholder:text-gray-300"
            />
            <span className="text-sm text-gray-500 flex-shrink-0">様</span>
          </div>
        </div>
      </div>

      {/* 2行目: 開始日・完了予定日・制作期間・進捗 */}
      <div className="grid grid-cols-4 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">開始日</label>
          <input
            type="date"
            value={project.created_at?.split("T")[0] ?? ""}
            readOnly
            className="w-full text-sm border border-gray-200 rounded-md px-2 py-1 bg-gray-50 text-gray-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">完了予定日</label>
          <input
            type="date"
            value={project.end_date ?? ""}
            onChange={(e) => onChange({ end_date: e.target.value || null })}
            className="w-full text-sm border border-gray-200 rounded-md px-2 py-1 focus:border-indigo-400 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">制作期間</label>
          <div className="text-sm font-medium text-orange-500 border border-orange-200 rounded-md px-2 py-1 bg-orange-50">
            {duration}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">進捗</label>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">完了工程</span>
              <span className="text-xs font-medium text-indigo-600">
                {progressPct}% ({completedCount}/{totalCount}工程 · {completedDays}/{totalDays}日)
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
