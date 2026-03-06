/**
 * 会社一覧API用 composable
 *
 * バックエンド GET /companies を呼び出し、会社一覧を返す。
 * 開発時は Vite のプロキシ（/api → localhost:8000）を使用。
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

export interface CompanyItem {
  companyId: number
  companyName: string
  address: string
}

export async function fetchCompanies(): Promise<CompanyItem[]> {
  const base = getApiBase()
  const res = await fetch(`${base}${API_PREFIX}/companies`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    companyId: Number(r.company_id),
    companyName: String(r.company_name ?? ""),
    address: [r.company_post, r.company_add].filter(Boolean).join(" ") || "",
  }))
}
