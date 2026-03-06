/**
 * ユーザー一覧API用 composable
 *
 * バックエンド GET /users を呼び出し、指定会社に紐づくユーザー一覧を返す。
 * 担当者選択用。
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

export interface UserItem {
  userId: number
  companyId: number
  userName: string
}

export async function fetchUsers(companyId: number): Promise<UserItem[]> {
  const base = getApiBase()
  const res = await fetch(`${base}${API_PREFIX}/users?company_id=${companyId}`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    userId: Number(r.userId),
    companyId: Number(r.companyId),
    userName: String(r.userName ?? ""),
  }))
}
