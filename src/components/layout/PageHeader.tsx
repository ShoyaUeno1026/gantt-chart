"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Props = {
  onClear: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveImage: () => void;
  onSave: () => void;
  saving?: boolean;
};

// ページ上部のヘッダー（タイトル + アクションボタン群）
export default function PageHeader({
  onClear,
  onExportJson,
  onImportJson,
  onSaveImage,
  onSave,
  saving = false,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between sticky top-0 z-50">
      {/* ロゴ・タイトル */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <div className="flex flex-col leading-none">
            <span className="text-[9px] font-bold text-indigo-500 tracking-widest uppercase">
              Gantt Chart
            </span>
            <span className="text-base font-bold text-gray-900">Web制作 工程表</span>
          </div>
        </Link>
      </div>

      {/* アクションボタン群 */}
      <div className="flex items-center gap-2">
        {/* クリア */}
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          クリア
        </button>

        {/* JSON出力 */}
        <button
          onClick={onExportJson}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          JSON出力
        </button>

        {/* JSON読込 */}
        <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          JSON読込
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={onImportJson}
          />
        </label>

        {/* 画像保存 */}
        <button
          onClick={onSaveImage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          画像保存
        </button>

        {/* 保存 */}
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors disabled:opacity-60"
        >
          {saving ? "保存中..." : "保存"}
        </button>

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="ml-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
