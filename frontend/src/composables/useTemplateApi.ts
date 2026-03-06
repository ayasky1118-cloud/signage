/**
 * テンプレート・テンプレート項目API用 composable
 *
 * バックエンド GET /templates, GET /template-items を呼び出す。
 * 開発時は Vite のプロキシ（/api → localhost:8000）を使用。
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

export interface TemplateOption {
  templateId: number
  companyId: number
  templateName: string
  displayOrder: number
}

export interface TemplateItemItem {
  templateItemId: number
  templateId: number
  itemName: string
  itemType: string
  isRequired: boolean
  displayOrder: number
}

/** ログイン会社（と顧客）に紐づくテンプレート一覧。customerId 指定時は当該顧客のテンプレートのみ返す */
export async function fetchTemplates(
  companyId: number,
  customerId?: number | null
): Promise<TemplateOption[]> {
  const base = getApiBase()
  const params = new URLSearchParams()
  params.set("company_id", String(companyId))
  if (customerId != null) params.set("customer_id", String(customerId))
  const res = await fetch(`${base}${API_PREFIX}/templates?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    templateId: Number(r.templateId),
    companyId: Number(r.companyId),
    templateName: String(r.templateName ?? ""),
    displayOrder: Number(r.displayOrder ?? 0),
  }))
}

/** 選択されたテンプレートに紐づく template_item 一覧（項目名・必須フラグ・項目種別を取得） */
export async function fetchTemplateItems(
  templateId: number
): Promise<TemplateItemItem[]> {
  const base = getApiBase()
  const res = await fetch(
    `${base}${API_PREFIX}/template-items?template_id=${encodeURIComponent(templateId)}`
  )
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    templateItemId: Number(r.templateItemId),
    templateId: Number(r.templateId),
    itemName: String(r.itemName ?? ""),
    itemType: String(r.itemType ?? "text"),
    isRequired: Boolean(r.isRequired),
    displayOrder: Number(r.displayOrder ?? 0),
  }))
}
