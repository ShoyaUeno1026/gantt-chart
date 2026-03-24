"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types/database";

type Props = {
  roles: Role[];
  onRolesChange: (roles: Role[]) => void;
};

const DEFAULT_COLORS = [
  "#1e293b", "#f97316", "#3b82f6", "#06b6d4",
  "#10b981", "#ec4899", "#8b5cf6", "#f59e0b",
];

// 役割マスター（右カラム）
export default function RoleMaster({ roles, onRolesChange }: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  // 役割名インライン編集用: { roleId: 編集中テキスト }
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const supabase = createClient();

  // 役割追加
  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { data, error } = await supabase
      .from("roles")
      .insert({ name: newName.trim(), color: newColor, display_order: roles.length })
      .select()
      .single();
    if (!error && data) {
      onRolesChange([...roles, data as Role]);
      setNewName("");
    }
  };

  // 役割カラー更新
  const handleColorChange = async (roleId: string, color: string) => {
    await supabase.from("roles").update({ color }).eq("id", roleId);
    onRolesChange(roles.map((r) => (r.id === roleId ? { ...r, color } : r)));
  };

  // 役割名更新（blur または Enter で確定）
  const handleNameUpdate = async (roleId: string) => {
    const newName = editingNames[roleId]?.trim();
    // 編集中でない、または変更なしはスキップ
    if (!newName || newName === roles.find((r) => r.id === roleId)?.name) {
      setEditingNames((prev) => { const next = { ...prev }; delete next[roleId]; return next; });
      return;
    }
    const { error } = await supabase.from("roles").update({ name: newName }).eq("id", roleId);
    if (!error) {
      onRolesChange(roles.map((r) => (r.id === roleId ? { ...r, name: newName } : r)));
    } else {
      // UNIQUE制約違反など: 元の名前に戻す
      alert(`役割名「${newName}」は既に使われています`);
    }
    setEditingNames((prev) => { const next = { ...prev }; delete next[roleId]; return next; });
  };

  // 役割削除
  const handleDelete = async (roleId: string) => {
    await supabase.from("roles").delete().eq("id", roleId);
    onRolesChange(roles.filter((r) => r.id !== roleId));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        役割マスター
      </h3>

      {/* 役割一覧（アイコン形式） */}
      <div className="flex flex-wrap gap-3">
        {roles.map((role) => {
          const displayName = editingNames[role.id] ?? role.name;
          return (
            <div
              key={role.id}
              className={`flex flex-col items-center gap-1 cursor-pointer group relative ${editingId === role.id ? "ring-2 ring-indigo-400 rounded-xl p-1" : ""}`}
              onClick={() => setEditingId(editingId === role.id ? null : role.id)}
            >
              {/* アイコン円: 編集中は editingNames の先頭文字を表示 */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                style={{ backgroundColor: role.color }}
              >
                {displayName[0] ?? "?"}
              </div>

              {/* 役割名インライン編集 */}
              <input
                type="text"
                value={displayName}
                onChange={(e) =>
                  setEditingNames((prev) => ({ ...prev, [role.id]: e.target.value }))
                }
                onFocus={() =>
                  setEditingNames((prev) => ({ ...prev, [role.id]: role.name }))
                }
                onBlur={() => handleNameUpdate(role.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.currentTarget.blur(); }
                  e.stopPropagation(); // カラーパネル開閉と競合防止
                }}
                onClick={(e) => e.stopPropagation()} // カラーパネル開閉と競合防止
                className="text-xs text-gray-600 text-center w-16 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none"
              />

              {/* カラーピッカー（選択時表示） */}
              {editingId === role.id && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2 w-40">
                  <div className="flex flex-wrap gap-1">
                    {DEFAULT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={(e) => { e.stopPropagation(); handleColorChange(role.id, c); }}
                        className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${role.color === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={role.color}
                    onChange={(e) => handleColorChange(role.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-7 rounded cursor-pointer"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(role.id); }}
                    className="w-full text-xs text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 役割追加フォーム */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleAdd()}
          placeholder="役割名を入力"
          className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:border-indigo-400 outline-none"
        />
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 text-sm font-medium bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          + 追加
        </button>
      </div>
    </div>
  );
}
