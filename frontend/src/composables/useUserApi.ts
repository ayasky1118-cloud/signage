/**
 * useUserApi - ユーザー一覧 API 用 composable
 *
 * 【用途】
 * ・注文フォーム等で担当者（user）の選択肢を取得
 * ・company_id に紐づく user 一覧を返す
 *
 * 【API】
 * ・GET /users?company_id=:id: 指定会社のユーザー一覧
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env?.trim()) return env.trim().replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return "http://localhost:8000"
}
const API_PREFIX = getApiBase() ? "" : "/api"

/** ユーザー1件。担当者選択用 */
export interface UserItem {
  userId: number
  companyId: number
  userName: string
}

/**
 * 指定会社に紐づくユーザー一覧を取得。担当者選択ドロップダウン等で使用。
 * エラー時は throw。
 */
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
