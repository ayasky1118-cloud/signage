/**
 * useHtmlObjectApi - HTMLオブジェクトマスタ API 用 composable
 *
 * 【用途】
 * ・OrderDetail（全画面編集）のサイドバーで、ルート描画・テキスト配置・画像配置・吹き出し配置等の
 *   選択肢を取得する
 * ・html_object と html_object_value の全社共通マスタを階層構造で返す
 *
 * 【API】
 * ・GET /html-objects: 全件取得。company_id 不要（全社共通）
 *
 * 【データ構造】
 * ・HtmlObjectItem: カテゴリ（ルート・テキスト・画像等）。hasChildTable が true のとき values に子を持つ
 * ・HtmlObjectValueItem: 選択肢の値（例: ルートの種類、吹き出しの形）。sampleImagePath でサンプル画像を表示
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

// -----------------------------------------------------------------------------
// 型定義
// -----------------------------------------------------------------------------

/** html_object_value の1件。選択肢の値（valueCode, valueName, sampleImagePath 等） */
export interface HtmlObjectValueItem {
  htmlObjectValueId: number
  valueCode: string
  valueName: string
  valueData: string | null
  sampleImagePath: string | null
  displayOrder: number
}

/** html_object の1件。カテゴリ単位。hasChildTable が true のとき values に子の選択肢を持つ */
export interface HtmlObjectItem {
  htmlObjectId: number
  categoryCode: string
  categoryName: string
  htmlObjectType: string
  hasChildTable: boolean
  displayOrder: number
  values: HtmlObjectValueItem[]
}

// -----------------------------------------------------------------------------
// API 呼び出し
// -----------------------------------------------------------------------------

/**
 * HTMLオブジェクトマスタ一覧を取得。ルート・テキスト・画像・吹き出し等の全カテゴリとその選択肢を返す。
 * API の camelCase レスポンスを型安全にマッピング。エラー時は throw。
 */
export async function fetchHtmlObjects(): Promise<HtmlObjectItem[]> {
  const base = getApiBase()
  const res = await fetch(`${base}${API_PREFIX}/html-objects`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>
  // API の camelCase を型安全にマッピング（values はネストした HtmlObjectValueItem 配列）
  return rows.map((r) => ({
    htmlObjectId: Number(r.htmlObjectId),
    categoryCode: String(r.categoryCode ?? ""),
    categoryName: String(r.categoryName ?? ""),
    htmlObjectType: String(r.htmlObjectType ?? ""),
    hasChildTable: Boolean(r.hasChildTable),
    displayOrder: Number(r.displayOrder ?? 0),
    values: ((r.values as Array<Record<string, unknown>>) ?? []).map((v) => ({
      htmlObjectValueId: Number(v.htmlObjectValueId),
      valueCode: String(v.valueCode ?? ""),
      valueName: String(v.valueName ?? ""),
      valueData: v.valueData != null ? String(v.valueData) : null,
      sampleImagePath: v.sampleImagePath != null ? String(v.sampleImagePath) : null,
      displayOrder: Number(v.displayOrder ?? 0),
    })),
  }))
}
