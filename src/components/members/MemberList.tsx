"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member } from "@/lib/types/database";
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

// カラープリセット
const COLOR_PRESETS = [
  "#6366F1", // インディゴ
  "#EC4899", // ピンク
  "#10B981", // エメラルド
  "#F59E0B", // アンバー
  "#3B82F6", // ブルー
  "#EF4444", // レッド
  "#8B5CF6", // バイオレット
  "#06B6D4", // シアン
  "#84CC16", // ライム
  "#F97316", // オレンジ
];

type Props = {
  initialMembers: Member[];
};

// 担当者一覧 + 追加・編集・削除
export default function MemberList({ initialMembers }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const supabase = createClient();

  const handleSaved = (saved: Member) => {
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
              {/* カラーサークル */}
              <div
                className="w-8 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: member.color }}
              />
              <div>
                <p className="font-medium text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">{member.role || "役割未設定"}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingMember(member)}
            >
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

      {/* 追加モーダル */}
      {showAddModal && (
        <MemberFormModal
          onSaved={handleSaved}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* 編集モーダル */}
      {editingMember && (
        <MemberFormModal
          member={editingMember}
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
  member?: Member;
  onSaved: (member: Member) => void;
  onDeleted?: (id: string) => void;
  onClose: () => void;
};

function MemberFormModal({ member, onSaved, onDeleted, onClose }: ModalProps) {
  const [name, setName] = useState(member?.name ?? "");
  const [role, setRole] = useState(member?.role ?? "");
  const [color, setColor] = useState(member?.color ?? COLOR_PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    let result;
    if (member) {
      result = await supabase
        .from("members")
        .update({ name: name.trim(), role: role.trim(), color })
        .eq("id", member.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("members")
        .insert({ name: name.trim(), role: role.trim(), color })
        .select()
        .single();
    }

    setLoading(false);
    if (!result.error && result.data) onSaved(result.data as Member);
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

          {/* 役割 */}
          <div className="space-y-1">
            <Label htmlFor="member-role">役割</Label>
            <Input
              id="member-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="例：デザイナー、エンジニア、ディレクター"
            />
          </div>

          {/* カラー選択 */}
          <div className="space-y-2">
            <Label>カラー</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === preset ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""
                  }`}
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
            {/* カスタムカラーピッカー */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <span className="text-sm text-gray-500">カスタムカラー: {color}</span>
            </div>
          </div>

          {/* プレビュー */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium">{name || "担当者名"}</span>
            <span className="text-xs text-gray-500">{role || "役割"}</span>
          </div>

          <DialogFooter className="flex justify-between">
            {member && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                削除
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                キャンセル
              </Button>
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
