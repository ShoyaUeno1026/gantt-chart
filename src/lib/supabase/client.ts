import { createBrowserClient } from "@supabase/ssr";

// ブラウザ用Supabaseクライアント（クライアントコンポーネントで使用）
// 型安全性は各コンポーネントで TaskWithMember 等の型を使って管理する
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
