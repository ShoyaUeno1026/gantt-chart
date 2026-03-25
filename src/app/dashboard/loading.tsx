// ダッシュボード読込み中のスケルトン表示
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダースケルトン */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="h-6 w-44 bg-gray-200 rounded animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-36 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-36 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* プロジェクトカードスケルトン */}
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="h-5 w-1/3 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse mb-3" />
              <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
