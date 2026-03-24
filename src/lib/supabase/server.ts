import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// サーバー用Supabaseクライアント（サーバーコンポーネント・Route Handlerで使用）
// 型安全性は各ページで TaskWithMember 等の型を使って管理する
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // サーバーコンポーネントからの呼び出し時は無視（ミドルウェアが処理）
          }
        },
      },
    }
  );
}
