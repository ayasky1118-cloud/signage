/**
 * 注文一覧API用 composable
 *
 * バックエンド GET /orders を呼び出し、検索結果を返す。
 * 開発時は Vite のプロキシ（/api → localhost:8000）を使用。VITE_API_BASE を指定すれば直指定も可。
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return "" // 同一オリジン → Vite プロキシ /api を使用
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

export interface OrderSearchParams {
  orderNo?: string
  orderName?: string
  address?: string
  companyName?: string
  designTypeId?: number
  designTypeName?: string
  updateDateFrom?: string
  updateDateTo?: string
  updater?: string
  page?: number
  perPage?: number
}

export interface OrderItem {
  orderNo: string
  orderName: string
  address: string
  companyId?: number
  companyName: string
  manager: string
  template: string
  designTypeId?: number
  designType: string
  updateDate: string
  updater: string
  branches: string[]
}

export interface OrderSearchResult {
  items: OrderItem[]
  total: number
  page: number
  perPage: number
}

export async function searchOrders(
  params: OrderSearchParams
): Promise<OrderSearchResult> {
  const searchParams = new URLSearchParams()

  if (params.orderNo?.trim()) searchParams.set("order_no", params.orderNo.trim())
  if (params.orderName?.trim()) searchParams.set("order_name", params.orderName.trim())
  if (params.address?.trim()) searchParams.set("address", params.address.trim())
  if (params.companyName?.trim()) searchParams.set("company_name", params.companyName.trim())
  if (params.designTypeId != null) searchParams.set("design_type_id", String(params.designTypeId))
  if (params.designTypeName?.trim()) searchParams.set("design_type_name", params.designTypeName.trim())
  if (params.updateDateFrom?.trim()) searchParams.set("update_date_from", params.updateDateFrom.trim())
  if (params.updateDateTo?.trim()) searchParams.set("update_date_to", params.updateDateTo.trim())
  if (params.updater?.trim()) searchParams.set("updater", params.updater.trim())
  searchParams.set("page", String(params.page ?? 1))
  searchParams.set("per_page", String(params.perPage ?? 10))

  const base = getApiBase()
  const url = `${base}${API_PREFIX}/orders?${searchParams.toString()}`
  const res = await fetch(url)

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { error?: string; detail?: string }
      if (body?.error) detail = body.error
      else if (body?.detail && typeof body.detail === "string") detail = body.detail
    } catch {
      /* ignore */
    }
    throw new Error(`API error: ${detail}`)
  }

  return res.json()
}
