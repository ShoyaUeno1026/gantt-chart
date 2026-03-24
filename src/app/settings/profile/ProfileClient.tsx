"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  email: string;
  displayName: string;
};

export default function ProfileClient({ email, displayName }: Props) {
  const router = useRouter();
  const supabase = createClient();

  // 表示名
  const [name, setName] = useState(displayName);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMessage, setNameMessage] = useState("");

  // パスワード
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  // アカウント削除
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 表示名を変更
  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameLoading(true);
    setNameMessage("");
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name.trim() },
    });
    setNameLoading(false);
    setNameMessage(error ? `エラー: ${error.message}` : "表示名を更新しました");
  };

  // パスワードを変更
  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");
    if (newPassword !== confirmPassword) {
      setPasswordMessage("新しいパスワードが一致しません");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage("パスワードは6文字以上で設定してください");
      return;
    }
    setPasswordLoading(true);
    // 現在のパスワードで再認証してから変更
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      setPasswordLoading(false);
      setPasswordMessage("現在のパスワードが正しくありません");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      setPasswordMessage(`エラー: ${error.message}`);
    } else {
      setPasswordMessage("パスワードを変更しました");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // アカウント削除
  const handleDeleteAccount = async () => {
    if (!confirm("アカウントを削除しますか？\nこの操作は取り消せません。")) return;
    if (!confirm("本当に削除しますか？作成したプロジェクトのデータは残ります。")) return;
    setDeleteLoading(true);
    const res = await fetch("/api/delete-account", { method: "POST" });
    if (res.ok) {
      await supabase.auth.signOut();
      router.push("/login");
    } else {
      const { error } = await res.json();
      alert(`削除に失敗しました: ${error}`);
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* メールアドレス（表示のみ） */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
        <p className="text-xs text-gray-400">ログイン中のアカウント</p>
        <p className="text-sm font-medium text-gray-700">{email}</p>
      </div>

      {/* 表示名の変更 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">表示名</h2>
        <form onSubmit={handleNameSave} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="display-name">表示名</Label>
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：田中 太郎"
            />
          </div>
          {nameMessage && (
            <p className={`text-xs ${nameMessage.startsWith("エラー") ? "text-red-500" : "text-green-600"}`}>
              {nameMessage}
            </p>
          )}
          <Button type="submit" size="sm" disabled={nameLoading}>
            {nameLoading ? "保存中..." : "保存"}
          </Button>
        </form>
      </div>

      {/* パスワード変更 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">パスワード変更</h2>
        <form onSubmit={handlePasswordSave} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="current-password">現在のパスワード</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-password">新しいパスワード</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6文字以上"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {passwordMessage && (
            <p className={`text-xs ${passwordMessage.startsWith("エラー") || passwordMessage.includes("正しくありません") || passwordMessage.includes("一致しません") || passwordMessage.includes("6文字") ? "text-red-500" : "text-green-600"}`}>
              {passwordMessage}
            </p>
          )}
          <Button type="submit" size="sm" disabled={passwordLoading}>
            {passwordLoading ? "変更中..." : "パスワードを変更"}
          </Button>
        </form>
      </div>

      {/* アカウント削除 */}
      <div className="bg-white border border-red-100 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-red-600">アカウント削除</h2>
        <p className="text-xs text-gray-500">
          アカウントを削除すると元に戻せません。プロジェクトのデータはサーバーに残ります。
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteAccount}
          disabled={deleteLoading}
        >
          {deleteLoading ? "削除中..." : "アカウントを削除する"}
        </Button>
      </div>

    </div>
  );
}
