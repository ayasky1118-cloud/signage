/**
 * useTemplateApi - テンプレート・テンプレート項目 API 用 composable
 *
 * 【用途】
 * ・TemplateSelectModal: 注文フォームのテンプレート選択
 * ・OrderMain: 選択したテンプレートに紐づく template_item（入力項目）を取得
 *
 * 【API】
 * ・GET /templates?company_id=:id&customer_id=:id: テンプレート一覧。customer_id 指定時は当該顧客のテンプレートのみ
 * ・GET /template-items?template_id=:id: テンプレート項目一覧（項目名・必須フラグ・項目種別）
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

/** テンプレート1件。TemplateSelectModal の選択肢用 */
export interface TemplateOption {
  templateId: number
  companyId: number
  templateName: string
  displayOrder: number
}

/** テンプレート項目1件。注文フォームの入力項目（itemName, itemType, isRequired） */
export interface TemplateItemItem {
  templateItemId: number
  templateId: number
  itemName: string
  itemType: string
  isRequired: boolean
  displayOrder: number
}

/**
 * ログイン会社に紐づくテンプレート一覧を取得。
 * customerId 指定時は当該顧客に紐づくテンプレートのみ返す（顧客別テンプレート対応）。
 * エラー時は throw。
 */
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

/**
 * 選択されたテンプレートに紐づく template_item 一覧を取得。
 * 注文フォームの動的入力項目（項目名・必須フラグ・項目種別）を表示するために使用。
 * エラー時は throw。
 */
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
