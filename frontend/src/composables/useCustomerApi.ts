//-- useCustomerApi - 顧客一覧 API 用 composable
//--
//-- 【用途】
//-- ・OrderMain / OrderList の顧客選択モーダル（CustomerSelectModal）で使用
//-- ・company_id に紐づく customer 一覧を返す
//--
//-- 【API】
//-- ・GET /customers?company_id=:id: 指定会社の顧客一覧
//--
//-- 【レスポンス形式】
//-- ・API は snake_case（customer_id, company_id, customer_name, address, contact_name）で返す
//-- ・address は customer_add（住所のみ。郵便番号 customer_post は含まない）
//-- ・本 composable 内で camelCase にマッピングして返却
//--
//-- 【API ベースURL】
//-- ・src/config/api の getApiBase / getApiPrefix を使用（環境別 .env で切り替え）
import { getApiBase, getApiPrefix } from "../config/api"
const API_PREFIX = getApiPrefix()

//-- 顧客1件。address は住所（customer_add）、contactName は担当者名
export interface CustomerItem {
  customerId: number
  companyId: number
  customerName: string
  address: string
  contactName?: string
}

//-- 指定会社に紐づく顧客一覧を取得。顧客選択モーダルで使用。API の snake_case を camelCase にマッピング。エラー時は throw。
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
