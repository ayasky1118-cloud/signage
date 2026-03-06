/**
 * デザイン種別マスタAPI用 composable
 *
 * バックエンド GET /design-types?company_id= を呼び出し、会社に紐づくデザイン種別一覧を返す。
 * 開発時は Vite のプロキシ（/api → localhost:8000）を使用。
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

export interface DesignTypeItem {
  designTypeId: number
  companyId: number
  designTypeName: string
  displayOrder: number
}

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

/** 全デザイン種別（注文一覧の検索条件用） */
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
