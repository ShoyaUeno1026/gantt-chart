"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Project, Role, MemberWithRole, TaskWithMembers, ProjectExportData,
} from "@/lib/types/database";
import PageHeader from "@/components/layout/PageHeader";
import ProjectInfoForm from "@/components/project/ProjectInfoForm";
import MemberMaster from "@/components/masters/MemberMaster";
import RoleMaster from "@/components/masters/RoleMaster";
import CustomGantt from "@/components/gantt/CustomGantt";

type Props = {
  initialProject: Project;
  initialRoles: Role[];
  initialMembers: MemberWithRole[];
  initialTasks: TaskWithMembers[];
};

// ビュー範囲を計算（プロジェクト開始〜終了 or デフォルト90日）
function calcViewRange(project: Project, tasks: TaskWithMembers[]): { start: Date; days: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // タスクの最小開始日・最大終了日
  const dates = tasks.flatMap((t) => [new Date(t.start_date), new Date(t.end_date)]);
  const projectStart = new Date(project.created_at);
  const projectEnd = project.end_date ? new Date(project.end_date) : null;

  const minDate = dates.length > 0
    ? new Date(Math.min(...dates.map((d) => d.getTime()), projectStart.getTime()))
    : projectStart;
  const maxDate = dates.length > 0
    ? new Date(Math.max(...dates.map((d) => d.getTime()), projectEnd?.getTime() ?? today.getTime()))
    : (projectEnd ?? new Date(today.getTime() + 90 * 86400000));

  // 前後に少しパディング
  const start = new Date(minDate.getTime() - 7 * 86400000);
  start.setHours(0, 0, 0, 0);
  const end = new Date(maxDate.getTime() + 14 * 86400000);
  end.setHours(0, 0, 0, 0);
  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);

  return { start, days };
}

// ナビゲーション週移動量（週単位）
const WEEK_SHIFT = 7;

export default function ProjectClient({
  initialProject,
  initialRoles,
  initialMembers,
  initialTasks,
}: Props) {
  const supabase = createClient();
  const ganttRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<Project>(initialProject);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [members, setMembers] = useState<MemberWithRole[]>(initialMembers);
  const [tasks, setTasks] = useState<TaskWithMembers[]>(
    [...initialTasks].sort((a, b) => a.display_order - b.display_order)
  );
  const [saving, setSaving] = useState(false);

  // ビュー範囲
  const { start: defaultStart, days: defaultDays } = calcViewRange(project, tasks);
  const [viewOffset, setViewOffset] = useState(0); // 週単位のオフセット
  const viewStartDate = new Date(defaultStart.getTime() + viewOffset * 86400000);
  const totalDays = defaultDays;

  // プロジェクト情報の変更（ローカルのみ・保存ボタンで確定）
  const handleProjectChange = (patch: Partial<Project>) => {
    setProject((prev) => ({ ...prev, ...patch }));
  };

  // 保存（プロジェクト情報のみ手動保存。タスクは自動保存済み）
  const handleSave = async () => {
    setSaving(true);
    await supabase.from("projects").update({
      name: project.name,
      client_name: project.client_name,
      representative: project.representative,
      end_date: project.end_date,
    }).eq("id", project.id);
    setSaving(false);
  };

  // クリア（全タスク削除）
  const handleClear = async () => {
    if (!confirm("全工程を削除しますか？この操作は元に戻せません。")) return;
    await supabase.from("tasks").delete().eq("project_id", project.id);
    setTasks([]);
  };

  // JSON出力
  const handleExportJson = () => {
    const exportData: ProjectExportData = {
      project,
      roles,
      members,
      tasks,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON読込
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data: ProjectExportData = JSON.parse(text);

    if (!confirm("現在のデータを読込データで上書きしますか？")) return;

    // プロジェクト情報更新
    setProject(data.project);
    await supabase.from("projects").update({
      name: data.project.name,
      client_name: data.project.client_name,
      representative: data.project.representative,
      end_date: data.project.end_date,
    }).eq("id", project.id);

    // タスク一括置き換え
    await supabase.from("tasks").delete().eq("project_id", project.id);
    if (data.tasks.length > 0) {
      const insertData = data.tasks.map((t, idx) => ({
        project_id: project.id,
        name: t.name,
        start_date: t.start_date,
        end_date: t.end_date,
        is_completed: t.is_completed,
        notes: t.notes,
        display_order: idx,
        progress: 0,
        type: "task" as const,
      }));
      await supabase.from("tasks").insert(insertData);
    }
    // リロード
    window.location.reload();
  };

  // 画像保存（ガントエリアをPNG出力）
  // html2canvas は Tailwind v4 の oklch() カラー関数に非対応のため html-to-image を使用
  const handleSaveImage = async () => {
    const el = ganttRef.current;
    if (!el) return;
    const { toPng } = await import("html-to-image");
    const url = await toPng(el, { pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}_gantt_${new Date().toISOString().split("T")[0]}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        onClear={handleClear}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onSaveImage={handleSaveImage}
        onSave={handleSave}
        saving={saving}
      />

      <main className="px-5 py-4 space-y-4 max-w-[1600px] mx-auto">
        {/* プロジェクト基本情報 */}
        <ProjectInfoForm
          project={project}
          tasks={tasks}
          onChange={handleProjectChange}
        />

        {/* 担当者マスター + 役割マスター */}
        <div className="grid grid-cols-2 gap-4">
          <MemberMaster
            members={members}
            roles={roles}
            projectId={project.id}
            onMembersChange={setMembers}
          />
          <RoleMaster
            roles={roles}
            onRolesChange={setRoles}
          />
        </div>

        {/* ガントチャート */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* ガントツールバー */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              ガントチャート
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setViewOffset((v) => v - WEEK_SHIFT)}
                className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
              >
                ◄ 前週
              </button>
              <span className="text-xs text-gray-500 min-w-25 text-center">
                {viewStartDate.getMonth() + 1}/{viewStartDate.getDate()} 〜{" "}
                {new Date(viewStartDate.getTime() + totalDays * 86400000).getMonth() + 1}/
                {new Date(viewStartDate.getTime() + totalDays * 86400000).getDate()}
              </span>
              <button
                onClick={() => setViewOffset((v) => v + WEEK_SHIFT)}
                className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
              >
                次週 ►
              </button>
              <button
                onClick={() => setViewOffset(0)}
                className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
              >
                今日
              </button>
            </div>
          </div>

          {/* ガントチャート本体 */}
          <CustomGantt
            tasks={tasks}
            members={members}
            projectId={project.id}
            viewStartDate={viewStartDate}
            totalDays={totalDays}
            onTasksChange={setTasks}
            ganttRef={ganttRef as React.RefObject<HTMLDivElement>}
          />
        </div>
      </main>
    </div>
  );
}
