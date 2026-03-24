import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// 登録を許可するメールドメイン（環境変数で管理）
const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "";

// OAuth リダイレクト後のコールバック処理
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // ドメインチェック（環境変数が設定されている場合のみ）
      if (ALLOWED_DOMAIN) {
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email?.toLowerCase() ?? "";
        if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          // 許可外ドメインはサインアウトしてログインページへ
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=domain`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
