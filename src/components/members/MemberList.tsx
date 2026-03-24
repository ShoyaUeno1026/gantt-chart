"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MemberWithRole, Role } from "@/lib/types/database";
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
  initialMembers: MemberWithRole[];
  roles: Role[];
};

// 担当者一覧 + 追加・編集・削除（社内メンバー専用）
export default function MemberList({ initialMembers, roles }: Props) {
  const [members, setMembers] = useState<MemberWithRole[]>(initialMembers);
  const [editingMember, setEditingMember] = useState<MemberWithRole | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleSaved = (saved: MemberWithRole) => {
    setMembers((prev) => {
      const exists = prev.find((m) => m.id === saved.id);
      if (exists) return prev.map((m) => (m.id === saved.id ? saved : m));
      return [...prev, saved];
    });
    setEditingMember(null);
    setShowAddModal(false);
  };

  const handleDeleted = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setEditingMember(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">担当者一覧</h2>
        <Button size="sm" onClick={() => setShowAddModal(true)}>+ 担当者を追加</Button>
      </div>

      {/* 担当者リスト */}
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-indigo-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* 役割カラーのサークル（複数役割は先頭の色を使用） */}
              <div
                className="w-8 h-8 rounded-full shrink-0"
                style={{ backgroundColor: member.member_roles[0]?.role.color ?? "#9ca3af" }}
              />
              <div>
                <p className="font-medium text-gray-900">{member.name}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {member.member_roles.length > 0 ? (
                    member.member_roles.map((mr) => (
                      <span
                        key={mr.role.id}
                        className="text-xs px-1.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: mr.role.color }}
                      >
                        {mr.role.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">役割未設定</span>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditingMember(member)}>
              編集
            </Button>
          </div>
        ))}
        {members.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-400">担当者がまだいません</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <MemberFormModal
          roles={roles}
          onSaved={handleSaved}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {editingMember && (
        <MemberFormModal
          member={editingMember}
          roles={roles}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  );
}

// 担当者追加・編集モーダル
type ModalProps = {
  member?: MemberWithRole;
  roles: Role[];
  onSaved: (member: MemberWithRole) => void;
  onDeleted?: (id: string) => void;
  onClose: () => void;
};

function MemberFormModal({ member, roles, onSaved, onDeleted, onClose }: ModalProps) {
  const [name, setName] = useState(member?.name ?? "");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
    member?.member_roles.map((mr) => mr.role.id) ?? []
  );
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    if (member) {
      // 名前を更新
      const { data } = await supabase
        .from("members")
        .update({ name: name.trim() })
        .eq("id", member.id)
        .select("*")
        .single();

      if (data) {
        // 役割の差分更新（追加・削除）
        const currentRoleIds = member.member_roles.map((mr) => mr.role.id);
        const toAdd = selectedRoleIds.filter((id) => !currentRoleIds.includes(id));
        const toRemove = currentRoleIds.filter((id) => !selectedRoleIds.includes(id));

        if (toAdd.length > 0) {
          await supabase.from("member_roles").insert(
            toAdd.map((roleId) => ({ member_id: data.id, role_id: roleId }))
          );
        }
        if (toRemove.length > 0) {
          await supabase.from("member_roles").delete()
            .eq("member_id", data.id).in("role_id", toRemove);
        }

        // 最新データを再取得
        const { data: fresh } = await supabase
          .from("members")
          .select("*, member_roles(role:roles(*))")
          .eq("id", data.id)
          .single();

        if (fresh) onSaved(fresh as MemberWithRole);
      }
    } else {
      // 新規追加
      const { data } = await supabase
        .from("members")
        .insert({ name: name.trim(), role: "", color: "#6366F1", project_id: null })
        .select("*")
        .single();

      if (data) {
        if (selectedRoleIds.length > 0) {
          await supabase.from("member_roles").insert(
            selectedRoleIds.map((roleId) => ({ member_id: data.id, role_id: roleId }))
          );
        }
        const { data: fresh } = await supabase
          .from("members")
          .select("*, member_roles(role:roles(*))")
          .eq("id", data.id)
          .single();

        onSaved((fresh ?? { ...data, member_roles: [] }) as MemberWithRole);
      }
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!member || !confirm(`「${member.name}」を削除しますか？`)) return;
    setLoading(true);
    const { error } = await supabase.from("members").delete().eq("id", member.id);
    setLoading(false);
    if (!error && onDeleted) onDeleted(member.id);
  };

  // プレビュー用の選択中役割リスト
  const selectedRoles = roles.filter((r) => selectedRoleIds.includes(r.id));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? "担当者を編集" : "担当者を追加"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {/* 名前 */}
          <div className="space-y-1">
            <Label htmlFor="member-name">担当者名 *</Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：田中 太郎"
              required
            />
          </div>

          {/* 役割（複数選択チェックボックス） */}
          <div className="space-y-1">
            <Label>役割（複数選択可）</Label>
            <div className="flex flex-col gap-2 p-3 border border-gray-200 rounded-md">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(r.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoleIds((prev) => [...prev, r.id]);
                      } else {
                        setSelectedRoleIds((prev) => prev.filter((id) => id !== r.id));
                      }
                    }}
                    className="accent-indigo-600"
                  />
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-sm text-gray-700">{r.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* プレビュー（複数バッジ） */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg flex-wrap">
            <span className="text-sm font-medium text-gray-700">{name || "担当者名"}</span>
            {selectedRoles.length > 0 ? (
              selectedRoles.map((r) => (
                <span
                  key={r.id}
                  className="text-xs text-white px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: r.color }}
                >
                  {r.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">役割未設定</span>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            {member && (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                削除
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>キャンセル</Button>
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
