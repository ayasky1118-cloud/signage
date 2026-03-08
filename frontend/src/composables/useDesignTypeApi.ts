//-- useDesignTypeApi - デザイン種別マスタ API 用 composable
//--
//-- 【用途】
//-- ・注文フォームのデザイン種別選択（OrderMain）
//-- ・注文一覧の検索条件（OrderList）。fetchAllDesignTypes で全件取得
//--
//-- 【API】
//-- ・GET /design-types?company_id=:id: 指定会社のデザイン種別一覧
//-- ・GET /design-types: company_id なしで全件取得（検索条件用）
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

//-- デザイン種別1件
export interface DesignTypeItem {
  designTypeId: number
  companyId: number
  designTypeName: string
  displayOrder: number
}

//-- 指定会社に紐づくデザイン種別一覧を取得。注文フォームのセレクト等で使用。エラー時は throw。
export async function fetchDesignTypes(
  companyId: number
): Promise<DesignTypeItem[]> {
  const base = getApiBase()
  const res = await fetch(
    `${base}${API_PREFIX}/design-types?company_id=${encodeURIComponent(companyId)}`
  )
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    designTypeId: Number(r.designTypeId),
    companyId: Number(r.companyId),
    designTypeName: String(r.designTypeName ?? ""),
    displayOrder: Number(r.displayOrder ?? 0),
  }))
}

//-- 全デザイン種別を取得。注文一覧の検索条件（デザイン種別フィルタ）で使用。company_id を指定しないため、全会社のデザイン種別が返る。
export async function fetchAllDesignTypes(): Promise<DesignTypeItem[]> {
  const base = getApiBase()
  const res = await fetch(`${base}${API_PREFIX}/design-types`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    designTypeId: Number(r.designTypeId),
    companyId: Number(r.companyId),
    designTypeName: String(r.designTypeName ?? ""),
    displayOrder: Number(r.displayOrder ?? 0),
  }))
}
