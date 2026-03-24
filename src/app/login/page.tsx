"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 登録を許可するメールドメイン（環境変数で管理）
const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  // Googleでログイン
  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setMessage(error.message);
    setLoading(false);
  };

  // メール・パスワードでログイン or サインアップ
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (isSignUp) {
      // ドメインチェック（環境変数が設定されている場合のみ）
      if (ALLOWED_DOMAIN && !email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
        setMessage(`登録できるのは @${ALLOWED_DOMAIN} のメールアドレスのみです`);
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setMessage(error.message);
      else setMessage("確認メールを送信しました。メールを確認してください。");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage(error.message);
    }
    setLoading(false);
  };

  // モード切り替え時はメッセージをリセット
  const toggleMode = () => {
    setIsSignUp((prev) => !prev);
    setMessage("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 space-y-6">

        {/* アプリ名（常に表示） */}
        <div className="text-center">
          <p className="text-xs font-medium text-indigo-600 tracking-widest uppercase mb-2">
            工程表ガントチャート
          </p>
          {/* モードに応じてタイトルを切り替え */}
          <h1 className="text-2xl font-bold text-gray-900">
            {isSignUp ? "アカウントを作成" : "ログイン"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSignUp
              ? "チームに参加するためアカウントを作成してください"
              : "チームの工程表にアクセス"}
          </p>
        </div>

        {/* モード切り替えタブ */}
        <div className="flex rounded-lg border border-gray-200 p-1 gap-1">
          <button
            type="button"
            onClick={() => !isSignUp || toggleMode()}
            className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors ${
              !isSignUp
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => isSignUp || toggleMode()}
            className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors ${
              isSignUp
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            新規登録
          </button>
        </div>

        {/* Googleログイン（未実装） */}
        <Button
          type="button"
          variant="outline"
          className="w-full opacity-40 cursor-not-allowed"
          disabled
          title="Google認証は現在準備中です"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google で{isSignUp ? "登録" : "ログイン"}（準備中）
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-white px-2">またはメールアドレスで</span>
          </div>
        </div>

        {/* メール・パスワードフォーム */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
            />
          </div>

          {message && (
            <p
              className={`text-sm text-center ${
                message.includes("送信しました") ? "text-green-600" : "text-red-500"
              }`}
            >
              {message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "処理中..." : isSignUp ? "アカウントを作成する" : "ログインする"}
          </Button>
        </form>
      </div>
    </div>
  );
}
