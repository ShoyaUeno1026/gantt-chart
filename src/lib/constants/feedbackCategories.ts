// フィードバックのカテゴリ定数
export const FEEDBACK_CATEGORIES = [
  "バグ報告",
  "改善要望",
  "新機能リクエスト",
  "UIに関するご意見",
  "その他",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
