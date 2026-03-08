/**
 * 注文関連の共通定数（OrderList・OrderMain で共用）
 */

/** ステータスの選択肢 */
export const STATUS_OPTIONS = [
  "依頼中",
  "製作中",
  "確認中",
  "確認完了",
  "製作完了",
  "納品完了",
  "キャンセル",
] as const

/** 制作区分の選択肢 */
export const PRODUCTION_TYPE_OPTIONS = ["注文品", "試作品", "サンプル品"] as const
