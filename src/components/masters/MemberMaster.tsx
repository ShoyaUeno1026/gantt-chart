"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MemberWithRole, Role } from "@/lib/types/database";

type Props = {
  members: MemberWithRole[];
  roles: Role[];
  projectId: string;
  onMembersChange: (members: MemberWithRole[]) => void;
};

// 担当者マスター（左カラム）
export default function MemberMaster({ members, roles, projectId, onMembersChange }: Props) {
  const [newName, setNewName] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [newType, setNewType] = useState<"member" | "client">("member");
  const supabase = createClient();

  // 社内メンバーとクライアントを分けて表示
  const internalMembers = members.filter((m) => m.project_id === null);
  const clients = members.filter((m) => m.project_id !== null);

  // 担当者追加
  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { data, error } = await supabase
      .from("members")
      .insert({
        name: newName.trim(),
        role: "",
        color: "#6366F1",
        role_id: newRoleId || null,
        project_id: newType === "client" ? projectId : null,
      })
      .select("*, role_data:roles(*)")
      .single();
    if (!error && data) {
      onMembersChange([...members, data as MemberWithRole]);
      setNewName("");
      setNewRoleId("");
    }
  };

  // 役割変更
  const handleRoleChange = async (memberId: string, roleId: string) => {
    await supabase
      .from("members")
      .update({ role_id: roleId || null })
      .eq("id", memberId);
    const role = roles.find((r) => r.id === roleId) ?? null;
    onMembersChange(
      members.map((m) =>
        m.id === memberId ? { ...m, role_id: roleId || null, role_data: role } : m
      )
    );
  };

  // 担当者削除
  const handleDelete = async (memberId: string) => {
    await supabase.from("members").delete().eq("id", memberId);
    onMembersChange(members.filter((m) => m.id !== memberId));
  };

  // 担当者行コンポーネント（社内・クライアント共通）
  const MemberRow = ({ member }: { member: MemberWithRole }) => (
    <div key={member.id} className="grid grid-cols-[1fr_2fr_auto_auto] gap-2 items-center py-2 border-b border-gray-50">
      <span className="text-sm text-gray-700">{member.name}</span>
      <select
        value={member.role_id ?? ""}
        onChange={(e) => handleRoleChange(member.id, e.target.value)}
        className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:border-indigo-400 outline-none"
      >
        <option value="">役割を選択</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      {/* プレビューバッジ */}
      <span
        className="text-xs text-white px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
        style={{ backgroundColor: member.role_data?.color ?? "#9ca3af" }}
      >
        {member.name}
      </span>
      <button
        onClick={() => handleDelete(member.id)}
        className="text-gray-300 hover:text-red-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        担当者マスター
      </h3>

      {/* テーブルヘッダー */}
      <div className="grid grid-cols-[1fr_2fr_auto_auto] gap-2 text-xs text-gray-400 pb-1 border-b border-gray-100">
        <span>名前</span>
        <span>役割</span>
        <span>プレビュー</span>
        <span>操作</span>
      </div>

      {/* 社内メンバー */}
      {internalMembers.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-400 mb-1">社内メンバー</p>
          {internalMembers.map((m) => <MemberRow key={m.id} member={m} />)}
        </div>
      )}

      {/* クライアント */}
      {clients.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-cyan-500 mb-1">クライアント（このプロジェクト）</p>
          {clients.map((m) => <MemberRow key={m.id} member={m} />)}
        </div>
      )}

      {/* 追加フォーム */}
      <div className="space-y-2 pt-1 border-t border-gray-100">
        {/* 種別トグル */}
        <div className="flex gap-1">
          <button
            onClick={() => setNewType("member")}
            className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${newType === "member" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            社内メンバー
          </button>
          <button
            onClick={() => setNewType("client")}
            className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${newType === "client" ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            クライアント
          </button>
        </div>

        <div className="grid grid-cols-[1fr_2fr_auto_auto] gap-2 items-center">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="担当者名"
            className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:border-indigo-400 outline-none"
          />
          <select
            value={newRoleId}
            onChange={(e) => setNewRoleId(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:border-indigo-400 outline-none"
          >
            <option value="">役割を選択</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <span /> {/* プレビュー列の空白 */}
          <button
            onClick={handleAdd}
            className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors text-lg leading-none"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
