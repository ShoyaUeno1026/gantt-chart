"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// パスワード再設定ページ（メールのリンクからアクセス）
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (password !== confirm) {
      setMessage("パスワードが一致しません");
      return;
    }
    if (password.length < 6) {
      setMessage("パスワードは6文字以上で設定してください");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(`エラー: ${error.message}`);
    } else {
      setMessage("パスワードを変更しました。ログインページへ移動します...");
      setTimeout(() => router.push("/login"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 space-y-6">
        <div className="text-center">
          <p className="text-xs font-medium text-indigo-600 tracking-widest uppercase mb-2">
            工程表ガントチャート
          </p>
          <h1 className="text-2xl font-bold text-gray-900">パスワード再設定</h1>
          <p className="text-sm text-gray-500 mt-1">新しいパスワードを入力してください</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="password">新しいパスワード</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">新しいパスワード（確認）</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="もう一度入力"
              required
            />
          </div>
          {message && (
            <p className={`text-sm text-center ${message.includes("変更しました") ? "text-green-600" : "text-red-500"}`}>
              {message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "変更中..." : "パスワードを変更する"}
          </Button>
        </form>
      </div>
    </div>
  );
}
