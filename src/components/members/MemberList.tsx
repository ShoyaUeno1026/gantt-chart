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
              {/* 役割カラーのサークル */}
              <div
                className="w-8 h-8 rounded-full shrink-0"
                style={{ backgroundColor: member.role_data?.color ?? "#9ca3af" }}
              />
              <div>
                <p className="font-medium text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">
                  {member.role_data?.name ?? "役割未設定"}
                </p>
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
  const [roleId, setRoleId] = useState(member?.role_id ?? "");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // 選択中の役割データ（プレビュー表示用）
  const selectedRole = roles.find((r) => r.id === roleId) ?? null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const payload = { name: name.trim(), role_id: roleId || null };
    let result;
    if (member) {
      result = await supabase
        .from("members")
        .update(payload)
        .eq("id", member.id)
        .select("*, role_data:roles(*)")
        .single();
    } else {
      result = await supabase
        .from("members")
        .insert({ ...payload, role: "", color: "#6366F1", project_id: null })
        .select("*, role_data:roles(*)")
        .single();
    }

    setLoading(false);
    if (!result.error && result.data) onSaved(result.data as MemberWithRole);
  };

  const handleDelete = async () => {
    if (!member || !confirm(`「${member.name}」を削除しますか？`)) return;
    setLoading(true);
    const { error } = await supabase.from("members").delete().eq("id", member.id);
    setLoading(false);
    if (!error && onDeleted) onDeleted(member.id);
  };

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

          {/* 役割（role_id） */}
          <div className="space-y-1">
            <Label htmlFor="member-role">役割</Label>
            <select
              id="member-role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:border-indigo-400 outline-none"
            >
              <option value="">役割を選択</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* プレビュー */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-6 h-6 rounded-full shrink-0"
              style={{ backgroundColor: selectedRole?.color ?? "#9ca3af" }}
            />
            <span className="text-sm font-medium">{name || "担当者名"}</span>
            <span className="text-xs text-gray-500">{selectedRole?.name ?? "役割未設定"}</span>
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
