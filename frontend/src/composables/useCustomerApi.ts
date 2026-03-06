/**
 * 顧客一覧API用 composable
 *
 * バックエンド GET /customers を呼び出し、指定会社に紐づく顧客一覧を返す。
 * 注文フォームの「顧客」選択モーダル用。
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

export interface CustomerItem {
  customerId: number
  companyId: number
  customerName: string
  address: string
  contactName?: string
}

export async function fetchCustomers(companyId: number): Promise<CustomerItem[]> {
  const base = getApiBase()
  const res = await fetch(`${base}${API_PREFIX}/customers?company_id=${companyId}`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    customerId: Number(r.customer_id),
    companyId: Number(r.company_id),
    customerName: String(r.customer_name ?? ""),
    address: String(r.address ?? ""),
    contactName: String(r.contact_name ?? ""),
  }))
}
