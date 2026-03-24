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
  const [newRoleIds, setNewRoleIds] = useState<string[]>([]);
  const [newType, setNewType] = useState<"member" | "client">("member");
  const supabase = createClient();

  // 社内メンバーとクライアントを分けて表示
  const internalMembers = members.filter((m) => m.project_id === null);
  const clients = members.filter((m) => m.project_id !== null);

  // 担当者追加
  const handleAdd = async () => {
    if (!newName.trim()) return;

    // 1. members に INSERT
    const { data, error } = await supabase
      .from("members")
      .insert({
        name: newName.trim(),
        role: "",
        color: "#6366F1",
        project_id: newType === "client" ? projectId : null,
      })
      .select("*")
      .single();

    if (error || !data) return;

    // 2. member_roles に一括 INSERT
    if (newRoleIds.length > 0) {
      await supabase.from("member_roles").insert(
        newRoleIds.map((roleId) => ({ member_id: data.id, role_id: roleId }))
      );
    }

    // 3. member_roles を含む最新データを再取得
    const { data: fresh } = await supabase
      .from("members")
      .select("*, member_roles(role:roles(*))")
      .eq("id", data.id)
      .single();

    if (fresh) onMembersChange([...members, fresh as MemberWithRole]);
    setNewName("");
    setNewRoleIds([]);
  };

  // 役割のトグル（member_roles テーブルを操作）
  const handleRoleToggle = async (memberId: string, roleId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const hasRole = member.member_roles.some((mr) => mr.role.id === roleId);
    if (hasRole) {
      await supabase.from("member_roles").delete()
        .eq("member_id", memberId).eq("role_id", roleId);
    } else {
      await supabase.from("member_roles").insert({ member_id: memberId, role_id: roleId });
    }

    const role = roles.find((r) => r.id === roleId);
    onMembersChange(
      members.map((m) => {
        if (m.id !== memberId) return m;
        const updatedRoles = hasRole
          ? m.member_roles.filter((mr) => mr.role.id !== roleId)
          : [...m.member_roles, { role: role! }];
        return { ...m, member_roles: updatedRoles };
      })
    );
  };

  // 担当者削除
  const handleDelete = async (memberId: string) => {
    await supabase.from("members").delete().eq("id", memberId);
    onMembersChange(members.filter((m) => m.id !== memberId));
  };

  // 担当者行コンポーネント（社内・クライアント共通）
  const MemberRow = ({ member }: { member: MemberWithRole }) => {
    const assignedRoleIds = new Set(member.member_roles.map((mr) => mr.role.id));
    return (
      <div className="grid grid-cols-[1fr_2fr_auto_auto] gap-2 items-start py-2 border-b border-gray-50">
        <span className="text-sm text-gray-700 pt-1">{member.name}</span>
        {/* 役割チェックボックス（複数選択） */}
        <div className="flex flex-col gap-1">
          {roles.map((r) => (
            <label key={r.id} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={assignedRoleIds.has(r.id)}
                onChange={() => handleRoleToggle(member.id, r.id)}
                className="accent-indigo-600"
              />
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              <span className="text-xs text-gray-600">{r.name}</span>
            </label>
          ))}
        </div>
        {/* プレビューバッジ（複数役割） */}
        <div className="flex flex-col gap-1">
          {member.member_roles.length > 0 ? (
            member.member_roles.map((mr) => (
              <span
                key={mr.role.id}
                className="text-xs text-white px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                style={{ backgroundColor: mr.role.color }}
              >
                {member.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-300 px-2 py-0.5">未設定</span>
          )}
        </div>
        <button
          onClick={() => handleDelete(member.id)}
          className="text-gray-300 hover:text-red-400 transition-colors pt-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  };

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
        <span>役割（複数可）</span>
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

        <div className="space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="担当者名"
            className="w-full text-sm border border-gray-200 rounded-md px-2 py-1 focus:border-indigo-400 outline-none"
          />
          {/* 役割選択チェックボックス */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRoleIds.includes(r.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setNewRoleIds((prev) => [...prev, r.id]);
                    } else {
                      setNewRoleIds((prev) => prev.filter((id) => id !== r.id));
                    }
                  }}
                  className="accent-indigo-600"
                />
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                <span className="text-xs text-gray-600">{r.name}</span>
              </label>
            ))}
          </div>
          <button
            onClick={handleAdd}
            className="w-full text-sm bg-indigo-600 text-white rounded-md py-1.5 hover:bg-indigo-700 transition-colors font-medium"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
